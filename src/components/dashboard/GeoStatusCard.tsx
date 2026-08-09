import { Link } from 'react-router-dom'
import { BadgeCheckIcon, BanIcon, Building2Icon, HomeIcon, MapPinIcon, RefreshCwIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { AggregatedVisitStats, DevicePosition, GeoStatus } from '@/lib/types'
import { formatDateTime, formatDistanceMeters, formatRelative } from '@/utils/format'
import { useReverseGeocode } from '@/hooks/useReverseGeocode'

const PLACE_ICONS = {
  city: Building2Icon,
  town: Building2Icon,
  village: HomeIcon,
  hamlet: HomeIcon,
} as const

interface GeoStatusCardProps {
  loading: boolean
  status: GeoStatus
  position: DevicePosition | null
  stats: AggregatedVisitStats
  error?: string
  visitsFailed?: boolean
  onRetry: () => void
}

/** The mutually exclusive status messages shown once the location has resolved. */
function StatusBanner({
  status,
  hasVisits,
  visitsFailed,
  onRetry,
}: Pick<GeoStatusCardProps, 'status' | 'visitsFailed' | 'onRetry'> & { hasVisits: boolean }) {
  if (status === 'unsupported') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
        <BanIcon className="h-5 w-5 text-slate-500" /> Your device does not support geolocation.
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
        <div className="flex items-center gap-2 font-medium text-slate-700">
          <BanIcon className="h-5 w-5 text-rose-500" /> Location access blocked
        </div>
        <p>
          Trail Whisper requires your permission to check past visits. Update your browser settings and try again.
        </p>
        <div>
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RefreshCwIcon className="h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    )
  }

  // Before the empty state: a failed lookup is not evidence that you have never
  // been here, and claiming otherwise turns an outage into a confident wrong answer.
  if (visitsFailed) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
        <p className="font-medium">Could not check this location for past visits.</p>
        <div>
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RefreshCwIcon className="h-4 w-4" /> Try again
          </Button>
        </div>
      </div>
    )
  }

  if (status === 'granted' && !hasVisits) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-white p-4 text-slate-600 shadow-sm">
        <BadgeCheckIcon className="h-6 w-6 text-brand-500" />
        <div>
          <p className="font-semibold text-slate-800">Not active here yet</p>
          <p className="text-sm text-slate-500">Upload an activity to see history for this location.</p>
        </div>
      </div>
    )
  }

  return null
}

export function GeoStatusCard({
  loading,
  status,
  position,
  stats,
  error,
  visitsFailed,
  onRetry,
}: GeoStatusCardProps) {
  const { locality, region, placeType, isLoading: placeLoading } = useReverseGeocode(position ?? undefined)
  const placeLabel = locality ? (region ? `${locality}, ${region}` : locality) : null
  const PlaceMarkerIcon = PLACE_ICONS[placeType as keyof typeof PLACE_ICONS] ?? MapPinIcon
  const placeTypeName = placeType && placeType !== 'other' ? placeType : 'place'
  const placeTypeLabel = placeTypeName.charAt(0).toUpperCase() + placeTypeName.slice(1)
  const { recentVisits, totalVisits } = stats

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          Been here before?
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {loading ? (
          <div className="grid gap-3 text-sm text-slate-500">
            <p>Checking your location…</p>
            <Skeleton className="h-10" />
          </div>
        ) : (
          <StatusBanner
            status={status}
            hasVisits={totalVisits > 0}
            visitsFailed={visitsFailed}
            onRetry={onRetry}
          />
        )}

        {totalVisits > 0 ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 rounded-2xl bg-emerald-50 p-4 text-slate-700 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="flex items-start gap-3">
                <BadgeCheckIcon className="mt-1 h-6 w-6 text-emerald-600" />
                <div>
                  <p className="text-xl font-semibold text-emerald-700">
                    Yes! You have been here{' '}
                    <span className="font-bold text-emerald-900">{totalVisits}</span> times.
                  </p>
                  <p className="text-sm text-emerald-600">
                    Last visit {recentVisits[0] ? formatRelative(recentVisits[0].ended_at) : 'recently'}.
                  </p>
                </div>
              </div>
              {!placeLoading && placeLabel ? (
                <div className="flex flex-col items-end gap-1 text-emerald-700">
                  <PlaceMarkerIcon className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                  <span className="text-[11px] uppercase tracking-wide text-emerald-600">
                    Nearest {placeTypeLabel}
                  </span>
                  <span className="text-sm font-semibold text-emerald-800 text-right">{placeLabel}</span>
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-slate-700">Recent visits</p>
              <ul className="flex flex-col gap-2 text-sm text-slate-600">
                {recentVisits.map((visit) => (
                  <li
                    key={visit.activity_id}
                  >
                    <Link
                      to={`/activity/${visit.activity_id}`}
                      className="flex items-center justify-between rounded-2xl border border-transparent bg-white px-4 py-3 text-slate-600 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-slate-800"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium capitalize text-slate-800">{visit.sport}</span>
                        <span className="text-xs text-slate-500">{formatDateTime(visit.started_at)}</span>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <span>{formatDistanceMeters(visit.total_distance_m)}</span>
                        <span className="block text-[11px] text-slate-400">
                          {formatDistanceMeters(visit.distance_m)} away
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {error && status !== 'denied' ? (
          <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">{error}</div>
        ) : null}
      </CardContent>
    </Card>
  )
}
