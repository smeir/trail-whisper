import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { Activity } from '@/lib/types'

export function useActivityDetail(id?: string) {
  return useQuery<Activity | null>({
    queryKey: ['activity-detail', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('activities')
        .select('id, sport, started_at, ended_at, total_distance_m, track_geom, center_point, created_at')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return (data as Activity) ?? null
    },
    enabled: Boolean(id),
  })
}
