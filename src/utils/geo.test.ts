import { describe, expect, it } from 'vitest'

import { geoLineToLatLngs, hasCoordinates, quantiseCoordinates } from './geo'

/** Build a little-endian WKB LineString hex string (X=lon, Y=lat). */
function wkbLineStringHex(points: Array<[number, number]>) {
  const buffer = new ArrayBuffer(1 + 4 + 4 + points.length * 16)
  const view = new DataView(buffer)
  let offset = 0
  view.setUint8(offset, 1) // little-endian
  offset += 1
  view.setUint32(offset, 2, true) // geometry type: LineString
  offset += 4
  view.setUint32(offset, points.length, true)
  offset += 4
  for (const [lon, lat] of points) {
    view.setFloat64(offset, lon, true)
    offset += 8
    view.setFloat64(offset, lat, true)
    offset += 8
  }
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

describe('geoLineToLatLngs', () => {
  it('returns [] for nullish input', () => {
    expect(geoLineToLatLngs(null)).toEqual([])
    expect(geoLineToLatLngs(undefined)).toEqual([])
    expect(geoLineToLatLngs('')).toEqual([])
  })

  it('maps a GeoJSON LineString object ([lon, lat] -> {lat, lon})', () => {
    expect(
      geoLineToLatLngs({ type: 'LineString', coordinates: [[8, 47], [9, 48]] }),
    ).toEqual([
      { lat: 47, lon: 8 },
      { lat: 48, lon: 9 },
    ])
  })

  it('parses a WKT LINESTRING string', () => {
    expect(geoLineToLatLngs('LINESTRING(8 47, 9 48)')).toEqual([
      { lat: 47, lon: 8 },
      { lat: 48, lon: 9 },
    ])
  })

  it('parses a SRID-prefixed WKT LINESTRING string', () => {
    expect(geoLineToLatLngs('SRID=4326;LINESTRING(8 47, 9 48)')).toEqual([
      { lat: 47, lon: 8 },
      { lat: 48, lon: 9 },
    ])
  })

  it('parses a GeoJSON string', () => {
    expect(
      geoLineToLatLngs('{"type":"LineString","coordinates":[[8,47],[9,48]]}'),
    ).toEqual([
      { lat: 47, lon: 8 },
      { lat: 48, lon: 9 },
    ])
  })

  it('parses a little-endian WKB hex LineString', () => {
    const hex = wkbLineStringHex([
      [8, 47],
      [9, 48],
    ])
    const result = geoLineToLatLngs(hex)
    expect(result).toHaveLength(2)
    expect(result[0].lat).toBeCloseTo(47, 9)
    expect(result[0].lon).toBeCloseTo(8, 9)
    expect(result[1].lat).toBeCloseTo(48, 9)
    expect(result[1].lon).toBeCloseTo(9, 9)
  })

  it('returns [] for malformed JSON', () => {
    expect(geoLineToLatLngs('{not valid json')).toEqual([])
  })
})

describe('hasCoordinates', () => {
  it('accepts a coordinate of exactly zero', () => {
    // A truthiness check rejects these, which silently disables every location
    // query on the prime meridian and the equator.
    expect(hasCoordinates({ lat: 51.4779, lon: 0 })).toBe(true)
    expect(hasCoordinates({ lat: 0, lon: 8.54 })).toBe(true)
    expect(hasCoordinates({ lat: 0, lon: 0 })).toBe(true)
  })

  it('accepts an ordinary fix', () => {
    expect(hasCoordinates({ lat: 47.37, lon: 8.54 })).toBe(true)
  })

  it('rejects missing or non-finite coordinates', () => {
    expect(hasCoordinates(null)).toBe(false)
    expect(hasCoordinates(undefined)).toBe(false)
    expect(hasCoordinates({ lat: Number.NaN, lon: 8.54 })).toBe(false)
    expect(hasCoordinates({ lat: 47.37, lon: Number.POSITIVE_INFINITY })).toBe(false)
  })
})

describe('quantiseCoordinates', () => {
  it('snaps both components to the same grid', () => {
    expect(quantiseCoordinates({ lat: 47.3768866, lon: 8.5417 })).toEqual({ lat: 47.3769, lon: 8.5417 })
  })

  it('keeps drifting fixes on one cache key', () => {
    // Two fixes a few metres apart must land on the same key, or every GPS update
    // costs a round trip.
    expect(quantiseCoordinates({ lat: 47.37688, lon: 8.54171 })).toEqual(
      quantiseCoordinates({ lat: 47.37692, lon: 8.54174 }),
    )
  })

  it('preserves a zero component', () => {
    expect(quantiseCoordinates({ lat: 51.4779, lon: 0 })).toEqual({ lat: 51.4779, lon: 0 })
    expect(quantiseCoordinates({ lat: 0, lon: 0 })).toEqual({ lat: 0, lon: 0 })
  })

  it('returns null for missing or non-finite input', () => {
    expect(quantiseCoordinates(null)).toBeNull()
    expect(quantiseCoordinates(undefined)).toBeNull()
    expect(quantiseCoordinates({ lat: Number.NaN, lon: 8.54 })).toBeNull()
    expect(quantiseCoordinates({ lat: 47.37, lon: Number.POSITIVE_INFINITY })).toBeNull()
  })
})
