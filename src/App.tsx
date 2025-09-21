import { Navigate, Route, Routes } from 'react-router-dom'
import { Suspense } from 'react'

import { useAuth } from './providers/AuthProvider'
import { AppLayout } from './components/layout/AppLayout'
import Login from './routes/Login'
import Dashboard from './routes/Dashboard'
import Upload from './routes/Upload'
import History from './routes/History'
import ActivityDetail from './routes/ActivityDetail'
import Account from './routes/Account'

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-lg font-medium">Loading session…</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

function PublicOnlyRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-lg font-medium">Loading session…</div>
  }

  if (user) {
    return <Navigate to="/app" replace />
  }

  return children
}

const LoadingScreen = () => (
  <div className="flex h-full min-h-[50vh] items-center justify-center text-sm text-slate-500">Loading…</div>
)

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/"
          element={<Navigate to="/app" replace />}
        />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
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
  )
}
