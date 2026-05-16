import { describe, expect, it } from 'vitest'

import { findNearestPointOnTrack, geoLineToLatLngs, haversineDistance } from './geo'

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

describe('haversineDistance', () => {
  it('is zero for identical points', () => {
    expect(haversineDistance({ lat: 47, lon: 8 }, { lat: 47, lon: 8 })).toBe(0)
  })

  it('matches the known ~111 km per degree of longitude at the equator', () => {
    const d = haversineDistance({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })
    expect(d).toBeCloseTo(111194.93, 0)
  })

  it('is symmetric', () => {
    const a = { lat: 47.0, lon: 8.0 }
    const b = { lat: 47.5, lon: 8.5 }
    expect(haversineDistance(a, b)).toBeCloseTo(haversineDistance(b, a), 6)
  })
})

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

describe('findNearestPointOnTrack', () => {
  const track = [
    { lat: 47.0, lon: 8.0 },
    { lat: 47.5, lon: 8.5 },
    { lat: 48.0, lon: 9.0 },
  ]

  it('returns undefined for an empty track', () => {
    expect(findNearestPointOnTrack([], { lat: 47, lon: 8 })).toBeUndefined()
  })

  it('finds the closest point and its distance', () => {
    const result = findNearestPointOnTrack(track, { lat: 47.49, lon: 8.49 })
    expect(result?.point).toEqual({ lat: 47.5, lon: 8.5 })
    expect(result?.distance).toBeGreaterThan(0)
  })

  it('short-circuits once a point within maxDistance is found', () => {
    const result = findNearestPointOnTrack(track, { lat: 47.0, lon: 8.0 }, 10)
    expect(result?.point).toEqual({ lat: 47.0, lon: 8.0 })
    expect(result?.distance).toBe(0)
  })

  it('ignores points with non-finite coordinates', () => {
    const result = findNearestPointOnTrack(
      [{ lat: Number.NaN, lon: Number.NaN }, { lat: 47.0, lon: 8.0 }],
      { lat: 47.0, lon: 8.0 },
    )
    expect(result?.point).toEqual({ lat: 47.0, lon: 8.0 })
  })
})
