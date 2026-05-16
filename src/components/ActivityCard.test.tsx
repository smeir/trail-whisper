import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

// ActivityMap renders a maplibre-gl map (WebGL) which jsdom cannot run.
vi.mock('@/components/maps/ActivityMap', () => ({
  ActivityMap: () => <div data-testid="activity-map" />,
}))

import { ActivityCard } from './ActivityCard'
import type { Activity } from '@/lib/types'

const activity: Activity = {
  id: 'abc-123',
  sport: 'running',
  started_at: '2024-01-02T13:45:00',
  ended_at: '2024-01-02T14:30:00',
  total_distance_m: 5400,
  track_geom: { type: 'LineString', coordinates: [[8, 47], [8.5, 47.5], [9, 48]] },
  created_at: '2024-01-02T15:00:00',
}

function renderCard(a: Activity = activity) {
  return render(
    <MemoryRouter>
      <ActivityCard activity={a} />
    </MemoryRouter>,
  )
}

describe('ActivityCard', () => {
  it('renders sport, distance and formatted start date', () => {
    renderCard()
    expect(screen.getByText('running')).toBeInTheDocument()
    expect(screen.getByText('5.4 km')).toBeInTheDocument()
    expect(screen.getByText('Jan 2, 2024 13:45')).toBeInTheDocument()
  })

  it('shows the start coordinates and links to the detail page', () => {
    renderCard()
    expect(screen.getByText('Start: 47.0000, 8.0000')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View details' })).toHaveAttribute(
      'href',
      '/activity/abc-123',
    )
  })

  it('omits the start line when there is no track', () => {
    renderCard({ ...activity, track_geom: null })
    expect(screen.queryByText(/^Start:/)).not.toBeInTheDocument()
  })
})
