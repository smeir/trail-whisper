import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { DownloadIcon, MapIcon } from 'lucide-react'

import { ActivityMap } from '@/components/maps/ActivityMap'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useActivityDetail } from '@/hooks/useActivityDetail'
import { useGeolocation } from '@/hooks/useGeolocation'
import { geoLineToLatLngs } from '@/utils/geo'
import { formatDateTime, formatDistanceMeters } from '@/utils/format'
import { Skeleton } from '@/components/ui/skeleton'

export default function ActivityDetail() {
    const { id } = useParams<{ id: string }>()
    const { data: activity, isLoading } = useActivityDetail(id)
    const { position: currentPosition } = useGeolocation()

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
            <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-semibold text-slate-900 capitalize">{activity.sport}</h1>
                    <span className="text-base text-slate-600">{formatDateTime(activity.started_at)}</span>
                </div>
            </div>
            <ActivityMap
                track={trackPoints}
                center={focusPoint}
                highlights={highlightPoints}
                currentLocation={currentPosition ? { lat: currentPosition.lat, lon: currentPosition.lon } : undefined}
                zoom={13}
                height={560}
                className="w-full"
            />
            <Card className="w-full p-4 md:p-5">
                <CardHeader className="flex flex-col gap-1.5">
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                        <MapIcon className="h-5 w-5 text-brand-500" /> Activity overview
                    </CardTitle>
                    <CardDescription>Track summary generated from the uploaded FIT file.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-white p-3 shadow-sm">
                        <p className="text-xs uppercase text-slate-500">Start</p>
                        <p className="text-sm font-semibold text-slate-800">{formatDateTime(activity.started_at)}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 shadow-sm">
                        <p className="text-xs uppercase text-slate-500">End</p>
                        <p className="text-sm font-semibold text-slate-800">{formatDateTime(activity.ended_at)}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 shadow-sm">
                        <p className="text-xs uppercase text-slate-500">Distance</p>
                        <p className="text-sm font-semibold text-slate-800">{formatDistanceMeters(activity.total_distance_m)}</p>
                    </div>
                    <Button onClick={handleDownload} variant="outline" className="col-span-full w-full gap-2">
                        <DownloadIcon className="h-4 w-4" /> Download GeoJSON
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
