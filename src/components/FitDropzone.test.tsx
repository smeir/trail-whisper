import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }))
vi.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'u1' }, session: null, loading: false, signOut: vi.fn() }),
}))

import { FitDropzone } from './FitDropzone'
import { renderWithProviders } from '@/test/render'

function renderDropzone() {
  return renderWithProviders(<FitDropzone />)
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
