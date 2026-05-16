/**
 * Minimal hand-rolled FIT file generator for tests.
 *
 * Produces a valid-enough FIT binary (file_id + record + session messages) so
 * that the real `fit-file-parser` dependency is exercised end-to-end. Header
 * and file CRC are left as 0; `fit-file-parser` is invoked with `force: true`
 * (see src/lib/fit.ts) which tolerates a zeroed CRC.
 *
 * FIT base type ids: enum/uint8 = 0x00, uint32 = 0x86, sint32 = 0x85.
 * Position is stored in semicircles: semicircles = round(deg * 2^31 / 180).
 */

const SEMI = 2 ** 31 / 180
const toSemicircles = (deg: number) => Math.round(deg * SEMI)

interface FitPoint {
  lat: number
  lon: number
  distanceM: number
  timestamp: number
}

export interface SampleFitOptions {
  /** FIT sport enum value (1 = running). */
  sport?: number
  points?: FitPoint[]
  startTime?: number
  endTime?: number
  totalDistanceM?: number
}

const DEFAULT_POINTS: FitPoint[] = [
  { lat: 47.0, lon: 8.0, distanceM: 0, timestamp: 1_000_000_000 },
  { lat: 47.001, lon: 8.001, distanceM: 100, timestamp: 1_000_000_010 },
  { lat: 47.002, lon: 8.002, distanceM: 200, timestamp: 1_000_000_020 },
]

export function buildSampleFitFile(options: SampleFitOptions = {}): Uint8Array {
  const points = options.points ?? DEFAULT_POINTS
  const sport = options.sport ?? 1
  const startTime = options.startTime ?? points[0]?.timestamp ?? 1_000_000_000
  const endTime =
    options.endTime ?? points[points.length - 1]?.timestamp ?? startTime
  const totalDistanceM =
    options.totalDistanceM ?? points[points.length - 1]?.distanceM ?? 0

  const body: number[] = []
  const pushU16 = (arr: number[], v: number) => arr.push(v & 0xff, (v >> 8) & 0xff)
  const pushU32 = (arr: number[], v: number) => {
    arr.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff)
  }
  const pushI32 = (arr: number[], v: number) => {
    const u = v < 0 ? v + 0x1_0000_0000 : v
    pushU32(arr, u)
  }

  // --- file_id definition (local type 2, global 0) ---
  body.push(0x42, 0x00, 0x00)
  pushU16(body, 0) // global message number 0 = file_id
  body.push(2) // field count
  body.push(0, 1, 0x00) // type (enum)
  body.push(4, 4, 0x86) // time_created (uint32)
  // file_id data
  body.push(0x02)
  body.push(4) // type 4 = activity
  pushU32(body, startTime)

  // --- record definition (local type 0, global 20) ---
  body.push(0x40, 0x00, 0x00)
  pushU16(body, 20)
  body.push(4)
  body.push(253, 4, 0x86) // timestamp (uint32)
  body.push(0, 4, 0x85) // position_lat (sint32)
  body.push(1, 4, 0x85) // position_long (sint32)
  body.push(5, 4, 0x86) // distance (uint32, scale 100)
  // record data
  for (const p of points) {
    body.push(0x00)
    pushU32(body, p.timestamp)
    pushI32(body, toSemicircles(p.lat))
    pushI32(body, toSemicircles(p.lon))
    pushU32(body, Math.round(p.distanceM * 100))
  }

  // --- session definition (local type 1, global 18) ---
  body.push(0x41, 0x00, 0x00)
  pushU16(body, 18)
  body.push(4)
  body.push(253, 4, 0x86) // timestamp (uint32)
  body.push(2, 4, 0x86) // start_time (uint32)
  body.push(9, 4, 0x86) // total_distance (uint32, scale 100)
  body.push(5, 1, 0x00) // sport (enum)
  // session data
  body.push(0x01)
  pushU32(body, endTime)
  pushU32(body, startTime)
  pushU32(body, Math.round(totalDistanceM * 100))
  body.push(sport)

  // --- header (14 bytes) ---
  const header: number[] = []
  header.push(14) // header size
  header.push(0x20) // protocol version 2.0
  pushU16(header, 2189) // profile version (arbitrary)
  pushU32(header, body.length) // data size
  header.push(0x2e, 0x46, 0x49, 0x54) // ".FIT"
  pushU16(header, 0) // header CRC (0 = skip)

  const file = [...header, ...body, 0, 0] // trailing file CRC (0 = skip with force)
  return new Uint8Array(file)
}

/** Wrap a generated FIT binary in a File, ready for parseFitFile(). */
export function sampleFitFile(
  name = 'sample.fit',
  options: SampleFitOptions = {},
): File {
  const bytes = buildSampleFitFile(options)
  return new File([bytes as BlobPart], name)
}
