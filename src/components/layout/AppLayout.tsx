import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {  HistoryIcon, MapPinIcon, UploadCloudIcon, UserCircleIcon, SignpostBig} from 'lucide-react'

import { cn } from '@/lib/utils'

const navItems = [
    {to: '/app', label: 'Dashboard', icon: MapPinIcon},
    {to: '/history', label: 'History', icon: HistoryIcon},
    {to: '/upload', label: 'Upload', icon: UploadCloudIcon},
    {to: '/account', label: 'Account', icon: UserCircleIcon},
]

export function AppLayout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/app" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <SignpostBig className="h-6 w-6 text-brand-500" /> Trail Whisper
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition',
                    isActive ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:text-slate-900',
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
        <Outlet />
      </main>
      <nav className="sticky bottom-0 z-40 border-t border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="grid grid-cols-4 gap-2 text-xs">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-medium transition',
                  isActive ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:text-slate-900',
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
