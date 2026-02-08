import { useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { LogInIcon, UserPlusIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/providers/AuthProvider'
import { supabase } from '@/lib/supabase'

type Mode = 'signIn' | 'signUp'

export default function Login() {
  const { user, loading } = useAuth()
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement | null>(null)

  const storeCredentials = async () => {
    if (!formRef.current || typeof window === 'undefined') return
    const PasswordCredentialCtor = (
      window as Window & typeof globalThis & { PasswordCredential?: typeof PasswordCredential }
    ).PasswordCredential
    if (!PasswordCredentialCtor || !navigator.credentials) return

    try {
      const credential = new PasswordCredentialCtor(formRef.current)
      await navigator.credentials.store(credential)
    } catch {
      // Ignore unsupported or blocked credential storage.
    }
  }

  if (user && !loading) {
    return <Navigate to="/app" replace />
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)

    try {
      if (mode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        void storeCredentials()
        toast.success('Welcome back!')
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: import.meta.env.VITE_EMAIL_REDIRECT_URL
          }
        })
        if (error) throw error
        if (data.session) {
          void storeCredentials()
          toast.success('Account created successfully.')
        } else {
          toast.success('Check your inbox to confirm your email address.')
        }
      }
    } catch (error) {
      console.error(error)
      const message = error instanceof Error ? error.message : 'Unable to process the request.'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleMode = () => {
    setMode((current) => (current === 'signIn' ? 'signUp' : 'signIn'))
    setPassword('')
  }

  const isSignIn = mode === 'signIn'

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4">
      <Card className="w-full max-w-md border-0 shadow-xl shadow-brand-200/40">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-semibold text-slate-900">Trail Whisper</CardTitle>
          <CardDescription>
            {isSignIn ? 'Sign in with your email to sync your adventures.' : 'Create an account to start tracking your activities.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            autoComplete="on"
            method="post"
            className="space-y-5"
          >
            <div className="space-y-2 text-left">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                name="username"
                inputMode="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2 text-left">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                autoComplete={isSignIn ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter at least 6 characters"
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              {isSignIn ? <LogInIcon className="h-4 w-4" /> : <UserPlusIcon className="h-4 w-4" />}
              {submitting ? (isSignIn ? 'Signing in…' : 'Creating account…') : isSignIn ? 'Sign in' : 'Create account'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-600">
            {isSignIn ? 'Need an account?' : 'Already registered?'}{' '}
            <button type="button" onClick={toggleMode} className="font-medium text-brand-600 hover:text-brand-500">
              {isSignIn ? 'Create one' : 'Sign in instead'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
