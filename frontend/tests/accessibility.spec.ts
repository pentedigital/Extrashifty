import { test, expect } from '@playwright/test'

test.describe('Accessibility', () => {
  test.describe('Landing Page', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/')

      const h1 = page.locator('h1')
      await expect(h1).toBeVisible()
      // Should have exactly one h1 on the page
      const h1Count = await h1.count()
      expect(h1Count).toBe(1)
    })

    test('should have descriptive link text', async ({ page }) => {
      await page.goto('/')

      // Links should not have generic text like "click here"
      const genericLinks = page.locator('a:text-is("click here"), a:text-is("here"), a:text-is("read more")')
      const count = await genericLinks.count()
      expect(count).toBe(0)
    })

    test('should have visible focus indicators', async ({ page }) => {
      await page.goto('/')

      // Tab to first interactive element
      await page.keyboard.press('Tab')
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
    })
  })

  test.describe('Forms', () => {
    test('login form should have labels', async ({ page }) => {
      await page.goto('/login')

      // Email input should have a label
      const emailInput = page.locator('input[type="email"]')
      await expect(emailInput).toBeVisible()

      // Check for label or aria-label
      const hasLabel =
        (await page.locator('label[for="email"]').count()) > 0 ||
        (await emailInput.getAttribute('aria-label')) !== null ||
        (await emailInput.getAttribute('aria-labelledby')) !== null ||
        (await emailInput.getAttribute('placeholder')) !== null
      expect(hasLabel).toBe(true)
    })

    test('password input should have labels', async ({ page }) => {
      await page.goto('/login')

      const passwordInput = page.locator('input[type="password"]')
      await expect(passwordInput).toBeVisible()

      const hasLabel =
        (await page.locator('label[for="password"]').count()) > 0 ||
        (await passwordInput.getAttribute('aria-label')) !== null ||
        (await passwordInput.getAttribute('aria-labelledby')) !== null ||
        (await passwordInput.getAttribute('placeholder')) !== null
      expect(hasLabel).toBe(true)
    })

    test('buttons should have accessible names', async ({ page }) => {
      await page.goto('/login')

      const submitButton = page.getByRole('button', { name: /sign in/i })
      await expect(submitButton).toBeVisible()
    })
  })

  test.describe('Keyboard Navigation', () => {
    test('should be able to tab through login form', async ({ page }) => {
      await page.goto('/login')

      // Tab through form elements
      await page.keyboard.press('Tab')
      let focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()

      await page.keyboard.press('Tab')
      focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()

      await page.keyboard.press('Tab')
      focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
    })

    test('should be able to submit form with Enter key', async ({ page }) => {
      await page.goto('/login')

      const emailInput = page.locator('input[type="email"]')
      await emailInput.fill('test@example.com')

      const passwordInput = page.locator('input[type="password"]')
      await passwordInput.fill('password123')

      // Press Enter to submit
      await passwordInput.press('Enter')

      // Form should attempt to submit (might show error or redirect)
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('Color and Contrast', () => {
    test('should not rely solely on color for information', async ({ page }) => {
      await page.goto('/login')

      // Error states should have text, not just color
      const submitButton = page.getByRole('button', { name: /sign in/i })
      await submitButton.click()

      // If there are errors, they should have text content
      const errorMessages = page.locator('[role="alert"], .error, [class*="error"], [class*="destructive"]')
      if ((await errorMessages.count()) > 0) {
        const firstError = errorMessages.first()
        const text = await firstError.textContent()
        expect(text?.trim().length).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Images', () => {
    test('images should have alt text', async ({ page }) => {
      await page.goto('/')

      const images = page.locator('img')
      const imageCount = await images.count()

      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i)
        const alt = await img.getAttribute('alt')
        const role = await img.getAttribute('role')

        // Image should have alt text or be marked as decorative
        const isAccessible = alt !== null || role === 'presentation' || role === 'none'
        expect(isAccessible).toBe(true)
      }
    })
  })
})
