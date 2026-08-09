import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/useReverseGeocode', () => ({
  useReverseGeocode: () => ({
    locality: 'Zurich',
    region: 'ZH',
    placeType: 'city',
    isLoading: false,
  }),
}))

import { GeoStatusCard } from './GeoStatusCard'
import { renderWithProviders } from '@/test/render'
import type { AggregatedVisitStats, VisitNear } from '@/lib/types'

const emptyStats: AggregatedVisitStats = {
  totalVisits: 0,
  recentVisits: [],
}

function renderCard(props: Partial<Parameters<typeof GeoStatusCard>[0]> = {}) {
  return renderWithProviders(
    <GeoStatusCard loading={false} status="granted" position={null} stats={emptyStats} onRetry={vi.fn()} {...props} />,
  )
}

describe('GeoStatusCard', () => {
  it('shows a checking state while loading', () => {
    renderCard({ loading: true })
    expect(screen.getByText('Checking your location…')).toBeInTheDocument()
  })

  it('explains when geolocation is unsupported', () => {
    renderCard({ status: 'unsupported' })
    expect(
      screen.getByText('Your device does not support geolocation.'),
    ).toBeInTheDocument()
  })

  it('prompts to upload when granted but no visits exist', () => {
    renderCard({ status: 'granted' })
    expect(screen.getByText('Not active here yet')).toBeInTheDocument()
  })

  it('reports a failed visit lookup instead of claiming there are no visits', () => {
    renderCard({ status: 'granted', visitsFailed: true })
    expect(screen.getByText('Could not check this location for past visits.')).toBeInTheDocument()
    expect(screen.queryByText('Not active here yet')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('summarises past visits and lists recent ones', () => {
    const visits: VisitNear[] = [
      {
        activity_id: 'v1',
        started_at: '2024-01-02T13:45:00',
        ended_at: '2024-06-15T10:00:00Z',
        total_distance_m: 5400,
        sport: 'running',
        distance_m: 42,
      },
    ]
    renderCard({ stats: { totalVisits: 3, recentVisits: visits } })
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Recent visits')).toBeInTheDocument()
    expect(screen.getByText('42 m away')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/activity/v1')
    // Reverse-geocoded place label from the mocked hook.
    expect(screen.getByText('Zurich, ZH')).toBeInTheDocument()
  })
})
