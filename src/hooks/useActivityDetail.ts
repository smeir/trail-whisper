import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { ACTIVITY_COLUMNS_WITH_TRACK, type Activity } from '@/lib/types'

export function useActivityDetail(id?: string) {
  return useQuery<Activity | null>({
    queryKey: [...queryKeys.activityDetail, id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('activities')
        .select(ACTIVITY_COLUMNS_WITH_TRACK)
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return (data as Activity) ?? null
    },
    enabled: Boolean(id),
    // A stored track never changes; only an explicit invalidation should refetch it.
    staleTime: Infinity,
  })
}
