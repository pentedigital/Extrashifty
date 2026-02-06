import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the ExtraShifty branding', async ({ page }) => {
    // Logo component: <div class="flex items-center gap-2"><div class="...bg-brand-600...">E</div><span class="font-semibold">ExtraShifty</span></div>
    await expect(page.locator('span.font-semibold:text("ExtraShifty")')).toBeVisible()
  })

  test('should have a hero section with heading', async ({ page }) => {
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
  })

  test('should display call-to-action buttons', async ({ page }) => {
    await expect(page.locator('text=Sign in')).toBeVisible()
    await expect(page.locator('text=Get started')).toBeVisible()
  })

  test('should navigate to login page', async ({ page }) => {
    await page.click('text=Sign in')
    await expect(page).toHaveURL('/login')
  })

  test('should navigate to signup page', async ({ page }) => {
    await page.click('text=Get started')
    await expect(page).toHaveURL('/signup')
  })

  test('should have navigation links', async ({ page }) => {
    await expect(page.locator('a[href="/about"]')).toBeVisible()
    await expect(page.locator('a[href="/pricing"]')).toBeVisible()
  })

  test('should have footer with legal links', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    // Legal page routes are: /privacy, /terms, /cookies (not /legal/*)
    await expect(page.locator('a[href="/privacy"]')).toBeVisible()
    await expect(page.locator('a[href="/terms"]')).toBeVisible()
    await expect(page.locator('a[href="/cookies"]')).toBeVisible()
  })

  test('should be responsive across viewports', async ({ page }) => {
    // Logo component: <div class="flex items-center gap-2"><div class="...bg-brand-600...">E</div><span class="font-semibold">ExtraShifty</span></div>
    const logoSelector = 'span.font-semibold:text("ExtraShifty")'

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator(logoSelector)).toBeVisible()

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator(logoSelector)).toBeVisible()

    // Desktop
    await page.setViewportSize({ width: 1280, height: 720 })
    await expect(page.locator(logoSelector)).toBeVisible()
  })
})
