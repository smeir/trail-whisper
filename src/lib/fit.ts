import FitParser from 'fit-file-parser'

export type SportType = 'running' | 'walking' | 'hiking' | 'cycling' | 'swimming' | 'other'

export interface ParsedActivity {
  name: string
  sport: SportType
  startedAt: string
  endedAt: string
  totalDistance: number
  points: Array<{ lat: number; lon: number }>
  center: { lat: number; lon: number }
}

const sportMap: Record<string, SportType> = {
  running: 'running',
  walking: 'walking',
  hiking: 'hiking',
  cycling: 'cycling',
  biking: 'cycling',
  swimming: 'swimming',
}

const parserOptions = {
  force: true,
  speedUnit: 'mps',
  lengthUnit: 'm',
  elapsedRecordField: true,
}

const parser = new FitParser(parserOptions)

function normalizeSport(rawSport?: string): SportType {
  if (!rawSport) return 'other'
  const lower = rawSport.toLowerCase()
  return sportMap[lower] ?? 'other'
}

function getLineCenter(points: Array<{ lat: number; lon: number }>) {
  const total = points.reduce(
    (acc, point) => {
      acc.lat += point.lat
      acc.lon += point.lon
      return acc
    },
    { lat: 0, lon: 0 },
  )

  const count = points.length || 1
  return {
    lat: total.lat / count,
    lon: total.lon / count,
  }
}

export function pointsToLineString(points: Array<{ lat: number; lon: number }>) {
  const path = points.map((point) => `${point.lon} ${point.lat}`).join(', ')
  return `SRID=4326;LINESTRING(${path})`
}

export function pointToWkt(point: { lat: number; lon: number }) {
  return `SRID=4326;POINT(${point.lon} ${point.lat})`
}

export async function parseFitFile(file: File): Promise<ParsedActivity> {
  const buffer = await file.arrayBuffer()

  return new Promise((resolve, reject) => {
    parser.parse(buffer, (error: Error | null, data: any) => {
      if (error) {
        reject(error)
        return
      }

      const records: Array<Record<string, any>> = data?.records ?? []
      const sessions: Array<Record<string, any>> = data?.sessions ?? []
      const points = records
        .filter((record) => typeof record.position_lat === 'number' && typeof record.position_long === 'number')
        .map((record) => ({ lat: record.position_lat, lon: record.position_long }))

      if (!points.length) {
        reject(new Error('No GPS points found in FIT file.'))
        return
      }

      const session = sessions[0] ?? {}
      const startedAt = session.start_time ?? records[0]?.timestamp
      const endedAt = session.timestamp ?? records[records.length - 1]?.timestamp ?? startedAt
      const totalDistance = Math.round(session.total_distance ?? records[records.length - 1]?.distance ?? 0)

      if (!startedAt || !endedAt) {
        reject(new Error('Missing timestamps in FIT file.'))
        return
      }

      resolve({
        name: file.name,
        sport: normalizeSport(session.sport ?? data?.sport),
        startedAt: new Date(startedAt).toISOString(),
        endedAt: new Date(endedAt).toISOString(),
        totalDistance,
        points,
        center: getLineCenter(points),
      })
    })
  })
}
