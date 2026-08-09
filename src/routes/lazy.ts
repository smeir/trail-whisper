import { lazy } from 'react'

// Login is the first paint for a signed-out visitor, so it stays eager. The rest
// — including maplibre and the FIT parser — load on demand instead of blocking
// the initial bundle.
const importDashboard = () => import('./Dashboard')
const importUpload = () => import('./Upload')
const importHistory = () => import('./History')
const importActivityDetail = () => import('./ActivityDetail')
const importAccount = () => import('./Account')

export const Dashboard = lazy(importDashboard)
export const Upload = lazy(importUpload)
export const History = lazy(importHistory)
export const ActivityDetail = lazy(importActivityDetail)
export const Account = lazy(importAccount)

/**
 * react-router updates the location inside `startTransition`, so a route that
 * suspends on navigation renders no fallback — React keeps the previous page on
 * screen instead, with no indication that anything is loading. Warming the chunks
 * once the shell is up keeps that wait near zero, which beats a spinner the
 * transition would never show anyway.
 */
export function prefetchRoutes() {
  void importDashboard()
  void importUpload()
  void importHistory()
  void importActivityDetail()
  void importAccount()
}
