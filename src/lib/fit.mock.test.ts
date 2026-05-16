import { afterEach, describe, expect, it, vi } from 'vitest'

// Isolated file: fit-file-parser is fully mocked here so we can exercise the
// transformation/branching logic in parseFitFile (sport fallback, point
// filtering, timestamp fallbacks, error propagation) deterministically.
const holder = vi.hoisted(() => ({
  error: undefined as string | undefined,
  data: {} as Record<string, unknown>,
}))

// fit-file-parser v3 callback signature: (error: string | undefined, data)
vi.mock('fit-file-parser', () => ({
  default: class {
    parse(_buffer: ArrayBuffer, cb: (err: string | undefined, data: unknown) => void) {
      cb(holder.error, holder.data)
    }
  },
}))

const { parseFitFile } = await import('./fit')

function fileWith(data: Record<string, unknown>, error?: string) {
  holder.data = data
  holder.error = error
  return new File([new Uint8Array([1, 2, 3]) as BlobPart], 'mock.fit')
}

afterEach(() => {
  holder.error = undefined
  holder.data = {}
})

describe('parseFitFile (logic, mocked parser)', () => {
  it('rejects when the parser reports an error', async () => {
    const file = fileWith({}, 'corrupt')
    await expect(parseFitFile(file)).rejects.toThrow('corrupt')
  })

  it('filters out records without numeric coordinates', async () => {
    const file = fileWith({
      records: [
        { position_lat: 47, position_long: 8, timestamp: '2024-01-01T00:00:00Z' },
        { position_lat: 'x', position_long: 8 },
        { position_lat: 47.1, position_long: 8.1, timestamp: '2024-01-01T00:10:00Z' },
      ],
      sessions: [],
    })
    const activity = await parseFitFile(file)
    expect(activity.points).toEqual([
      { lat: 47, lon: 8 },
      { lat: 47.1, lon: 8.1 },
    ])
  })

  it('falls back to first/last record timestamps when no session is present', async () => {
    const file = fileWith({
      records: [
        { position_lat: 47, position_long: 8, timestamp: '2024-01-01T00:00:00Z', distance: 0 },
        { position_lat: 47.1, position_long: 8.1, timestamp: '2024-01-01T01:00:00Z', distance: 1234.6 },
      ],
      sessions: [],
    })
    const activity = await parseFitFile(file)
    expect(activity.startedAt).toBe(new Date('2024-01-01T00:00:00Z').toISOString())
    expect(activity.endedAt).toBe(new Date('2024-01-01T01:00:00Z').toISOString())
    expect(activity.totalDistance).toBe(1235)
    expect(activity.sport).toBe('other')
  })

  it('normalizes known sport aliases (biking -> cycling)', async () => {
    const file = fileWith({
      records: [{ position_lat: 47, position_long: 8, timestamp: '2024-01-01T00:00:00Z' }],
      sessions: [
        {
          sport: 'biking',
          start_time: '2024-01-01T00:00:00Z',
          timestamp: '2024-01-01T00:30:00Z',
          total_distance: 5000,
        },
      ],
    })
    const activity = await parseFitFile(file)
    expect(activity.sport).toBe('cycling')
    expect(activity.totalDistance).toBe(5000)
  })

  it('rejects when no GPS points are present', async () => {
    const file = fileWith({ records: [], sessions: [] })
    await expect(parseFitFile(file)).rejects.toThrow(/No GPS points/)
  })

  it('rejects when timestamps are missing', async () => {
    const file = fileWith({
      records: [{ position_lat: 47, position_long: 8 }],
      sessions: [],
    })
    await expect(parseFitFile(file)).rejects.toThrow(/Missing timestamps/)
  })
})
