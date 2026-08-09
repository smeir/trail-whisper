import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { AggregatedVisitStats, Coordinates, VisitNear } from '@/lib/types'
import { quantiseCoordinates } from '@/utils/geo'

const RECENT_VISIT_COUNT = 5

// Handed straight to consumers as the empty state, so it is frozen: a shared
// mutable array would let one caller's in-place sort corrupt every other's.
const EMPTY_STATS: AggregatedVisitStats = Object.freeze({
  totalVisits: 0,
  recentVisits: Object.freeze([]),
})

export function useVisitsNear(position?: Coordinates | null, radius = 500) {
  // The quantised point keys the cache and is what gets queried, so nearby fixes
  // share an entry and that entry always matches the centre it was fetched for.
  const point = quantiseCoordinates(position)

  const { data, isLoading, isError, refetch } = useQuery<AggregatedVisitStats>({
    queryKey: [...queryKeys.visitsNear, point?.lat, point?.lon, radius],
    queryFn: async () => {
      const { data: rows, error: rpcError } = await supabase.rpc('find_visits_near', {
        lat: point?.lat,
        lon: point?.lon,
        radius_m: radius,
      })
      if (rpcError) throw rpcError
      const visits = (rows ?? []) as VisitNear[]
      return { totalVisits: visits.length, recentVisits: visits.slice(0, RECENT_VISIT_COUNT) }
    },
    enabled: point !== null,
  })

  return { stats: data ?? EMPTY_STATS, isLoading, isError, refetch }
}
