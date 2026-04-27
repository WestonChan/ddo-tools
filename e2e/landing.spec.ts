import { test, expect } from '@playwright/test'

// Reset nav bar state so layout assertions don't depend on prior runs.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('ddo-nav-bar-expanded'))
  await page.setViewportSize({ width: 1200, height: 800 })
})

test.describe('landing view structure', () => {
  test('renders hero, character card, patch notes, and DDO link', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('.landing-hero')).toBeVisible()
    await expect(page.locator('.landing-active-character')).toBeVisible()
    await expect(page.locator('.landing-patch-notes')).toBeVisible()
    await expect(page.locator('.landing-ddo-patch-notes')).toBeVisible()
  })

  test('hero shows the wordmark and tagline', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('.landing-hero-title')).toContainText('DDO Tools')
    await expect(page.locator('.landing-hero-tagline')).toContainText('Dungeons')
  })
})

test.describe('active character card', () => {
  test('shows the selected character name and server', async ({ page }) => {
    await page.goto('/')

    const card = page.locator('.landing-active-character')
    await expect(card).toContainText('Thordak')
    // Stub character is on Thrane; server is folded into the meta line.
    await expect(card).toContainText(/Thrane server/)
  })

  test('shows past-life category breakdown when stacks exist', async ({ page }) => {
    await page.goto('/')

    const card = page.locator('.landing-active-character')
    // Thordak's stub history has heroic, epic, and racial stacks; iconic is 0
    // and should be hidden.
    const labels = card.locator('.landing-stat-label')
    await expect(labels).not.toHaveCount(0)
    const text = await labels.allTextContents()
    expect(text.some((t) => /heroic/i.test(t))).toBe(true)
    expect(text.every((t) => !/iconic/i.test(t))).toBe(true)
  })

  test('"Open build plan" CTA navigates to /build-plan', async ({ page }) => {
    await page.goto('/')

    await page.locator('.landing-active-character .landing-cta').click()
    await expect(page).toHaveURL(/\/build-plan$/)
  })
})

test.describe('site patch notes', () => {
  test('shows three entries by default', async ({ page }) => {
    await page.goto('/')

    const entries = page.locator('.landing-patch-entry')
    await expect(entries).toHaveCount(3)
  })

  test('"Show older updates" toggle reveals the rest', async ({ page }) => {
    await page.goto('/')

    const toggle = page.locator('.landing-patch-toggle')
    await expect(toggle).toContainText(/Show \d+ older update/)

    await toggle.click()

    // After expansion, more than the initial 3 entries are visible.
    const entries = page.locator('.landing-patch-entry')
    expect(await entries.count()).toBeGreaterThan(3)
    await expect(toggle).toContainText('Show fewer updates')
  })

  test('toggle collapses again on second click', async ({ page }) => {
    await page.goto('/')

    const toggle = page.locator('.landing-patch-toggle')
    await toggle.click()
    await expect(toggle).toContainText('Show fewer updates')

    await toggle.click()
    await expect(toggle).toContainText(/Show \d+ older update/)
    await expect(page.locator('.landing-patch-entry')).toHaveCount(3)
  })

  test('renders dates in en-US Mon D, YYYY format', async ({ page }) => {
    await page.goto('/')

    const firstDate = page.locator('.landing-patch-date').first()
    await expect(firstDate).toHaveText(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/)
  })
})

test.describe('DDO patch notes card', () => {
  test('links to DDO Wiki Updates page in a new tab', async ({ page }) => {
    await page.goto('/')

    const anchor = page.locator('.landing-ddo-patch-notes a')
    await expect(anchor).toHaveAttribute('href', 'https://ddowiki.com/page/Updates')
    await expect(anchor).toHaveAttribute('target', '_blank')
    await expect(anchor).toHaveAttribute('rel', /noopener/)
  })
})

test.describe('nav brand integration', () => {
  test('visiting / marks the brand link active', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.nav-bar-brand')).toHaveClass(/active/)
  })

  test('navigating away clears the brand active state', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Gear' }).click()
    await expect(page.locator('.nav-bar-brand')).not.toHaveClass(/active/)
  })

  test('clicking the nav brand returns to landing', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Gear' }).click()
    await expect(page).toHaveURL(/\/gear$/)

    await page.locator('.nav-bar-brand').click()
    await expect(page.locator('.landing-hero')).toBeVisible()
  })
})
