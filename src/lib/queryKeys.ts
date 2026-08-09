import type { QueryClient } from '@tanstack/react-query'

export const queryKeys = {
  activities: ['activities'] as const,
  activityDetail: ['activity-detail'] as const,
  visitsNear: ['visits-near'] as const,
  reverseGeocode: ['reverse-geocode'] as const,
}

/** Invalidate every cache that reflects the set of stored activities. */
export function invalidateActivityData(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.activities }),
    queryClient.invalidateQueries({ queryKey: queryKeys.activityDetail }),
    queryClient.invalidateQueries({ queryKey: queryKeys.visitsNear }),
  ])
}
