import { useCallback, useMemo, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { CheckIcon, Loader2Icon, UploadCloudIcon, XCircleIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { parseFitFile, pointsToLineString, type ParsedActivity } from '@/lib/fit'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { formatDateTime, formatDistanceMeters } from '@/utils/format'

interface QueuedActivity {
  id: string
  fileName: string
  parsed: ParsedActivity
  status: 'ready' | 'uploading' | 'done' | 'error'
  error?: string
}

const generateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

export function FitDropzone() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [queue, setQueue] = useState<QueuedActivity[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(async (file) => {
      try {
        const parsed = await parseFitFile(file)
        setQueue((prev) => [
          ...prev,
          {
            id: generateId(),
            fileName: file.name,
            parsed,
            status: 'ready',
          },
        ])
        toast.success(`Parsed ${file.name}`)
      } catch (error) {
        console.error(error)
        toast.error(`Could not parse ${file.name}`)
      }
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/octet-stream': ['.fit'], 'application/fit': ['.fit'] },
    multiple: true,
  })

  const pendingCount = useMemo(() => queue.filter((item) => item.status === 'ready').length, [queue])

  const handleRemove = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const uploadQueue = useCallback(async () => {
    if (!user) {
      toast.error('You must be signed in to upload activities.')
      return
    }

    setIsUploading(true)

    for (const item of queue) {
      if (item.status !== 'ready') continue

      setQueue((prev) =>
        prev.map((entry) => (entry.id === item.id ? { ...entry, status: 'uploading', error: undefined } : entry)),
      )

      try {
        const { parsed } = item
        const { error } = await supabase.from('activities').insert({
          user_id: user.id,
          sport: parsed.sport,
          started_at: parsed.startedAt,
          ended_at: parsed.endedAt,
          total_distance_m: parsed.totalDistance,
          track_geom: pointsToLineString(parsed.points),
        })

        if (error) throw error

        setQueue((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, status: 'done' } : entry)))
        toast.success(`Uploaded ${item.fileName}`)
      } catch (error: any) {
        console.error(error)
        setQueue((prev) =>
          prev.map((entry) =>
            entry.id === item.id
              ? { ...entry, status: 'error', error: error.message ?? 'Upload failed' }
              : entry,
          ),
        )
        toast.error(`Failed to upload ${item.fileName}`)
      }
    }

    setIsUploading(false)
    await queryClient.invalidateQueries({ queryKey: ['activities'] })
    await queryClient.invalidateQueries({ queryKey: ['visits-near'] })
  }, [queue, queryClient, user])

  const hasItems = queue.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <UploadCloudIcon className="h-5 w-5 text-brand-500" /> Import FIT workouts
        </CardTitle>
        <CardDescription>Drop your Garmin, Suunto, Coros or Zwift FIT files to store them securely in Supabase.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div
          {...getRootProps({
            className: `flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed ${
              isDragActive ? 'border-brand-400 bg-brand-50' : 'border-slate-300 bg-white'
            } p-8 text-center transition`,
          })}
        >
          <input {...getInputProps()} />
          <UploadCloudIcon className="h-10 w-10 text-brand-400" />
          <p className="text-base font-semibold text-slate-800">Drag & drop your FIT files</p>
          <p className="text-sm text-slate-500">You can also click to select files from your device.</p>
        </div>

        {hasItems ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Ready to upload ({pendingCount})</p>
              <Button onClick={uploadQueue} disabled={!pendingCount || isUploading} className="gap-2">
                {isUploading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <UploadCloudIcon className="h-4 w-4" />}
                {isUploading ? 'Uploading…' : 'Upload all'}
              </Button>
            </div>
            <ul className="flex flex-col gap-3">
              {queue.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">{item.fileName}</p>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(item.parsed.startedAt)} → {formatDateTime(item.parsed.endedAt)}
                      </p>
                    </div>
                    {item.status === 'ready' ? (
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        className="text-slate-400 transition hover:text-rose-500"
                      >
                        <XCircleIcon className="h-5 w-5" />
                      </button>
                    ) : null}
                    {item.status === 'uploading' ? <Loader2Icon className="h-5 w-5 animate-spin text-brand-500" /> : null}
                    {item.status === 'done' ? <CheckIcon className="h-5 w-5 text-emerald-500" /> : null}
                    {item.status === 'error' ? <XCircleIcon className="h-5 w-5 text-rose-500" /> : null}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <div className="rounded-xl bg-slate-100 p-2">
                      <p className="text-[11px] uppercase text-slate-500">Sport</p>
                      <p className="text-sm font-semibold capitalize text-slate-800">{item.parsed.sport}</p>
                    </div>
                    <div className="rounded-xl bg-slate-100 p-2">
                      <p className="text-[11px] uppercase text-slate-500">Distance</p>
                      <p className="text-sm font-semibold text-slate-800">{formatDistanceMeters(item.parsed.totalDistance)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-100 p-2">
                      <p className="text-[11px] uppercase text-slate-500">Points</p>
                      <p className="text-sm font-semibold text-slate-800">{item.parsed.points.length}</p>
                    </div>
                    <div className="rounded-xl bg-slate-100 p-2">
                      <p className="text-[11px] uppercase text-slate-500">Start point</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {item.parsed.points[0]
                          ? `${item.parsed.points[0].lat.toFixed(4)}, ${item.parsed.points[0].lon.toFixed(4)}`
                          : '—'}
                      </p>
                    </div>
                  </div>
                  {item.error ? <p className="text-xs text-rose-500">{item.error}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
