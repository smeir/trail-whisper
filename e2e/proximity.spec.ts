import { expect, test, type Page, type Route } from '@playwright/test'

// Derived the way supabase-js does it: `sb-${hostname.split('.')[0]}-auth-token`,
// against the stubbed VITE_SUPABASE_URL from playwright.config.ts.
const STORAGE_KEY = 'sb-test-auth-token'
const USER_ID = '11111111-1111-1111-1111-111111111111'

const ZURICH = { latitude: 47.3769, longitude: 8.5417 }

const ACTIVITY = {
  id: 'aaaaaaaa-0000-0000-0000-000000000001',
  sport: 'cycling',
  started_at: '2024-03-01T10:00:00Z',
  ended_at: '2024-03-01T11:00:00Z',
  total_distance_m: 20000,
  created_at: '2024-03-01T12:00:00Z',
}

function base64url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

/** Seed a session before any app code runs, so AuthGate resolves to signed in. */
async function signIn(page: Page) {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600
  const accessToken = [
    base64url({ alg: 'HS256', typ: 'JWT' }),
    base64url({ sub: USER_ID, aud: 'authenticated', role: 'authenticated', exp: expiresAt }),
    'stub-signature',
  ].join('.')

  const session = {
    access_token: accessToken,
    refresh_token: 'stub-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: expiresAt,
    user: {
      id: USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'rider@example.com',
      app_metadata: {},
      user_metadata: {},
      created_at: '2024-01-01T00:00:00Z',
    },
  }

  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify(session)] as const,
  )
}

/**
 * Records every PostgREST call and answers it, so the assertions can be about
 * which endpoint the app chose rather than about rendered rows.
 */
async function stubSupabase(page: Page) {
  const restCalls: string[] = []

  await page.route('**/auth/v1/**', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }),
  )

  await page.route('**/rest/v1/**', (route: Route) => {
    const request = route.request()
    restCalls.push(`${request.method()} ${request.url()}`)
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Content-Range': '0-0/1' },
      body: JSON.stringify([ACTIVITY]),
    })
  })

  return restCalls
}

test.describe('History proximity filter', () => {
  test.use({ permissions: ['geolocation'], geolocation: ZURICH })

  test('resolves "filter near me" through the RPC and never fetches track geometry', async ({ page }) => {
    await signIn(page)
    const restCalls = await stubSupabase(page)

    await page.goto('./#/history')
    await expect(page.getByRole('heading', { name: 'History' })).toBeVisible()

    await page.getByRole('button', { name: 'Filter near me' }).click()

    // The button flips to the active label once the filter is on.
    await expect(page.getByRole('button', { name: 'Filtering near me' })).toBeVisible()
    await expect.poll(() => restCalls.some((call) => call.includes('/rpc/find_activities_near'))).toBe(true)

    // The point of the rebuild: proximity is resolved in Postgres, so no request
    // may ask for track_geom just to measure it in the browser.
    expect(restCalls.filter((call) => call.includes('track_geom'))).toEqual([])
  })

  test('reports a failed query instead of an empty result', async ({ page }) => {
    await signIn(page)
    await page.route('**/auth/v1/**', (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }),
    )
    await page.route('**/rest/v1/**', (route: Route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'internal error' }),
      }),
    )

    await page.goto('./#/history')

    // "No activities found" here would present an outage as a confident answer.
    await expect(page.getByText(/could not load your workouts/i)).toBeVisible()
    await expect(page.getByText(/no activities found/i)).toHaveCount(0)
  })
})
