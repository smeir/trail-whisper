import { Navigate, Route, Routes } from 'react-router-dom'
import { Suspense } from 'react'

import { useAuth } from './providers/AuthProvider'
import { AppLayout } from './components/layout/AppLayout'
import { RouteErrorBoundary } from './components/layout/RouteErrorBoundary'
import Login from './routes/Login'
import { Account, ActivityDetail, Dashboard, History, Upload } from './routes/lazy'

function AuthGate({ require: requirement, children }: { require: 'user' | 'anon'; children: JSX.Element }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-lg font-medium">Loading session…</div>
  }

  if (requirement === 'user' && !user) {
    return <Navigate to="/login" replace />
  }

  if (requirement === 'anon' && user) {
    return <Navigate to="/app" replace />
  }

  return children
}

const LoadingScreen = () => (
  <div className="flex h-full min-h-[50vh] items-center justify-center text-sm text-slate-500">Loading…</div>
)

export default function App() {
  // The protected routes suspend inside AppLayout, which keeps the shell on screen
  // while a chunk loads; this outer boundary is the net for anything lazy that ends
  // up outside the layout. The error boundary wraps both — a chunk that 404s rejects
  // rather than suspends, and Suspense does not catch that.
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route
            path="/login"
            element={
              <AuthGate require="anon">
                <Login />
              </AuthGate>
            }
          />
          <Route
            path="/"
            element={<Navigate to="/app" replace />}
          />
          <Route
            element={
              <AuthGate require="user">
                <AppLayout />
              </AuthGate>
            }
          >
            <Route path="/app" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/history" element={<History />} />
            <Route path="/activity/:id" element={<ActivityDetail />} />
            <Route path="/account" element={<Account />} />
          </Route>
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  )
}
