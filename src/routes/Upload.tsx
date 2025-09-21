import { FitDropzone } from '@/components/FitDropzone'

export default function Upload() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Upload FIT workouts</h1>
        <p className="text-sm text-slate-600">
          Parse Garmin, Suunto, Coros, Zwift and other FIT files directly in your browser. We convert the GPS track to PostGIS
          geometries and store everything securely in Supabase.
        </p>
      </div>
      <FitDropzone />
    </div>
  )
}
