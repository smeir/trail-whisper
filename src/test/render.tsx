import type { ReactElement, ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

interface Options {
  route?: string
}

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

/** Renders a component inside the provider stack the app supplies at runtime. */
export function renderWithProviders(ui: ReactElement, { route = '/' }: Options = {}) {
  const client = createClient()
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Wrapper for `renderHook`, so hook specs share the stack rather than rebuild it. */
export function createQueryWrapper() {
  const client = createClient()
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}
