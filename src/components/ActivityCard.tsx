import { Link } from 'react-router-dom'
import { CalendarIcon, MapPinIcon } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import type { Activity } from '@/lib/types'
import { formatDateTime, formatDistanceMeters } from '@/utils/format'
import { geoLineToLatLngs, geoPointToLatLng } from '@/utils/geo'
import { MapView } from '@/components/MapView'

interface ActivityCardProps {
  activity: Activity
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const trackPoints = geoLineToLatLngs(activity.track_geom)
  const center = geoPointToLatLng(activity.center_point)

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-4 p-0">
        <MapView
          className="h-48"
          track={trackPoints}
          center={center}
          activities={center ? [{ id: activity.id, center }] : []}
        />
        <div className="flex flex-col gap-3 px-6 pb-6">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase text-brand-700">
              {activity.sport}
            </span>
            <span className="text-sm font-semibold text-slate-700">
              {formatDistanceMeters(activity.total_distance_m)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <CalendarIcon className="h-4 w-4 text-slate-400" />
            {formatDateTime(activity.started_at)}
          </div>
          {center ? (
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <MapPinIcon className="h-4 w-4 text-slate-400" />
              {center.lat.toFixed(4)}, {center.lon.toFixed(4)}
            </div>
          ) : null}
          <Link
            to={`/activity/${activity.id}`}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-brand-600 transition hover:border-brand-300 hover:bg-brand-50"
          >
            View details
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
