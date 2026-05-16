import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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
import type { AggregatedVisitStats, VisitNear } from '@/lib/types'

const emptyStats: AggregatedVisitStats = {
  totalVisits: 0,
  totalDistance: 0,
  recentVisits: [],
  bySport: [],
}

function renderCard(props: Partial<Parameters<typeof GeoStatusCard>[0]> = {}) {
  return render(
    <MemoryRouter>
      <GeoStatusCard
        loading={false}
        status="granted"
        position={null}
        stats={emptyStats}
        visits={[]}
        onRetry={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
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
    renderCard({
      stats: { ...emptyStats, totalVisits: 3 },
      visits,
    })
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Recent visits')).toBeInTheDocument()
    expect(screen.getByText('42 m away')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/activity/v1')
    // Reverse-geocoded place label from the mocked hook.
    expect(screen.getByText('Zurich, ZH')).toBeInTheDocument()
  })
})
