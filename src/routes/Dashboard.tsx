import { useMemo } from 'react'
import { ActivityIcon, CompassIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { GeoStatusCard } from '@/components/dashboard/GeoStatusCard'
import { MapView } from '@/components/MapView'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useVisitsNear } from '@/hooks/useVisitsNear'
import { useActivities } from '@/hooks/useActivities'
import { geoLineToLatLngs, findNearestPointOnTrack } from '@/utils/geo'
import { formatDateTime, formatDistanceMeters } from '@/utils/format'
import type { Activity } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'

const NEARBY_RADIUS_METERS = 2000

export default function Dashboard() {
  const {
    position,
    status,
    loading: geoLoading,
    error,
    requestLocation,
    setManualPosition,
    clearManualPosition,
    mode,
  } = useGeolocation()
  const { visits, stats, isLoading: visitsLoading } = useVisitsNear(position)
  const { data: activities, isLoading: activitiesLoading } = useActivities({ limit: 40 })

  const nearbyActivities = useMemo<NearbyActivityInfo[]>(() => {
    if (!activities || !position) return []

    return activities.flatMap((activity) => {
      const track = geoLineToLatLngs(activity.track_geom)
      if (!track.length) return []

      const nearest = findNearestPointOnTrack(track, { lat: position.lat, lon: position.lon }, NEARBY_RADIUS_METERS)
      if (!nearest || nearest.distance > NEARBY_RADIUS_METERS) return []

      return [
        {
          activity,
          nearestPoint: nearest.point,
          distance: nearest.distance,
        },
      ]
    })
  }, [activities, position])

  const mapMarkers = useMemo(() => {
    return nearbyActivities.map(({ activity, nearestPoint }) => ({
      id: activity.id,
      point: nearestPoint,
      label: `${activity.sport} • ${formatDistanceMeters(activity.total_distance_m)}`,
    }))
  }, [nearbyActivities])

  const recentActivities = (activities ?? []).slice(0, 5)

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <div className="flex flex-col gap-6">
        <GeoStatusCard
          loading={geoLoading || visitsLoading}
          status={status}
          position={position}
          stats={stats}
          visits={visits}
          error={error}
          onRetry={requestLocation}
          onSetManual={setManualPosition}
          onClearManual={clearManualPosition}
          mode={mode}
        />
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CompassIcon className="h-5 w-5 text-brand-500" /> Nearby activities
            </CardTitle>
            <CardDescription>We surface any activities recorded within 2 km of your current location.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <MapView
              className="h-72"
              currentLocation={position ?? undefined}
              activities={mapMarkers}
              zoom={13}
            />
            <div className="flex flex-col gap-3 text-sm text-slate-600">
              {geoLoading || activitiesLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : mapMarkers.length ? (
                nearbyActivities.map((item) => (
                  <NearbyActivityRow key={item.activity.id} info={item} />
                ))
              ) : (
                <p className="rounded-2xl bg-slate-100 p-4 text-center text-sm text-slate-500">
                  No personal activities nearby yet. Upload a FIT workout to see it here.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <aside className="flex flex-col gap-4">
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ActivityIcon className="h-5 w-5 text-brand-500" /> Recent activities
            </CardTitle>
            <CardDescription>Your latest uploads sorted by start time.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {activitiesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : recentActivities.length ? (
              recentActivities.map((activity) => (
                <Link
                  key={activity.id}
                  to={`/activity/${activity.id}`}
                  className="flex flex-col gap-1 rounded-2xl border border-slate-200 p-4 text-sm text-slate-600 transition hover:border-brand-300 hover:bg-brand-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold capitalize text-slate-800">{activity.sport}</span>
                    <span className="text-xs font-medium text-slate-500">
                      {formatDistanceMeters(activity.total_distance_m)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">{formatDateTime(activity.started_at)}</span>
                </Link>
              ))
            ) : (
              <p className="rounded-2xl bg-slate-100 p-4 text-center text-sm text-slate-500">
                Upload your first FIT file to populate this list.
              </p>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}

interface NearbyActivityInfo {
  activity: Activity
  nearestPoint: { lat: number; lon: number }
  distance: number
}

function NearbyActivityRow({ info }: { info: NearbyActivityInfo }) {
  const { activity, distance, nearestPoint } = info

  return (
    <Link
      to={`/activity/${activity.id}`}
      className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50"
    >
      <span className="capitalize">{activity.sport}</span>
      <span className="text-xs text-slate-500">
        {formatDistanceMeters(activity.total_distance_m)} · {formatDistanceMeters(distance)} away ·
        {' '}
        {nearestPoint.lat.toFixed(3)}, {nearestPoint.lon.toFixed(3)}
      </span>
    </Link>
  )
}
