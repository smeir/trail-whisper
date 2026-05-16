import { defineConfig, devices } from '@playwright/test'

// The app is a HashRouter SPA served under the /trail-whisper/ base path.
// Supabase env vars are stubbed: without a session the app simply redirects
// to /login, so the smoke flow runs fully offline and deterministically.
const PORT = 5174
const BASE_URL = `http://localhost:${PORT}/trail-whisper/`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      VITE_EMAIL_REDIRECT_URL: BASE_URL,
    },
  },
})
