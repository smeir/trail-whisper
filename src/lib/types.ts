import type { SportType } from './fit'

export type GeoPoint = {
  type: 'Point'
  coordinates: [number, number]
}

export type GeoLineString = {
  type: 'LineString'
  coordinates: [number, number][]
}

export interface Activity {
  id: string
  sport: SportType
  started_at: string
  ended_at: string
  total_distance_m: number
  track_geom?: GeoLineString | string | null
  center_point: GeoPoint | string
  created_at: string
}

export interface VisitNear {
  activity_id: string
  started_at: string
  ended_at: string
  total_distance_m: number
  sport: SportType
  distance_m: number
}

export interface AggregatedVisitStats {
  totalVisits: number
  totalDistance: number
  recentVisits: VisitNear[]
  bySport: Array<{ sport: SportType; count: number }>
}

export interface Coordinates {
  lat: number
  lon: number
}
