import { Component, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * A rejected `import()` does not suspend, so `<Suspense>` cannot catch it. Every
 * push to main redeploys with fresh content-hashed chunk names, which turns the
 * first navigation in a tab left open across a deploy into a 404 — and without a
 * boundary React unmounts the whole tree and leaves a blank page.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error(error)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold text-slate-900">This page failed to load</p>
          <p className="text-sm text-slate-500">
            The app was probably updated since you opened this tab. Reloading picks up the new version.
          </p>
        </div>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </div>
    )
  }
}
