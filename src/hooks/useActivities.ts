import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { ACTIVITY_COLUMNS, type Activity, type Coordinates } from '@/lib/types'
import type { SportType } from '@/lib/fit'
import { quantiseCoordinates } from '@/utils/geo'

interface ActivitiesFilter {
  sport?: SportType | 'all'
  from?: string
  to?: string
  near?: Coordinates & { radius: number }
  limit?: number
}

export function useActivities(filters?: ActivitiesFilter) {
  const near = filters?.near
  // Quantised once, then used for both the cache key and the request — keying on a
  // rounded point while querying the raw one would leave entries that describe a
  // different centre than the one they were fetched for.
  const nearPoint = near ? quantiseCoordinates(near) : null
  const nearFilter = near && nearPoint ? { ...nearPoint, radius: near.radius } : undefined
  const sport = filters?.sport && filters.sport !== 'all' ? filters.sport : undefined

  return useQuery<Activity[]>({
    queryKey: [...queryKeys.activities, { ...filters, near: nearFilter }],
    queryFn: async () => {
      if (nearFilter) {
        // Proximity, sport and date are all resolved in Postgres; no geometry crosses
        // the wire just to be measured and discarded here.
        const { data, error } = await supabase.rpc('find_activities_near', {
          lat: nearFilter.lat,
          lon: nearFilter.lon,
          radius_m: nearFilter.radius,
          sport_filter: sport ?? null,
          started_from: filters?.from ?? null,
          started_to: filters?.to ?? null,
          max_results: filters?.limit ?? null,
        })
        if (error) throw error
        return (data ?? []) as Activity[]
      }

      let query = supabase.from('activities').select(ACTIVITY_COLUMNS).order('started_at', { ascending: false })

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      if (sport) {
        query = query.eq('sport', sport)
      }

      if (filters?.from) {
        query = query.gte('started_at', filters.from)
      }

      if (filters?.to) {
        query = query.lte('started_at', filters.to)
      }

      const { data, error } = await query
      if (error) throw error

      return (data ?? []) as unknown as Activity[]
    },
    // A near filter that could not be quantised is malformed; running the query
    // anyway would quietly return every activity instead of the nearby ones.
    enabled: !near || Boolean(nearFilter),
  })
}
