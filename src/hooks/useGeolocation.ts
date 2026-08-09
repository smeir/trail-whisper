import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { Coordinates, DevicePosition, GeoMode, GeoStatus } from '@/lib/types'

const MANUAL_LOCATION_KEY = 'trail-whisper:manual-location'

/** Status of the browser geolocation API alone; a manual position overrides it in `status`. */
type BrowserStatus = Exclude<GeoStatus, 'manual'>

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
  position: DevicePosition | null
  status: GeoStatus
  loading: boolean
  error?: string
  requestLocation: () => void
  setManualPosition: (coords: Coordinates) => void
  clearManualPosition: () => void
  mode: GeoMode
}

export function useGeolocation(options: Options = {}): GeolocationResult {
  const autoRequest = options.autoRequest ?? true
  const [manualPosition, setManualPositionState] = useState<Coordinates | null>(() => readManualLocation())
  const [geoPosition, setGeoPosition] = useState<DevicePosition | null>(null)
  const [browserStatus, setBrowserStatus] = useState<BrowserStatus>('idle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const mode: GeoMode = manualPosition ? 'manual' : 'auto'
  const status: GeoStatus = manualPosition ? 'manual' : browserStatus

  const position = useMemo<DevicePosition | null>(() => {
    if (manualPosition) {
      return { lat: manualPosition.lat, lon: manualPosition.lon, accuracy: Number.NaN, source: 'manual' }
    }
    return geoPosition
  }, [geoPosition, manualPosition])

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setBrowserStatus('unsupported')
      setError('Geolocation is not supported on this device.')
      return
    }

    setLoading(true)
    setBrowserStatus('prompt')
    navigator.geolocation.getCurrentPosition(
      (nextPosition) => {
        setLoading(false)
        setGeoPosition({
          lat: nextPosition.coords.latitude,
          lon: nextPosition.coords.longitude,
          accuracy: nextPosition.coords.accuracy,
          source: 'browser',
        })
        setBrowserStatus('granted')
        setError(undefined)
      },
      (err) => {
        setLoading(false)
        setBrowserStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'idle')
        setError(err.message)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 15_000,
      },
    )
  }, [])

  const setManualPosition = useCallback((coords: Coordinates) => {
    setManualPositionState(coords)
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
  }, [])

  // A TIMEOUT or POSITION_UNAVAILABLE failure resets the status to 'idle', which
  // matches the pre-request state — so an unguarded effect re-fires immediately and
  // loops forever (tight, not throttled, when the device answers 'unavailable' at
  // once). One automatic attempt per mount; after that it takes an explicit retry.
  const autoRequested = useRef(false)

  useEffect(() => {
    if (!autoRequest || autoRequested.current) return
    if (position || status !== 'idle') return

    autoRequested.current = true
    requestLocation()
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
