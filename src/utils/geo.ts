import type { GeoLineString, GeoPoint } from '@/lib/types'

function parsePointString(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed) as GeoPoint
      if (json?.coordinates) {
        const [lon, lat] = json.coordinates
        return { lat, lon }
      }
    } catch (error) {
      return undefined
    }
  }
  const match = trimmed.match(/POINT\(([-0-9.\s]+)\)/i)
  if (match?.[1]) {
    const [lon, lat] = match[1].trim().split(/\s+/).map(Number)
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { lat, lon }
    }
  }
  return undefined
}

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

export function geoPointToLatLng(point?: GeoPoint | string | null) {
  if (!point) return undefined
  if (typeof point === 'string') return parsePointString(point)
  const [lon, lat] = point.coordinates
  return { lat, lon }
}

export function geoLineToLatLngs(line?: GeoLineString | string | null) {
  if (!line) return []
  if (typeof line === 'string') return parseLineString(line)
  return line.coordinates.map(([lon, lat]) => ({ lat, lon }))
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
