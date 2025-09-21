import { useCallback, useEffect, useMemo, useState } from 'react'

import type { Coordinates } from '@/lib/types'

const MANUAL_LOCATION_KEY = 'trail-whisper:manual-location'

type GeolocationStatus = 'idle' | 'prompt' | 'granted' | 'denied' | 'unsupported' | 'manual'
type GeolocationSource = 'browser' | 'manual'
type GeolocationMode = 'auto' | 'manual'

type GeolocationPosition = Coordinates & { accuracy: number; source: GeolocationSource }

function readManualLocation(): Coordinates | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(MANUAL_LOCATION_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<Coordinates>
    if (typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
      return { lat: parsed.lat, lon: parsed.lon }
    }
  } catch (err) {
    console.warn('Failed to read manual location from storage', err)
  }

  return null
}

interface Options {
  autoRequest?: boolean
}

interface GeolocationResult {
  position: GeolocationPosition | null
  status: GeolocationStatus
  loading: boolean
  error?: string
  requestLocation: () => void
  setManualPosition: (coords: Coordinates) => void
  clearManualPosition: () => void
  mode: GeolocationMode
}

export function useGeolocation(options: Options = {}): GeolocationResult {
  const autoRequest = options.autoRequest ?? true
  const [manualPosition, setManualPositionState] = useState<Coordinates | null>(() => readManualLocation())
  const [geoPosition, setGeoPosition] = useState<GeolocationPosition | null>(null)
  const [status, setStatus] = useState<GeolocationStatus>(manualPosition ? 'manual' : 'idle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const mode: GeolocationMode = manualPosition ? 'manual' : 'auto'

  const position = useMemo<GeolocationPosition | null>(() => {
    if (manualPosition) {
      return { lat: manualPosition.lat, lon: manualPosition.lon, accuracy: Number.NaN, source: 'manual' }
    }
    return geoPosition
  }, [geoPosition, manualPosition])

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported')
      setError('Geolocation is not supported on this device.')
      return
    }

    setLoading(true)
    setStatus('prompt')
    navigator.geolocation.getCurrentPosition(
      (nextPosition) => {
        setLoading(false)
        setGeoPosition({
          lat: nextPosition.coords.latitude,
          lon: nextPosition.coords.longitude,
          accuracy: nextPosition.coords.accuracy,
          source: 'browser',
        })
        setStatus(manualPosition ? 'manual' : 'granted')
        setError(undefined)
      },
      (err) => {
        setLoading(false)
        setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'idle')
        setError(err.message)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 15_000,
      },
    )
  }, [manualPosition])

  const setManualPosition = useCallback((coords: Coordinates) => {
    setManualPositionState(coords)
    setStatus('manual')
    setLoading(false)
    setError(undefined)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MANUAL_LOCATION_KEY, JSON.stringify(coords))
    }
  }, [])

  const clearManualPosition = useCallback(() => {
    setManualPositionState(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(MANUAL_LOCATION_KEY)
    }

    setStatus(geoPosition ? 'granted' : 'idle')
  }, [geoPosition])

  useEffect(() => {
    if (autoRequest && !position && status === 'idle') {
      requestLocation()
    }
  }, [autoRequest, position, requestLocation, status])

  return {
    position,
    status,
    loading,
    error,
    requestLocation,
    setManualPosition,
    clearManualPosition,
    mode,
  }
}
