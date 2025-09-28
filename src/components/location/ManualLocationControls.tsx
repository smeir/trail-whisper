import { type FormEvent, type MouseEvent, useEffect, useMemo, useState } from 'react'
import { Wand2Icon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Coordinates } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ManualLocationControlsProps {
  position: (Coordinates & { accuracy: number; source: 'browser' | 'manual' }) | null
  mode: 'auto' | 'manual'
  onSetManual: (coords: Coordinates) => void
  onClearManual: () => void
  onRequestLocation?: () => void
  className?: string
  description?: string
}

export function ManualLocationControls({
  position,
  mode,
  onSetManual,
  onClearManual,
  onRequestLocation,
  className,
  description,
}: ManualLocationControlsProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [combinedInput, setCombinedInput] = useState('')
  const [manualError, setManualError] = useState<string | null>(null)

  const manualCoordinates = useMemo(() => {
    if (position?.source !== 'manual') return null
    return {
      lat: position.lat.toFixed(5),
      lon: position.lon.toFixed(5),
    }
  }, [position])

  const handleOpen = () => {
    if (position) {
      const latValue = position.lat
      const lonValue = position.lon
      setCombinedInput(`${latValue}, ${lonValue}`)
    } else {
      setCombinedInput('')
    }
    setShowDialog(true)
    setManualError(null)
  }

  const handleClose = () => {
    setShowDialog(false)
    setManualError(null)
  }

  useEffect(() => {
    if (!showDialog) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showDialog])

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleClose()
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const combined = combinedInput.trim()
    if (!combined) {
      setManualError('Enter coordinates in the format "latitude,longitude".')
      return
    }

    const parts = combined.split(',')
    if (parts.length !== 2) {
      setManualError('Enter coordinates in the format "latitude,longitude".')
      return
    }

    const lat = parseFloat(parts[0].trim())
    const lon = parseFloat(parts[1].trim())

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setManualError('Enter numeric latitude and longitude values.')
      return
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setManualError('Latitude must be between -90 and 90, longitude between -180 and 180.')
      return
    }

    onSetManual({ lat, lon })
    setCombinedInput(`${lat}, ${lon}`)
    handleClose()
  }

  const handleClear = () => {
    onClearManual()
    setCombinedInput('')
    setManualError(null)
    setShowDialog(false)

    if (onRequestLocation) {
      onRequestLocation()
    }
  }

  return (
    <>
      <div
        className={cn(
          'flex flex-col gap-3 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-600',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 font-medium text-slate-700">
            <Wand2Icon className="h-4 w-4 text-brand-500" /> Set location manually
          </div>
          <Button variant="outline" size="sm" onClick={handleOpen}>
            Enter coordinates
          </Button>
        </div>
        {mode === 'manual' && manualCoordinates ? (
          <p className="text-xs text-slate-500">
            Currently using ({manualCoordinates.lat}, {manualCoordinates.lon}).{' '}
            <button
              type="button"
              className="font-medium text-brand-600 hover:underline"
              onClick={handleClear}
            >
              Switch back to device location
            </button>
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            {description ?? 'Provide GPS latitude and longitude if your browser cannot detect your location.'}
          </p>
        )}
      </div>

      {showDialog ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          onClick={handleBackdropClick}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-location-title"
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="manual-location-title" className="text-lg font-semibold text-slate-900">
                  Set manual coordinates
                </h2>
                <p className="text-sm text-slate-500">
                  Paste a Google Maps value or enter latitude and longitude separated by a comma.
                </p>
              </div>
            </div>
            <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1 text-xs text-slate-500">
                <Label htmlFor="manual-combined">Lat,Long</Label>
                <Input
                  id="manual-combined"
                  value={combinedInput}
                  onChange={(event) => setCombinedInput(event.target.value)}
                  placeholder="40.7128,-74.0060"
                  inputMode="decimal"
                  required
                />
                <span className="text-[11px] text-slate-400">
                  Accepts a single string like &quot;40.7128,-74.0060&quot; from Google Maps.
                </span>
              </div>
              {manualError ? <p className="text-xs text-rose-600">{manualError}</p> : null}
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" size="sm">
                  Save manual position
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                {mode === 'manual' ? (
                  <Button type="button" size="sm" variant="ghost" onClick={handleClear}>
                    Use device location
                  </Button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
