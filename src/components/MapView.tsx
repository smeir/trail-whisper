import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'

import { cn } from '@/lib/utils'

interface MapActivity {
  id: string
  center: { lat: number; lon: number }
  label?: string
  color?: string
}

interface MapViewProps {
  center?: { lat: number; lon: number }
  currentLocation?: { lat: number; lon: number }
  activities?: MapActivity[]
  track?: Array<{ lat: number; lon: number }>
  zoom?: number
  height?: number
  className?: string
}

const DEFAULT_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

export function MapView({
  center,
  currentLocation,
  activities = [],
  track = [],
  zoom = 14,
  height = 260,
  className,
}: MapViewProps) {
  const fallback = center ?? currentLocation ?? activities[0]?.center ?? track[0]

  if (!fallback) {
    return (
      <div className={cn('flex h-52 items-center justify-center rounded-3xl border border-slate-200 bg-slate-100 text-sm text-slate-500', className)}>
        Map preview unavailable
      </div>
    )
  }

  const mapCenter: LatLngExpression = [fallback.lat, fallback.lon]
  const trackPoints: LatLngExpression[] = track.map((point) => [point.lat, point.lon])

  return (
    <div className={cn('overflow-hidden rounded-3xl border border-slate-200 shadow-sm', className)} style={{ height }}>
      <MapContainer center={mapCenter} zoom={zoom} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer url={DEFAULT_TILE_URL} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
        {currentLocation ? (
          <CircleMarker
            center={[currentLocation.lat, currentLocation.lon]}
            pathOptions={{ color: '#1a69ff', weight: 2, fillOpacity: 0.3 }}
            radius={12}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              You are here
            </Tooltip>
          </CircleMarker>
        ) : null}
        {activities.map((activity) => (
          <CircleMarker
            key={activity.id}
            center={[activity.center.lat, activity.center.lon]}
            radius={8}
            pathOptions={{ color: activity.color ?? '#0f3ca3', fillOpacity: 0.4 }}
          >
            {activity.label ? <Tooltip>{activity.label}</Tooltip> : null}
          </CircleMarker>
        ))}
        {trackPoints.length ? (
          <Polyline positions={trackPoints} pathOptions={{ color: '#1a69ff', weight: 4, opacity: 0.85 }} />
        ) : null}
        {center && !currentLocation ? <Marker position={[center.lat, center.lon]} /> : null}
      </MapContainer>
    </div>
  )
}
