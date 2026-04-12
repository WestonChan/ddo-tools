import { test, expect } from '@playwright/test'

// Clear sidebar state before each test so breakpoint defaults are predictable
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('ddo-sidebar-expanded'))
})

// --- Icon position stability ---

test.describe('icon position stability', () => {
  test('sidebar position does not shift when toggling expand/collapse', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    const expandedBox = await page.locator('.app-sidebar').boundingBox()
    expect(expandedBox).not.toBeNull()

    await page.click('.sidebar-collapse-btn')
    await page.waitForTimeout(100)

    const collapsedBox = await page.locator('.app-sidebar').boundingBox()
    expect(collapsedBox).not.toBeNull()

    // Sidebar should stay pinned at top-left
    expect(collapsedBox!.x).toBe(expandedBox!.x)
    expect(collapsedBox!.y).toBe(expandedBox!.y)
  })

  test('icons do not shift vertically when collapsing the sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await page.locator('.sidebar-nav-btn').first().waitFor()

    // Sidebar starts expanded (default stored pref removed, width >= 900)
    const expandedPositions = await getIconCenters(page)
    expect(expandedPositions.length).toBeGreaterThan(0)

    // Collapse
    await page.click('.sidebar-collapse-btn')
    await page.waitForTimeout(100)

    const collapsedPositions = await getIconCenters(page)
    expect(collapsedPositions.length).toBe(expandedPositions.length)

    // Every icon's vertical center should be within 1px
    for (let i = 0; i < expandedPositions.length; i++) {
      expect(collapsedPositions[i].y).toBeCloseTo(expandedPositions[i].y, 0)
    }
  })

  test('icons do not shift horizontally when collapsing the sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    const expandedPositions = await getIconCenters(page)
    await page.click('.sidebar-collapse-btn')
    await page.waitForTimeout(100)
    const collapsedPositions = await getIconCenters(page)

    for (let i = 0; i < expandedPositions.length; i++) {
      expect(collapsedPositions[i].x).toBeCloseTo(expandedPositions[i].x, 0)
    }
  })
})

// --- Responsive breakpoints ---

test.describe('responsive breakpoints', () => {
  test('sidebar is expanded by default at >= 900px', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    const sidebar = page.locator('.app-sidebar')
    await expect(sidebar).toHaveClass(/expanded/)
    // Should show nav labels
    await expect(page.locator('.sidebar-nav-label').first()).toBeVisible()
  })

  test('sidebar auto-collapses at < 900px', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 800 })
    await page.goto('/')

    const sidebar = page.locator('.app-sidebar')
    await expect(sidebar).not.toHaveClass(/expanded/)
  })

  test('sidebar collapses when resizing from wide to narrow', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await expect(page.locator('.app-sidebar')).toHaveClass(/expanded/)

    // Resize below 900px
    await page.setViewportSize({ width: 800, height: 800 })
    await expect(page.locator('.app-sidebar')).not.toHaveClass(/expanded/)
  })

  test('sidebar re-expands when resizing back above 900px', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await expect(page.locator('.app-sidebar')).toHaveClass(/expanded/)

    // Collapse by crossing threshold
    await page.setViewportSize({ width: 800, height: 800 })
    await expect(page.locator('.app-sidebar')).not.toHaveClass(/expanded/)

    // Cross back above 900
    await page.setViewportSize({ width: 1000, height: 800 })
    await expect(page.locator('.app-sidebar')).toHaveClass(/expanded/)
  })

  test('expanded sidebar is full-screen at < 600px', async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 800 })
    await page.goto('/')

    // Expand the sidebar
    await page.click('.sidebar-collapse-btn')
    await expect(page.locator('.app-sidebar')).toHaveClass(/expanded/)

    // Sidebar should cover the full viewport (position: fixed, inset: 0)
    const box = await page.locator('.app-sidebar').boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBe(0)
    expect(box!.y).toBe(0)
    expect(box!.width).toBe(500)
  })

  test('sidebar auto-closes on navigate at < 600px', async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 800 })
    await page.goto('/')

    // Expand
    await page.click('.sidebar-collapse-btn')
    await expect(page.locator('.app-sidebar')).toHaveClass(/expanded/)

    // Click a nav item
    await page.getByRole('button', { name: 'Gear' }).click()

    // Sidebar should auto-close
    await expect(page.locator('.app-sidebar')).not.toHaveClass(/expanded/)
  })

  test('sidebar does NOT auto-close on navigate at >= 600px', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await expect(page.locator('.app-sidebar')).toHaveClass(/expanded/)

    await page.getByRole('button', { name: 'Gear' }).click()

    // Sidebar should stay expanded
    await expect(page.locator('.app-sidebar')).toHaveClass(/expanded/)
  })
})

// --- Layout ---

test.describe('layout', () => {
  test('bottom bar is always at viewport bottom', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    const bottomBar = page.locator('.bottom-bar')
    const box = await bottomBar.boundingBox()
    expect(box).not.toBeNull()
    // Bottom edge should be at or near viewport bottom
    expect(box!.y + box!.height).toBeCloseTo(800, -1)
  })

  test('stats panel visible on build-plan view', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    await expect(page.locator('.side-panel')).toBeVisible()
  })

  test('stats panel hidden on non-build-plan views', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    await page.getByRole('button', { name: 'Gear' }).click()
    await expect(page.locator('.side-panel')).not.toBeVisible()
  })

  test('sidebar width is 220px when expanded', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    const box = await page.locator('.app-sidebar').boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBe(220)
  })

  test('sidebar width is 56px when collapsed', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 800 })
    await page.goto('/')

    const box = await page.locator('.app-sidebar').boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBe(56)
  })
})

// --- Navigation ---

test.describe('navigation', () => {
  test('clicking nav items changes the active view', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    await page.getByRole('button', { name: 'Gear' }).click()
    await expect(page).toHaveURL(/\/gear$/)
    await expect(page.locator('.app-content')).toContainText('Gear Planner')

    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page).toHaveURL(/\/settings$/)
  })

  test('clicking character name navigates to characters view', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    await page.locator('.sidebar-build-row').click()
    await expect(page).toHaveURL(/\/characters$/)
  })

  test('active nav item has accent indicator', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    // Level Plan should be active (first item matching build-plan view)
    const activeBtn = page.locator('.sidebar-nav-btn.active')
    await expect(activeBtn).toHaveCount(1)
    await expect(activeBtn).toContainText('Level Plan')
  })
})

// --- Helpers ---

async function getIconCenters(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const icons = document.querySelectorAll('.app-sidebar .sidebar-nav-btn svg, .app-sidebar .sidebar-build-row svg, .app-sidebar .sidebar-collapse-btn svg')
    return Array.from(icons).map((el) => {
      const rect = el.getBoundingClientRect()
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    })
  })
}
