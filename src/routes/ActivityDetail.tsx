import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { DownloadIcon, MapIcon } from 'lucide-react'

import { MapView } from '@/components/MapView'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useActivityDetail } from '@/hooks/useActivityDetail'
import { geoLineToLatLngs } from '@/utils/geo'
import { formatDateTime, formatDistanceMeters } from '@/utils/format'
import { Skeleton } from '@/components/ui/skeleton'

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: activity, isLoading } = useActivityDetail(id)

  const trackPoints = useMemo(() => geoLineToLatLngs(activity?.track_geom), [activity?.track_geom])
  const focusPoint = useMemo(
    () => trackPoints[Math.floor(trackPoints.length / 2)] ?? trackPoints[0],
    [trackPoints],
  )
  const startPoint = trackPoints[0]
  const endPoint = trackPoints[trackPoints.length - 1]
  const highlightPoints = useMemo(() => {
    if (!activity) return []
    const markers: Array<{ id: string; point: { lat: number; lon: number }; label?: string; color?: string }> = []
    if (startPoint) {
      markers.push({ id: `${activity.id}-start`, point: startPoint, label: 'Start', color: '#16a34a' })
    }
    if (endPoint) {
      markers.push({ id: `${activity.id}-end`, point: endPoint, label: 'Finish', color: '#dc2626' })
    }
    return markers
  }, [activity, startPoint, endPoint])

  const handleDownload = () => {
    if (!activity) return
    const feature = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: trackPoints.map((point) => [point.lon, point.lat]),
      },
      properties: {
        id: activity.id,
        sport: activity.sport,
        started_at: activity.started_at,
        ended_at: activity.ended_at,
        total_distance_m: activity.total_distance_m,
      },
    }
    const blob = new Blob([JSON.stringify(feature, null, 2)], { type: 'application/geo+json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `activity-${activity.id}.geojson`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!activity) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
        Activity not found.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900 capitalize">{activity.sport}</h1>
        <p className="text-sm text-slate-600">{formatDateTime(activity.started_at)} · {formatDistanceMeters(activity.total_distance_m)}</p>
      </div>
      <MapView className="h-96" track={trackPoints} center={focusPoint} activities={highlightPoints} zoom={13} />
      <Card>
        <CardHeader className="flex flex-col gap-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <MapIcon className="h-5 w-5 text-brand-500" /> Activity overview
          </CardTitle>
          <CardDescription>Track summary generated from the uploaded FIT file.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs uppercase text-slate-500">Start</p>
            <p className="text-sm font-semibold text-slate-800">{formatDateTime(activity.started_at)}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs uppercase text-slate-500">End</p>
            <p className="text-sm font-semibold text-slate-800">{formatDateTime(activity.ended_at)}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs uppercase text-slate-500">Distance</p>
            <p className="text-sm font-semibold text-slate-800">{formatDistanceMeters(activity.total_distance_m)}</p>
          </div>
          {startPoint ? (
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs uppercase text-slate-500">Start coords</p>
              <p className="text-sm font-semibold text-slate-800">
                {startPoint.lat.toFixed(4)}, {startPoint.lon.toFixed(4)}
              </p>
            </div>
          ) : null}
          {endPoint ? (
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs uppercase text-slate-500">Finish coords</p>
              <p className="text-sm font-semibold text-slate-800">
                {endPoint.lat.toFixed(4)}, {endPoint.lon.toFixed(4)}
              </p>
            </div>
          ) : null}
          <Button onClick={handleDownload} variant="outline" className="col-span-full w-full gap-2">
            <DownloadIcon className="h-4 w-4" /> Download GeoJSON
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
