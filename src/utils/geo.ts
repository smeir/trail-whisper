import type { GeoLineString } from '@/lib/types'

function parseLineString(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return []
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
