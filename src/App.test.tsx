import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Stub leaf routes so this exercises only the routing + auth-gate logic
// (ProtectedRoute / PublicOnlyRoute) — the part most affected by a
// react-router-dom major upgrade.
vi.mock('./routes/Login', () => ({ default: () => <div>Login Page</div> }))
vi.mock('./routes/Dashboard', () => ({ default: () => <div>Dashboard Page</div> }))
vi.mock('./routes/Upload', () => ({ default: () => <div>Upload Page</div> }))
vi.mock('./routes/History', () => ({ default: () => <div>History Page</div> }))
vi.mock('./routes/ActivityDetail', () => ({ default: () => <div>Detail Page</div> }))
vi.mock('./routes/Account', () => ({ default: () => <div>Account Page</div> }))
vi.mock('./components/layout/AppLayout', async () => {
  const { Outlet } = await import('react-router-dom')
  return {
    AppLayout: () => (
      <div>
        App Layout
        <Outlet />
      </div>
    ),
  }
})

const useAuthMock = vi.fn()
vi.mock('./providers/AuthProvider', () => ({
  useAuth: () => useAuthMock(),
}))

import App from './App'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

afterEach(() => useAuthMock.mockReset())

describe('App routing & auth gates', () => {
  it('shows a loading screen while the session resolves', () => {
    useAuthMock.mockReturnValue({ user: null, loading: true })
    renderAt('/app')
    expect(screen.getByText('Loading session…')).toBeInTheDocument()
  })

  it('redirects unauthenticated users from a protected route to login', () => {
    useAuthMock.mockReturnValue({ user: null, loading: false })
    renderAt('/app')
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('App Layout')).not.toBeInTheDocument()
  })

  it('renders the protected layout for an authenticated user', () => {
    useAuthMock.mockReturnValue({ user: { id: 'u1' }, loading: false })
    renderAt('/app')
    expect(screen.getByText('App Layout')).toBeInTheDocument()
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
  })

  it('keeps authenticated users away from the public-only login route', () => {
    useAuthMock.mockReturnValue({ user: { id: 'u1' }, loading: false })
    renderAt('/login')
    expect(screen.getByText('App Layout')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })

  it('redirects unknown paths to the app', () => {
    useAuthMock.mockReturnValue({ user: { id: 'u1' }, loading: false })
    renderAt('/does-not-exist')
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
  })
})
