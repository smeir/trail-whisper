import { type FormEvent, useMemo, useState } from 'react'
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
  const [showForm, setShowForm] = useState(false)
  const [latInput, setLatInput] = useState('')
  const [lonInput, setLonInput] = useState('')
  const [manualError, setManualError] = useState<string | null>(null)

  const manualCoordinates = useMemo(() => {
    if (position?.source !== 'manual') return null
    return {
      lat: position.lat.toFixed(5),
      lon: position.lon.toFixed(5),
    }
  }, [position])

  const handleToggle = () => {
    if (!showForm && position) {
      setLatInput(position.lat.toString())
      setLonInput(position.lon.toString())
    }
    setShowForm((prev) => !prev)
    setManualError(null)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const lat = parseFloat(latInput)
    const lon = parseFloat(lonInput)

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setManualError('Enter numeric latitude and longitude values.')
      return
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setManualError('Latitude must be between -90 and 90, longitude between -180 and 180.')
      return
    }

    onSetManual({ lat, lon })
    setManualError(null)
    setShowForm(false)
  }

  const handleClear = () => {
    onClearManual()
    setLatInput('')
    setLonInput('')
    setManualError(null)

    if (onRequestLocation) {
      onRequestLocation()
    }
  }

  return (
    <div className={cn('flex flex-col gap-3 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-600', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 font-medium text-slate-700">
          <Wand2Icon className="h-4 w-4 text-brand-500" /> Set location manually
        </div>
        <Button variant="outline" size="sm" onClick={handleToggle}>
          {showForm ? 'Close' : 'Enter coordinates'}
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
      {showForm ? (
        <form className="mt-2 flex flex-col gap-3" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1 text-xs text-slate-500">
              <Label htmlFor="manual-lat">Latitude</Label>
              <Input
                id="manual-lat"
                value={latInput}
                onChange={(event) => setLatInput(event.target.value)}
                placeholder="e.g. 40.7128"
                inputMode="decimal"
                required
              />
            </div>
            <div className="flex flex-col gap-1 text-xs text-slate-500">
              <Label htmlFor="manual-lon">Longitude</Label>
              <Input
                id="manual-lon"
                value={lonInput}
                onChange={(event) => setLonInput(event.target.value)}
                placeholder="e.g. -74.0060"
                inputMode="decimal"
                required
              />
            </div>
          </div>
          {manualError ? <p className="text-xs text-rose-600">{manualError}</p> : null}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm">
              Save manual position
            </Button>
            {mode === 'manual' ? (
              <Button type="button" size="sm" variant="ghost" onClick={handleClear}>
                Use device location
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}
    </div>
  )
}
