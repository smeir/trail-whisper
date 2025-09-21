import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { LogInIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/providers/AuthProvider'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const { user, loading } = useAuth()
  const [signingIn, setSigningIn] = useState(false)

  if (user && !loading) {
    return <Navigate to="/app" replace />
  }

  const handleSignIn = async () => {
    setSigningIn(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
      if (error) throw error
    } catch (error: any) {
      console.error(error)
      toast.error(error.message ?? 'Failed to start Google sign-in')
      setSigningIn(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4">
      <Card className="w-full max-w-md border-0 shadow-xl shadow-brand-200/40">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-semibold text-slate-900">Trail Whisper</CardTitle>
          <CardDescription>
            Sign in with Google to sync your adventures, check nearby history, and upload new FIT workouts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSignIn} className="w-full gap-2" disabled={signingIn}>
            <LogInIcon className="h-4 w-4" /> {signingIn ? 'Redirecting…' : 'Sign in with Google'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
