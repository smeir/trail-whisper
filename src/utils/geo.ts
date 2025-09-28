import type { GeoLineString } from '@/lib/types'

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
    } catch (error) {
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

export function findNearestPointOnTrack(
  track: Array<{ lat: number; lon: number }>,
  target: { lat: number; lon: number },
  maxDistance?: number,
) {
  let nearestPoint: { lat: number; lon: number } | undefined
  let nearestDistance = Infinity

  for (const point of track) {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) continue
    const distance = haversineDistance(point, target)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestPoint = point
    }
    if (typeof maxDistance === 'number' && nearestDistance <= maxDistance) {
      return { point: nearestPoint, distance: nearestDistance }
    }
  }

  if (!nearestPoint) return undefined

  return { point: nearestPoint, distance: nearestDistance }
}

export function haversineDistance(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000
  const toRad = (value: number) => (value * Math.PI) / 180

  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const sinDLat = Math.sin(dLat / 2)
  const sinDLon = Math.sin(dLon / 2)

  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))

  return R * c
}
