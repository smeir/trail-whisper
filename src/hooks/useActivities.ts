import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { Activity } from '@/lib/types'
import type { SportType } from '@/lib/fit'
import { geoLineToLatLngs, findNearestPointOnTrack } from '@/utils/geo'

interface ActivitiesFilter {
  sport?: SportType | 'all'
  from?: string
  to?: string
  near?: { lat: number; lon: number; radius: number }
  limit?: number
}

export function useActivities(filters?: ActivitiesFilter) {
  return useQuery<Activity[]>({
    queryKey: ['activities', filters],
    queryFn: async () => {
      let query = supabase
        .from('activities')
        .select('id, sport, started_at, ended_at, total_distance_m, track_geom, created_at')
        .order('started_at', { ascending: false })

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      if (filters?.sport && filters.sport !== 'all') {
        query = query.eq('sport', filters.sport)
      }

      if (filters?.from) {
        query = query.gte('started_at', filters.from)
      }

      if (filters?.to) {
        query = query.lte('started_at', filters.to)
      }

      const { data, error } = await query
      if (error) throw error

      let list = (data ?? []) as Activity[]

      if (filters?.near) {
        const { lat, lon, radius } = filters.near
        list = list.filter((activity) => {
          const trackPoints = geoLineToLatLngs(activity.track_geom)
          if (!trackPoints.length) return false
          const nearest = findNearestPointOnTrack(trackPoints, { lat, lon }, radius)
          if (!nearest) return false
          return typeof radius === 'number' ? nearest.distance <= radius : true
        })
      }

      return list
    },
    staleTime: 60_000,
  })
}
