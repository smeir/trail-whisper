import { Badge } from '@/components/ui/badge'
import type { AggregatedVisitStats } from '@/lib/types'
import { formatDistanceMeters } from '@/utils/format'

interface StatsBadgesProps {
  stats: AggregatedVisitStats
}

export function StatsBadges({ stats }: StatsBadgesProps) {
  if (!stats.totalVisits) return null

  const topSport = stats.bySport[0]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-2xl bg-brand-50 p-4">
        <p className="text-xs uppercase tracking-wide text-brand-500">Visits</p>
        <p className="text-2xl font-semibold text-brand-700">{stats.totalVisits}</p>
      </div>
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Distance</p>
        <p className="text-2xl font-semibold text-slate-900">{formatDistanceMeters(stats.totalDistance)}</p>
      </div>
      {topSport ? (
        <div className="rounded-2xl bg-slate-900 p-4 text-white">
          <p className="text-xs uppercase tracking-wide text-slate-200">Most common sport</p>
          <p className="text-2xl font-semibold capitalize">{topSport.sport}</p>
          <Badge variant="outline" className="mt-2 border-white/40 text-white">
            {topSport.count} {topSport.count === 1 ? 'session' : 'sessions'}
          </Badge>
        </div>
      ) : null}
    </div>
  )
}
