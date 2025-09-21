import { useCallback, useEffect, useState } from 'react'

import type { Coordinates } from '@/lib/types'

type GeolocationStatus = 'idle' | 'prompt' | 'granted' | 'denied' | 'unsupported'

interface Options {
  autoRequest?: boolean
}

interface GeolocationResult {
  position: (Coordinates & { accuracy: number }) | null
  status: GeolocationStatus
  loading: boolean
  error?: string
  requestLocation: () => void
}

export function useGeolocation(options: Options = {}): GeolocationResult {
  const autoRequest = options.autoRequest ?? true
  const [position, setPosition] = useState<(Coordinates & { accuracy: number }) | null>(null)
  const [status, setStatus] = useState<GeolocationStatus>('idle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

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
        setStatus('granted')
        setPosition({
          lat: nextPosition.coords.latitude,
          lon: nextPosition.coords.longitude,
          accuracy: nextPosition.coords.accuracy,
        })
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
  }, [])

  useEffect(() => {
    if (autoRequest && !position && status === 'idle') {
      requestLocation()
    }
  }, [autoRequest, position, requestLocation, status])

  return { position, status, loading, error, requestLocation }
}
