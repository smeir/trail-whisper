import { useMemo, useState } from 'react'
import { CalendarIcon, FilterIcon, Loader2Icon, MapPinIcon, Trash2Icon } from 'lucide-react'

import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ManualLocationControls } from '@/components/location'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useActivities } from '@/hooks/useActivities'
import { useGeolocation } from '@/hooks/useGeolocation'
import type { SportType } from '@/lib/fit'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/errors'
import { invalidateActivityData } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabase'
import type { DevicePosition, GeoStatus } from '@/lib/types'
import { formatCoordinates, formatDateTime, formatDistanceMeters, formatRelative } from '@/utils/format'
import { useAuth } from '@/providers/AuthProvider'

const NEARBY_RADIUS_M = 2000

const sportOptions: Array<{ label: string; value: SportType | 'all' }> = [
  { label: 'All sports', value: 'all' },
  { label: 'Running', value: 'running' },
  { label: 'Walking', value: 'walking' },
  { label: 'Hiking', value: 'hiking' },
  { label: 'Cycling', value: 'cycling' },
  { label: 'Swimming', value: 'swimming' },
  { label: 'Other', value: 'other' },
]

function nearbyHint(position: DevicePosition | null, status: GeoStatus) {
  if (position) {
    const where = position.source === 'manual' ? 'your manual location' : 'your current location'
    return `Within ${formatDistanceMeters(NEARBY_RADIUS_M)} of ${where} (${formatCoordinates(position, 3)})`
  }
  if (status === 'denied') {
    return 'Location access denied. Update your browser permissions or enter coordinates manually.'
  }
  if (status === 'unsupported') {
    return 'Geolocation unsupported. Enter coordinates manually to filter by proximity.'
  }
  return 'Waiting for location…'
}

export default function History() {
  const [sport, setSport] = useState<SportType | 'all'>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [useNearby, setUseNearby] = useState(false)
  const { user } = useAuth()
  const queryClient = useQueryClient()

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
    if (useNearby && position) {
      filter.near = { lat: position.lat, lon: position.lon, radius: NEARBY_RADIUS_M }
    }
    return filter
  }, [from, position, sport, to, useNearby])

  const { data: activities, isLoading, isError } = useActivities(filters)
  const navigate = useNavigate()

  // One mutation for both cases: an id deletes that workout, no id deletes all of them.
  // The user_id filter stays alongside RLS — belt and braces on a destructive call.
  const deleteMutation = useMutation({
    mutationFn: async (id?: string) => {
      if (!user) {
        throw new Error('You must be signed in to delete workouts.')
      }
      const query = supabase.from('activities').delete().eq('user_id', user.id)
      const { error } = await (id ? query.eq('id', id) : query)
      if (error) throw error
    },
    onSuccess: (_data, id) => {
      toast.success(id ? 'Workout deleted' : 'All workouts deleted')
      // Returned, not fired-and-forgotten: react-query awaits onSuccess before
      // clearing isPending, so the table stops offering rows that are already gone.
      return invalidateActivityData(queryClient)
    },
    onError: (error: unknown) => {
      console.error(error)
      toast.error(errorMessage(error, 'Could not delete workouts'))
    },
  })

  const isDeleting = deleteMutation.isPending
  const isDeletingAll = isDeleting && !deleteMutation.variables

  const handleToggleNearby = () => {
    if (!useNearby) {
      requestLocation()
    }
    setUseNearby((prev) => !prev)
  }

  const handleDelete = (id?: string) => {
    if (isDeleting) return
    const message = id
      ? 'Delete this workout? This action cannot be undone.'
      : 'Delete all workouts? This will remove every workout permanently.'
    if (!window.confirm(message)) return
    deleteMutation.mutate(id)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">History</h1>
        <p className="text-sm text-slate-600">Browse every activity you have uploaded. Filter by sport, time or proximity.</p>
      </div>
      <Card>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <FilterIcon className="h-4 w-4 text-brand-500" /> Filters
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="filter-sport">Sport</Label>
            <Select
              id="filter-sport"
              value={sport}
              onChange={(event) => setSport(event.target.value as SportType | 'all')}
            >
              {sportOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="filter-from">From</Label>
            <Input id="filter-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="filter-to">To</Label>
            <Input id="filter-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
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
            {useNearby ? <p className="text-xs text-slate-500">{nearbyHint(position, status)}</p> : null}
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
      </Card>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError ? (
        // Distinct from the empty state below: telling someone with 200 uploads
        // that they have none would send them off adjusting filters for nothing.
        <EmptyState className="border-rose-200 bg-rose-50 text-rose-600">
          Could not load your workouts. Check your connection and try again.
        </EmptyState>
      ) : activities && activities.length ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-600">
              Showing{' '}
              <span className="font-semibold text-slate-900">
                {activities.length}
              </span>{' '}
              workout{activities.length === 1 ? '' : 's'}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start text-rose-600 hover:text-rose-700"
              onClick={() => handleDelete()}
              disabled={isDeleting}
            >
              {isDeletingAll ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2Icon className="h-4 w-4" />
              )}
              Delete all
            </Button>
          </div>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Sport</th>
                    <th className="hidden px-4 py-3 sm:table-cell">Distance</th>
                    <th className="px-4 py-3">
                      <span className="hidden sm:inline">Started</span>
                      <span className="sm:hidden">Started · Distance</span>
                    </th>
                    <th className="hidden px-4 py-3 sm:table-cell">Uploaded</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
                  {activities.map((activity) => {
                    const isDeletingRow = isDeleting && deleteMutation.variables === activity.id
                    const distance = formatDistanceMeters(activity.total_distance_m)
                    const handleRowNavigate = () => {
                      if (isDeleting) return
                      navigate(`/activity/${activity.id}`)
                    }
                    return (
                      <tr
                        key={activity.id}
                        tabIndex={0}
                        onClick={handleRowNavigate}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            handleRowNavigate()
                          }
                        }}
                        className="cursor-pointer hover:bg-slate-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                      >
                        <td className="whitespace-nowrap px-4 py-4">
                          <span className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase text-brand-700">
                            {activity.sport}
                          </span>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-4 font-semibold sm:table-cell">
                          {distance}
                        </td>
                        <td className="px-4 py-4 whitespace-normal sm:whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-slate-400" />
                            <div className="flex flex-col">
                              <span className="text-sm text-slate-700">
                                {formatDateTime(activity.started_at)}
                              </span>
                              <span className="text-sm font-semibold text-slate-900 sm:hidden">
                                {distance}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-4 text-slate-500 sm:table-cell">
                          <span title={formatDateTime(activity.created_at)}>
                            {formatRelative(activity.created_at)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:text-rose-700"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleDelete(activity.id)
                              }}
                              disabled={isDeleting}
                            >
                              {isDeletingRow ? (
                                <Loader2Icon className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2Icon className="h-4 w-4" />
                              )}
                              <span className="hidden sm:inline">Delete</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <EmptyState>No activities found for this filter combination.</EmptyState>
      )}
    </div>
  )
}
