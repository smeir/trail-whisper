import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }))
vi.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'u1' }, session: null, loading: false, signOut: vi.fn() }),
}))

import { FitDropzone } from './FitDropzone'

function renderDropzone() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <FitDropzone />
    </QueryClientProvider>,
  )
}

describe('FitDropzone', () => {
  it('renders the import card and drop area', () => {
    renderDropzone()
    expect(screen.getByText('Import FIT workouts')).toBeInTheDocument()
    expect(screen.getByText('Drag & drop your FIT files')).toBeInTheDocument()
  })

  it('does not show the upload queue until files are added', () => {
    renderDropzone()
    expect(screen.queryByText(/Ready to upload/)).not.toBeInTheDocument()
  })
})
