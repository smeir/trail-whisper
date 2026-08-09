import type { SportType } from './fit'

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
  created_at: string
}

/** Column lists for `activities` selects — keep in sync with the `Activity` shape. */
export const ACTIVITY_COLUMNS = 'id, sport, started_at, ended_at, total_distance_m, created_at'
export const ACTIVITY_COLUMNS_WITH_TRACK =
  'id, sport, started_at, ended_at, total_distance_m, track_geom, created_at'

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
  /** Readonly so the shared empty-state singleton cannot be mutated by a consumer. */
  recentVisits: readonly VisitNear[]
}

export interface Coordinates {
  lat: number
  lon: number
}

export type GeoSource = 'browser' | 'manual'
export type GeoMode = 'auto' | 'manual'
export type GeoStatus = 'idle' | 'prompt' | 'granted' | 'denied' | 'unsupported' | 'manual'

/** Named `DevicePosition` rather than `GeolocationPosition` to avoid shadowing the DOM global. */
export type DevicePosition = Coordinates & { accuracy: number; source: GeoSource }
