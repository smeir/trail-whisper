import { useMemo, useState } from 'react'
import { CalendarIcon, FilterIcon, Loader2Icon, MapPinIcon, Trash2Icon } from 'lucide-react'

import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ManualLocationControls } from '@/components/location'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useActivities } from '@/hooks/useActivities'
import { useGeolocation } from '@/hooks/useGeolocation'
import type { SportType } from '@/lib/fit'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { formatDateTime, formatDistanceMeters, formatRelative } from '@/utils/format'
import { useAuth } from '@/providers/AuthProvider'

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
    if (useNearby && position) filter.near = { lat: position.lat, lon: position.lon, radius: 2000 }
    return filter
  }, [from, position, sport, to, useNearby])

  const { data: activities, isLoading } = useActivities(filters)
  const navigate = useNavigate()

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const deleteActivityMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) {
        throw new Error('You must be signed in to delete workouts.')
      }
      const { error } = await supabase.from('activities').delete().eq('id', id).eq('user_id', user.id)
      if (error) throw error
    },
    onMutate: (id: string) => {
      setPendingDeleteId(id)
    },
    onSuccess: () => {
      toast.success('Workout deleted')
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      queryClient.invalidateQueries({ queryKey: ['visits-near'] })
    },
    onError: (error: unknown) => {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Could not delete workout')
    },
    onSettled: () => {
      setPendingDeleteId(null)
    },
  })

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('You must be signed in to delete workouts.')
      }
      const { error } = await supabase.from('activities').delete().eq('user_id', user.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('All workouts deleted')
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      queryClient.invalidateQueries({ queryKey: ['visits-near'] })
    },
    onError: (error: unknown) => {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Could not delete workouts')
    },
  })

  const handleToggleNearby = () => {
    if (!useNearby) {
      requestLocation()
    }
    setUseNearby((prev) => !prev)
  }

  const handleDeleteActivity = (id: string) => {
    if (deleteActivityMutation.isPending || deleteAllMutation.isPending) return
    const confirmed = window.confirm('Delete this workout? This action cannot be undone.')
    if (!confirmed) return
    deleteActivityMutation.mutate(id)
  }

  const handleDeleteAll = () => {
    if (!activities?.length || deleteAllMutation.isPending || deleteActivityMutation.isPending) return
    const confirmed = window.confirm('Delete all workouts? This will remove every workout permanently.')
    if (!confirmed) return
    deleteAllMutation.mutate()
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
              onClick={handleDeleteAll}
              disabled={deleteAllMutation.isPending || deleteActivityMutation.isPending}
            >
              {deleteAllMutation.isPending ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2Icon className="h-4 w-4" />
              )}
              Delete all
            </Button>
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
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
                    const isDeleting = deleteActivityMutation.isPending && pendingDeleteId === activity.id
                    const handleRowNavigate = () => {
                      if (deleteAllMutation.isPending || deleteActivityMutation.isPending) return
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
                          {formatDistanceMeters(activity.total_distance_m)}
                        </td>
                        <td className="px-4 py-4 whitespace-normal sm:whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-slate-400" />
                            <div className="flex flex-col">
                              <span className="text-sm text-slate-700">
                                {formatDateTime(activity.started_at)}
                              </span>
                              <span className="text-sm font-semibold text-slate-900 sm:hidden">
                                {formatDistanceMeters(activity.total_distance_m)}
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
                                handleDeleteActivity(activity.id)
                              }}
                              disabled={isDeleting || deleteAllMutation.isPending}
                            >
                              {isDeleting ? (
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
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
          No activities found for this filter combination.
        </div>
      )}
    </div>
  )
}
