import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('ddo-nav-bar-expanded'))
  await page.setViewportSize({ width: 1200, height: 800 })
})

test.describe('landing view structure', () => {
  test('renders the wordmark, entry tiles, patch notes, and DDO link', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('.landing-wordmark')).toHaveText(/DDO Tools/i)
    await expect(page.locator('.landing-tagline')).toContainText('Dungeons')
    await expect(page.locator('.landing-tile')).toHaveCount(4)
    await expect(page.locator('.landing-patch-notes')).toBeVisible()
    await expect(page.locator('.landing-ddo-patch-notes')).toBeVisible()
  })
})

test.describe('entry tiles', () => {
  test('Characters tile summarizes the selected character', async ({ page }) => {
    await page.goto('/')

    const charactersTile = page.locator('.landing-tile', { hasText: 'Characters & builds' })
    await expect(charactersTile).toContainText('Thordak')
    await expect(charactersTile).toContainText(/Eladrin Chaosmancer · \d+ past lives/)
  })

  test('Build plan tile navigates to /build-plan', async ({ page }) => {
    await page.goto('/')

    await page.locator('.landing-tile', { hasText: 'Build plan' }).click()
    await expect(page).toHaveURL(/\/build-plan(#levels)?$/)
  })
})

test.describe('site patch notes', () => {
  test('shows three entries by default', async ({ page }) => {
    await page.goto('/')

    const patchNotes = page.locator('.landing-patch-entry')
    await expect(patchNotes).toHaveCount(3)
  })

  test('"Show older updates" toggle reveals the rest', async ({ page }) => {
    await page.goto('/')

    const olderUpdatesToggle = page.locator('.landing-patch-toggle')
    await expect(olderUpdatesToggle).toContainText(/Show \d+ older update/)

    await olderUpdatesToggle.click()

    const patchNotes = page.locator('.landing-patch-entry')
    expect(await patchNotes.count()).toBeGreaterThan(3)
    await expect(olderUpdatesToggle).toContainText('Show fewer updates')
  })

  test('toggle collapses again on second click', async ({ page }) => {
    await page.goto('/')

    const olderUpdatesToggle = page.locator('.landing-patch-toggle')
    await olderUpdatesToggle.click()
    await expect(olderUpdatesToggle).toContainText('Show fewer updates')

    await olderUpdatesToggle.click()
    await expect(olderUpdatesToggle).toContainText(/Show \d+ older update/)
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

    const wikiUpdatesLink = page.locator('.landing-ddo-patch-notes a')
    await expect(wikiUpdatesLink).toHaveAttribute('href', 'https://ddowiki.com/page/Updates')
    await expect(wikiUpdatesLink).toHaveAttribute('target', '_blank')
    await expect(wikiUpdatesLink).toHaveAttribute('rel', /noopener/)
  })
})

test.describe('nav brand integration', () => {
  test('visiting / marks the brand link active', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.nav-bar-brand')).toHaveClass(/active/)
  })

  test('navigating away clears the brand active state', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Gear', exact: true }).click()
    await expect(page.locator('.nav-bar-brand')).not.toHaveClass(/active/)
  })

  test('clicking the nav brand returns to landing', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Gear', exact: true }).click()
    await expect(page).toHaveURL(/\/gear$/)

    await page.locator('.nav-bar-brand').click()
    await expect(page.locator('.landing-wordmark')).toBeVisible()
  })
})
