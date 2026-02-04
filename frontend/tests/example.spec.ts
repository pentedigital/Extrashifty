import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('should display the landing page', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=ExtraShifty')).toBeVisible()
  })

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Sign in')
    await expect(page).toHaveURL('/login')
  })

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Get started')
    await expect(page).toHaveURL('/signup')
  })
})

test.describe('Authentication', () => {
  test('should show login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('should show signup form with role selection', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('text=Create your account')).toBeVisible()
    await expect(page.locator('text=Staff')).toBeVisible()
    await expect(page.locator('text=Company')).toBeVisible()
    await expect(page.locator('text=Agency')).toBeVisible()
  })
})
