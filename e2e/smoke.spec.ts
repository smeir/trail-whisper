import { expect, test } from '@playwright/test'

test.describe('Trail Whisper smoke', () => {
  test('unauthenticated visitors land on the login screen', async ({ page }) => {
    await page.goto('./')

    // HashRouter: / -> /app -> ProtectedRoute -> redirect to /login
    await expect(page).toHaveURL(/#\/login$/)
    await expect(
      page.getByRole('heading', { name: 'Trail Whisper' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Sign in' }),
    ).toBeVisible()
  })

  test('a protected route redirects to login', async ({ page }) => {
    await page.goto('./#/history')
    await expect(page).toHaveURL(/#\/login$/)
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
  })

  test('users can switch to the sign-up form', async ({ page }) => {
    await page.goto('./#/login')
    await page.getByRole('button', { name: 'Create one' }).click()
    await expect(
      page.getByRole('button', { name: 'Create account' }),
    ).toBeVisible()
  })
})
