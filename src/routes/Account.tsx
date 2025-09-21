import { LogOutIcon, MailIcon, UserIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/providers/AuthProvider'

export default function Account() {
  const { user, signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Account</h1>
        <p className="text-sm text-slate-600">Manage your profile and sign out of Trail Whisper.</p>
      </div>
      <Card>
        <CardHeader className="flex flex-col gap-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <UserIcon className="h-5 w-5 text-brand-500" /> Profile
          </CardTitle>
          <CardDescription>Trail Whisper stores all activities privately for your Supabase user.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
            <div className="flex items-center gap-3">
              <UserIcon className="h-5 w-5 text-slate-500" />
              <div>
                <p className="font-semibold text-slate-800">{user?.user_metadata?.full_name ?? user?.email}</p>
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <MailIcon className="h-4 w-4" /> {user?.email}
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" className="w-full gap-2" onClick={handleLogout}>
            <LogOutIcon className="h-4 w-4" /> Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
