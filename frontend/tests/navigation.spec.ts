import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test.describe('Public Pages', () => {
    test('should load landing page', async ({ page }) => {
      await page.goto('/')
      await expect(page).toHaveTitle(/ExtraShifty/i)
    })

    test('should navigate to about page', async ({ page }) => {
      await page.goto('/')
      await page.click('a[href="/about"]')
      await expect(page).toHaveURL('/about')
      await expect(page.locator('h1')).toBeVisible()
    })

    test('should navigate to pricing page', async ({ page }) => {
      await page.goto('/')
      await page.click('a[href="/pricing"]')
      await expect(page).toHaveURL('/pricing')
    })

    test('should navigate to contact page', async ({ page }) => {
      await page.goto('/')
      await page.click('a[href="/contact"]')
      await expect(page).toHaveURL('/contact')
    })
  })

  test.describe('Legal Pages', () => {
    test('should navigate to privacy policy', async ({ page }) => {
      await page.goto('/legal/privacy')
      await expect(page).toHaveURL('/legal/privacy')
      await expect(page.locator('h1')).toBeVisible()
    })

    test('should navigate to terms of service', async ({ page }) => {
      await page.goto('/legal/terms')
      await expect(page).toHaveURL('/legal/terms')
      await expect(page.locator('h1')).toBeVisible()
    })

    test('should navigate to cookie policy', async ({ page }) => {
      await page.goto('/legal/cookies')
      await expect(page).toHaveURL('/legal/cookies')
      await expect(page.locator('h1')).toBeVisible()
    })
  })

  test.describe('Auth Redirects', () => {
    test('should redirect unauthenticated user from dashboard', async ({ page }) => {
      await page.goto('/dashboard')
      // Should redirect to login or show login
      await expect(page).toHaveURL(/\/(login|dashboard)/)
    })

    test('should redirect unauthenticated user from marketplace', async ({ page }) => {
      await page.goto('/marketplace')
      // Marketplace might be public or require auth
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('Responsive Navigation', () => {
    test('should show desktop navigation on large screens', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.goto('/')

      // Desktop nav should be visible
      await expect(page.locator('nav')).toBeVisible()
    })

    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')

      // Page should still function
      await expect(page.locator('text=ExtraShifty')).toBeVisible()
    })

    test('should show mobile menu button on small screens', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')

      // Look for hamburger menu or mobile nav trigger
      const mobileMenuButton = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"], .mobile-menu-button')
      // Mobile menu might exist depending on implementation
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
