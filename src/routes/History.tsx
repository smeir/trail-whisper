import { useMemo, useState } from 'react'
import { FilterIcon, MapPinIcon } from 'lucide-react'

import { ActivityCard } from '@/components/ActivityCard'
import { ManualLocationControls } from '@/components/location'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useActivities } from '@/hooks/useActivities'
import { useGeolocation } from '@/hooks/useGeolocation'
import type { SportType } from '@/lib/fit'
import { Skeleton } from '@/components/ui/skeleton'

const sportOptions: Array<{ label: string; value: SportType | 'all' }> = [
  { label: 'All sports', value: 'all' },
  { label: 'Running', value: 'running' },
  { label: 'Walking', value: 'walking' },
  { label: 'Hiking', value: 'hiking' },
  { label: 'Cycling', value: 'cycling' },
  { label: 'Swimming', value: 'swimming' },
  { label: 'Other', value: 'other' },
]

export default function History() {
  const [sport, setSport] = useState<SportType | 'all'>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [useNearby, setUseNearby] = useState(false)

  const {
    position,
    status,
    loading: geoLoading,
    requestLocation,
    setManualPosition,
    clearManualPosition,
    mode,
  } = useGeolocation({ autoRequest: false })

  const filters = useMemo(() => {
    const filter: Parameters<typeof useActivities>[0] = {}
    if (sport !== 'all') filter.sport = sport
    if (from) filter.from = new Date(from).toISOString()
    if (to) filter.to = new Date(to).toISOString()
    if (useNearby && position) filter.near = { lat: position.lat, lon: position.lon, radius: 2000 }
    return filter
  }, [from, position, sport, to, useNearby])

  const { data: activities, isLoading } = useActivities(filters)

  const handleToggleNearby = () => {
    if (!useNearby) {
      requestLocation()
    }
    setUseNearby((prev) => !prev)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">History</h1>
        <p className="text-sm text-slate-600">Browse every activity you have uploaded. Filter by sport, time or proximity.</p>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <FilterIcon className="h-4 w-4 text-brand-500" /> Filters
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            <span>Sport</span>
            <Select value={sport} onChange={(event) => setSport(event.target.value as SportType | 'all')}>
              {sportOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            <span>From</span>
            <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            <span>To</span>
            <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <div className="flex flex-col gap-2 text-sm text-slate-600">
            <Label>Proximity</Label>
            <Button
              type="button"
              variant={useNearby ? 'default' : 'outline'}
              className="gap-2"
              onClick={handleToggleNearby}
              disabled={geoLoading && !useNearby}
            >
              <MapPinIcon className="h-4 w-4" />
              {useNearby ? 'Filtering near me' : 'Filter near me'}
            </Button>
            {useNearby ? (
              <p className="text-xs text-slate-500">
                {position
                  ? position.source === 'manual'
                    ? `Within 2 km of your manual location (${position.lat.toFixed(3)}, ${position.lon.toFixed(3)})`
                    : `Within 2 km of your current location (${position.lat.toFixed(3)}, ${position.lon.toFixed(3)})`
                  : status === 'denied'
                  ? 'Location access denied. Update your browser permissions or enter coordinates manually.'
                  : status === 'unsupported'
                  ? 'Geolocation unsupported. Enter coordinates manually to filter by proximity.'
                  : 'Waiting for location…'}
              </p>
            ) : null}
            {useNearby || mode === 'manual' ? (
              <ManualLocationControls
                position={position}
                mode={mode}
                onSetManual={setManualPosition}
                onClearManual={clearManualPosition}
                onRequestLocation={() => {
                  if (useNearby) requestLocation()
                }}
                className="bg-slate-50"
                description="Enter coordinates to filter activities near a custom point."
              />
            ) : null}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : activities && activities.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
          No activities found for this filter combination.
        </div>
      )}
    </div>
  )
}
