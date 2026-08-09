import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
const from = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: (...args: unknown[]) => from(...args),
  },
}))

import { useActivities } from './useActivities'
import { createQueryWrapper } from '@/test/render'

/** Thenable stand-in for a PostgREST builder: every filter returns itself. */
function queryBuilder(rows: unknown[]) {
  const builder: Record<string, unknown> = {
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => resolve({ data: rows, error: null }),
  }
  for (const method of ['select', 'order', 'limit', 'eq', 'gte', 'lte']) {
    builder[method] = vi.fn(() => builder)
  }
  return builder
}

function renderActivities(filters?: Parameters<typeof useActivities>[0]) {
  return renderHook(() => useActivities(filters), { wrapper: createQueryWrapper() })
}

beforeEach(() => {
  rpc.mockReset()
  from.mockReset()
})

describe('useActivities', () => {
  it('resolves a proximity filter server-side and loads no geometry', async () => {
    rpc.mockResolvedValue({ data: [{ id: 'a1' }], error: null })

    const { result } = renderActivities({
      near: { lat: 47.3768866, lon: 8.5417, radius: 2000 },
      sport: 'running',
      from: '2024-01-01T00:00:00.000Z',
    })

    await waitFor(() => expect(result.current.data).toEqual([{ id: 'a1' }]))

    // The whole filter goes to Postgres — no table select, so no track_geom is
    // shipped to the browser just to be measured and discarded.
    expect(from).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledWith('find_activities_near', {
      lat: 47.3769,
      lon: 8.5417,
      radius_m: 2000,
      sport_filter: 'running',
      started_from: '2024-01-01T00:00:00.000Z',
      started_to: null,
      max_results: null,
    })
  })

  it('quantises the centre so a drifting fix reuses one request', async () => {
    rpc.mockResolvedValue({ data: [], error: null })

    const { result } = renderActivities({ near: { lat: 47.376886, lon: 8.541699, radius: 500 } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(rpc.mock.calls[0][1]).toMatchObject({ lat: 47.3769, lon: 8.5417 })
  })

  it('selects without track_geom when there is no proximity filter', async () => {
    const builder = queryBuilder([{ id: 'a2' }])
    from.mockReturnValue(builder)

    const { result } = renderActivities({ limit: 5 })
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'a2' }]))

    expect(rpc).not.toHaveBeenCalled()
    expect(builder.select).toHaveBeenCalledWith(expect.not.stringContaining('track_geom'))
  })

  it('stays disabled rather than dropping a malformed proximity filter', async () => {
    const { result } = renderActivities({ near: { lat: Number.NaN, lon: 8.5417, radius: 2000 } })

    // Running it would silently return every activity instead of the nearby ones.
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(rpc).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
  })
})
