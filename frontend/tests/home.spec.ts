import { test, expect } from '@playwright/test'

test('home page loads', async ({ page }) => {
  // Collect console errors
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })
  page.on('pageerror', (err) => {
    errors.push(err.message)
  })

  await page.goto('/')

  // Check page loaded
  await expect(page).toHaveTitle(/Kick Me/)

  // Check main heading
  await expect(page.locator('h1')).toContainText('Kick Me')

  // Check input exists
  await expect(page.locator('input[placeholder*="address"]')).toBeVisible()

  // Log any errors
  if (errors.length > 0) {
    console.log('Console errors:', errors)
  }

  expect(errors.length).toBe(0)
})

test('address input works', async ({ page }) => {
  await page.goto('/')

  const input = page.locator('input')
  await input.fill('0x1CE18f6aE19E0151f6e78644FEa710b05225BEF5')

  // Should show checking or result
  await expect(page.locator('text=/clean|sign/i')).toBeVisible({ timeout: 10000 })
})

test('ENS resolution works', async ({ page }) => {
  await page.goto('/')

  const input = page.locator('input')
  await input.fill('snax.eth')

  // Should show resolving then resolved
  await expect(page.locator('text=/Resolving|Resolved/i')).toBeVisible({ timeout: 5000 })

  // Wait for resolution
  await expect(page.locator('text=/Resolved: snax.eth/i')).toBeVisible({ timeout: 15000 })

  // Should show result after resolution (specific to the result card)
  await expect(page.locator('text=This wallet is clean')).toBeVisible({ timeout: 10000 })
})
