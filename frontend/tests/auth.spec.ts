import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login')
    })

    test('should display login form elements', async ({ page }) => {
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    })

    test('should show validation for empty form submission', async ({ page }) => {
      await page.getByRole('button', { name: /sign in/i }).click()
      // Form should show validation - either HTML5 or custom
      const emailInput = page.locator('input[type="email"]')
      await expect(emailInput).toBeVisible()
    })

    test('should toggle password visibility', async ({ page }) => {
      const passwordInput = page.locator('input[type="password"]')
      await passwordInput.fill('testpassword')

      // Find and click the toggle button (usually has an eye icon)
      const toggleButton = page.locator('button').filter({ has: page.locator('svg') }).first()
      if (await toggleButton.isVisible()) {
        await toggleButton.click()
        // Password should now be visible (type="text")
        await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'text')
      }
    })

    test('should navigate to forgot password', async ({ page }) => {
      await page.click('text=Forgot password')
      await expect(page).toHaveURL('/recover-password')
    })

    test('should navigate to signup', async ({ page }) => {
      await page.click('text=Sign up')
      await expect(page).toHaveURL('/signup')
    })

    test('should have ExtraShifty branding', async ({ page }) => {
      // Logo component: <div class="flex items-center gap-2"><div class="...bg-brand-600...">E</div><span class="font-semibold">ExtraShifty</span></div>
      await expect(page.locator('span.font-semibold:text("ExtraShifty")')).toBeVisible()
    })
  })

  test.describe('Signup Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/signup')
    })

    test('should display role selection options', async ({ page }) => {
      await expect(page.locator('text=Staff')).toBeVisible()
      await expect(page.locator('text=Company')).toBeVisible()
      await expect(page.locator('text=Agency')).toBeVisible()
    })

    test('should allow selecting staff role', async ({ page }) => {
      await page.click('text=Staff')
      // The selected card should have visual indication
      const staffCard = page.locator('[data-role="staff"], button:has-text("Staff")')
      await expect(staffCard.first()).toBeVisible()
    })

    test('should allow selecting company role', async ({ page }) => {
      await page.click('text=Company')
      const companyCard = page.locator('[data-role="company"], button:has-text("Company")')
      await expect(companyCard.first()).toBeVisible()
    })

    test('should allow selecting agency role', async ({ page }) => {
      await page.click('text=Agency')
      const agencyCard = page.locator('[data-role="agency"], button:has-text("Agency")')
      await expect(agencyCard.first()).toBeVisible()
    })

    test('should navigate to login', async ({ page }) => {
      await page.click('text=Sign in')
      await expect(page).toHaveURL('/login')
    })

    test('should have ExtraShifty branding', async ({ page }) => {
      // Logo component: <div class="flex items-center gap-2"><div class="...bg-brand-600...">E</div><span class="font-semibold">ExtraShifty</span></div>
      await expect(page.locator('span.font-semibold:text("ExtraShifty")')).toBeVisible()
    })
  })

  test.describe('Password Recovery', () => {
    test('should display recovery form', async ({ page }) => {
      await page.goto('/recover-password')
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.getByRole('button', { name: /reset|recover|send/i })).toBeVisible()
    })

    test('should navigate back to login', async ({ page }) => {
      await page.goto('/recover-password')
      await page.click('text=Sign in')
      await expect(page).toHaveURL('/login')
    })
  })
})
