import { useEffect, useMemo, useRef } from 'react'
import maplibregl, { type GeoJSONSource, NavigationControl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

import { cn } from '@/lib/utils'

interface MapPoint {
  lat: number
  lon: number
}

interface HighlightPoint {
  id: string
  point: MapPoint
  label?: string
  color?: string
}

interface ActivityMapProps {
  center?: MapPoint
  track?: MapPoint[]
  highlights?: HighlightPoint[]
  currentLocation?: MapPoint
  zoom?: number
  height?: number
  className?: string
}

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
const TRACK_SOURCE_ID = 'activity-track'
const TRACK_LAYER_ID = 'activity-track-layer'

function buildTrackFeature(track: MapPoint[]) {
  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: track.map((point) => [point.lon, point.lat]),
        },
        properties: {},
      },
    ],
  }
}

export function ActivityMap({
  center,
  track = [],
  highlights = [],
  currentLocation,
  zoom = 13,
  height = 384,
  className,
}: ActivityMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<Record<string, maplibregl.Marker>>({})
  const currentMarkerRef = useRef<maplibregl.Marker | null>(null)

  const fallback = useMemo(() => {
    if (center) return center
    if (track.length) return track[0]
    if (currentLocation) return currentLocation
    if (highlights.length) return highlights[0].point
    return null
  }, [center, track, currentLocation, highlights])

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !fallback) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [fallback.lon, fallback.lat],
      zoom,
      attributionControl: true,
    })

    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')

    mapRef.current = map

    return () => {
      Object.values(markersRef.current).forEach((marker) => marker.remove())
      currentMarkerRef.current?.remove()
      currentMarkerRef.current = null
      markersRef.current = {}
      map.remove()
      mapRef.current = null
    }
  }, [fallback, zoom])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!track.length) {
      if (map.getLayer(TRACK_LAYER_ID)) {
        map.removeLayer(TRACK_LAYER_ID)
      }
      if (map.getSource(TRACK_SOURCE_ID)) {
        map.removeSource(TRACK_SOURCE_ID)
      }
      return
    }

    const ensureTrackLayer = () => {
      const data = buildTrackFeature(track)
      if (map.getSource(TRACK_SOURCE_ID)) {
        const source = map.getSource(TRACK_SOURCE_ID) as GeoJSONSource
        source.setData(data)
      } else {
        map.addSource(TRACK_SOURCE_ID, {
          type: 'geojson',
          data,
        })
        map.addLayer({
          id: TRACK_LAYER_ID,
          type: 'line',
          source: TRACK_SOURCE_ID,
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': '#1a69ff',
            'line-width': 4,
            'line-opacity': 0.9,
          },
        })
      }

      if (track.length === 1) {
        map.flyTo({ center: [track[0].lon, track[0].lat], zoom })
      } else {
        const bounds = track.reduce((acc, point) => acc.extend([point.lon, point.lat]), new maplibregl.LngLatBounds(
          [track[0].lon, track[0].lat],
          [track[0].lon, track[0].lat],
        ))
        map.fitBounds(bounds, { padding: 40, maxZoom: zoom })
      }
    }

    if (map.isStyleLoaded()) {
      ensureTrackLayer()
    } else {
      const onLoad = () => {
        ensureTrackLayer()
        map.off('load', onLoad)
      }
      map.on('load', onLoad)
    }
  }, [track, zoom])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const nextIds = new Set(highlights.map((highlight) => highlight.id))
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      if (!nextIds.has(id)) {
        marker.remove()
        delete markersRef.current[id]
      }
    })

    highlights.forEach((highlight) => {
      const lngLat: [number, number] = [highlight.point.lon, highlight.point.lat]
      const marker = markersRef.current[highlight.id]

      if (!marker) {
        const newMarker = new maplibregl.Marker({
          color: highlight.color ?? '#0f3ca3',
        })
          .setLngLat(lngLat)
          .addTo(map)

        if (highlight.label) {
          const popup = new maplibregl.Popup({ closeButton: false, closeOnMove: true }).setText(highlight.label)
          newMarker.setPopup(popup)
        }

        markersRef.current[highlight.id] = newMarker
      } else {
        marker.setLngLat(lngLat)
        if (highlight.label) {
          const popup = new maplibregl.Popup({ closeButton: false, closeOnMove: true }).setText(highlight.label)
          marker.setPopup(popup)
        } else {
          marker.getPopup()?.remove()
        }
      }
    })
  }, [highlights])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!currentLocation) {
      currentMarkerRef.current?.remove()
      currentMarkerRef.current = null
      return
    }

    const lngLat: [number, number] = [currentLocation.lon, currentLocation.lat]

    if (!currentMarkerRef.current) {
      const markerEl = document.createElement('div')
      markerEl.className = 'relative flex h-5 w-5 items-center justify-center'

      const pulse = document.createElement('span')
      pulse.className =
        'absolute inline-flex h-5 w-5 animate-ping rounded-full bg-sky-400/60'
      markerEl.appendChild(pulse)

      const dot = document.createElement('span')
      dot.className = 'inline-flex h-2.5 w-2.5 rounded-full bg-sky-600 shadow'
      markerEl.appendChild(dot)

      currentMarkerRef.current = new maplibregl.Marker({ element: markerEl })
        .setLngLat(lngLat)
        .setPopup(new maplibregl.Popup({ closeButton: false }).setText('Current position'))
        .addTo(map)
    } else {
      currentMarkerRef.current.setLngLat(lngLat)
    }
  }, [currentLocation])

  if (!fallback) {
    return (
      <div className={cn('flex h-52 items-center justify-center rounded-3xl border border-slate-200 bg-slate-100 text-sm text-slate-500', className)}>
        Map preview unavailable
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('overflow-hidden rounded-3xl border border-slate-200 shadow-sm', className)}
      style={{ height }}
    />
  )
}
