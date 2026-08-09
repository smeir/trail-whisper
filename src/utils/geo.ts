import type { Coordinates, GeoLineString } from '@/lib/types'

/** ~11 m at the equator. Finer than a GPS fix is worth caching separately. */
const QUANTISATION = 1e4

/**
 * Guard for query `enabled` flags. A truthiness test rejects a legitimate 0,
 * which silently disables every location query on the equator and the prime
 * meridian (and for a manually entered "0, 8.5").
 */
export function hasCoordinates(position?: Coordinates | null): position is Coordinates {
  return position != null && Number.isFinite(position.lat) && Number.isFinite(position.lon)
}

/**
 * Snap a position to a fixed grid so a drifting fix keeps hitting the same cache
 * entry. Callers must send the quantised value to the server too — keying on a
 * rounded point while querying the raw one leaves cache entries that no longer
 * describe the request that filled them.
 */
export function quantiseCoordinates(position?: Coordinates | null): Coordinates | null {
  if (!hasCoordinates(position)) return null

  return {
    lat: Math.round(position.lat * QUANTISATION) / QUANTISATION,
    lon: Math.round(position.lon * QUANTISATION) / QUANTISATION,
  }
}

function parseLineString(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return []
  if (/^[0-9a-f]+$/i.test(trimmed)) {
    const fromWkb = parseWkbLineString(trimmed)
    if (fromWkb.length) return fromWkb
  }
  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed) as GeoLineString
      if (json?.coordinates) {
        return json.coordinates.map(([lon, lat]) => ({ lat, lon }))
      }
    } catch {
      return []
    }
  }
  const match = trimmed.match(/LINESTRING\((.+)\)/i)
  if (match?.[1]) {
    return match[1]
      .split(',')
      .map((pair) => pair.trim().split(/\s+/).map(Number))
      .filter((coords) => coords.length === 2 && coords.every((value) => Number.isFinite(value)))
      .map(([lon, lat]) => ({ lat, lon }))
  }
  return []
}

export function geoLineToLatLngs(line?: GeoLineString | string | null) {
  if (!line) return []
  if (typeof line === 'string') return parseLineString(line)
  return line.coordinates.map(([lon, lat]) => ({ lat, lon }))
}

function parseWkbLineString(hex: string) {
  if (hex.length % 2 !== 0) return []
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i += 1) {
    const byte = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
    if (Number.isNaN(byte)) return []
    bytes[i] = byte
  }

  const view = new DataView(bytes.buffer)
  let offset = 0
  const byteOrder = view.getUint8(offset)
  offset += 1
  const littleEndian = byteOrder === 1
  const type = view.getUint32(offset, littleEndian)
  offset += 4

  const geometryType = type & 0xff
  const hasZ = Boolean(type & 0x80000000)
  const hasM = Boolean(type & 0x40000000)
  const hasSrid = Boolean(type & 0x20000000)

  if (geometryType !== 2) return []
  if (hasSrid) {
    offset += 4
  }

  const dims = 2 + (hasZ ? 1 : 0) + (hasM ? 1 : 0)
  const pointCount = view.getUint32(offset, littleEndian)
  offset += 4

  const coordinates: Array<{ lat: number; lon: number }> = []
  for (let index = 0; index < pointCount; index += 1) {
    const lon = view.getFloat64(offset, littleEndian)
    offset += 8
    const lat = view.getFloat64(offset, littleEndian)
    offset += 8

    // Skip Z/M values if present
    const extras = dims - 2
    if (extras > 0) {
      offset += extras * 8
    }

    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      coordinates.push({ lat, lon })
    }
  }

  return coordinates
}

// findNearestPointOnTrack and haversineDistance lived here to filter by proximity
// in the browser. find_activities_near does that in Postgres now, measuring against
// the interpolated line rather than only the recorded vertices, so both this app's
// "nearby" answers come from one implementation. See git history if the vertex-wise
// helpers are ever needed again.
