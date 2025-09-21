import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { AggregatedVisitStats, Coordinates, VisitNear } from '@/lib/types'
import type { SportType } from '@/lib/fit'

interface VisitsNearResult {
  visits: VisitNear[]
  stats: AggregatedVisitStats
}

function aggregateVisits(visits: VisitNear[]): AggregatedVisitStats {
  const totalVisits = visits.length
  const totalDistance = visits.reduce((sum, visit) => sum + (visit.total_distance_m ?? 0), 0)
  const recentVisits = visits.slice(0, 5)

  const counts = visits.reduce<Record<SportType, number>>((acc, visit) => {
    acc[visit.sport] = (acc[visit.sport] ?? 0) + 1
    return acc
  }, {} as Record<SportType, number>)

  const bySport = Object.entries(counts)
    .map(([sport, count]) => ({ sport: sport as SportType, count }))
    .sort((a, b) => b.count - a.count)

  return { totalVisits, totalDistance, recentVisits, bySport }
}

export function useVisitsNear(position?: Coordinates | null, radius = 400) {
  const query = useQuery<VisitsNearResult>({
    queryKey: ['visits-near', position?.lat, position?.lon, radius],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('find_visits_near', {
        lat: position?.lat,
        lon: position?.lon,
        radius_m: radius,
      })
      if (error) throw error
      const visits = (data ?? []) as VisitNear[]
      return { visits, stats: aggregateVisits(visits) }
    },
    enabled: Boolean(position?.lat && position?.lon),
    staleTime: 60_000,
  })

  return useMemo(
    () => ({
      ...query,
      visits: query.data?.visits ?? [],
      stats: query.data?.stats ?? aggregateVisits([]),
    }),
    [query],
  )
}
