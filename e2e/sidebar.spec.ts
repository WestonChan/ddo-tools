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

    // Sidebar starts expanded at <600 (default pref is true)
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

    // Sidebar starts expanded at <600
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

  test('collapse button is visible at small viewport height', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 400 })
    await page.goto('/')

    const collapse = page.locator('.sidebar-collapse-btn')
    await expect(collapse).toBeVisible()

    // Collapse button should be within the viewport
    const box = await collapse.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.y + box!.height).toBeLessThanOrEqual(400)
  })

  test('character card visible at small viewport height', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 400 })
    await page.goto('/')

    const card = page.locator('.sidebar-character-card')
    const box = await card.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.height).toBeGreaterThan(50)
  })

  test('sidebar nav scrolls at small viewport height', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 400 })
    await page.goto('/')
    await page.locator('.sidebar-nav-btn').first().waitFor()

    // The scroll wrapper should have overflow (scrollHeight > clientHeight)
    const isScrollable = await page.evaluate(() => {
      const scroll = document.querySelector('.sidebar-scroll')
      return scroll ? scroll.scrollHeight > scroll.clientHeight : false
    })
    expect(isScrollable).toBe(true)
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

    await page.locator('.sidebar-character-card').click()
    await expect(page).toHaveURL(/\/characters$/)
  })

  test('active nav items have accent indicator', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    // Build Plan parent + Level Plan sub-item are both active on build-plan view
    const activeBtns = page.locator('.sidebar-nav-btn.active')
    await expect(activeBtns).toHaveCount(2)
    await expect(activeBtns.first()).toContainText('Build Plan')
    await expect(activeBtns.last()).toContainText('Level Plan')
  })
})

// --- Compact sub-items ---

test.describe('compact sub-items', () => {
  test('compact items are same height as regular items (prevents icon shift)', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await page.locator('.sidebar-nav-btn').first().waitFor()

    const heights = await page.evaluate(() => {
      const compact = document.querySelector('.sidebar-nav-btn--compact')
      const regular = document.querySelector('.sidebar-nav-btn:not(.sidebar-nav-btn--compact)')
      return {
        compact: compact?.getBoundingClientRect().height ?? 0,
        regular: regular?.getBoundingClientRect().height ?? 0,
      }
    })

    // Same height prevents vertical shift when toggling expand/collapse
    expect(heights.compact).toBe(40)
    expect(heights.regular).toBe(40)
  })

  test('compact items have muted styling', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await page.locator('.sidebar-nav-btn').first().waitFor()

    const opacity = await page.evaluate(() => {
      const icon = document.querySelector('.sidebar-nav-btn--compact:not(.active) svg')
      return icon ? getComputedStyle(icon).opacity : '1'
    })

    expect(parseFloat(opacity)).toBeLessThan(1)
  })
})

// --- Group hierarchy ---

test.describe('group hierarchy', () => {
  test('group parent button shows for build-plan group', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    // The group should have both a label and a parent nav button
    const group = page.locator('.sidebar-group').first()
    await expect(group.locator('.sidebar-group-label-text')).toContainText('Build Plan')
    await expect(group.locator('.sidebar-nav-btn').first()).toContainText('Build Plan')
  })

  test('character card icon Y does not shift when collapsing', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await page.locator('.sidebar-character-header svg').first().waitFor()

    const expandedPos = await page.evaluate(() => {
      const icon = document.querySelector('.sidebar-character-header svg:first-child')
      const rect = icon?.getBoundingClientRect()
      return rect ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : null
    })

    await page.click('.sidebar-collapse-btn')
    await page.waitForTimeout(100)

    const collapsedPos = await page.evaluate(() => {
      const icon = document.querySelector('.sidebar-character-header svg:first-child')
      const rect = icon?.getBoundingClientRect()
      return rect ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : null
    })

    expect(expandedPos).not.toBeNull()
    expect(collapsedPos).not.toBeNull()
    expect(collapsedPos!.y).toBeCloseTo(expandedPos!.y, 0)
  })

  test('character card icon aligns with nav icons when collapsed', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 800 })
    await page.goto('/')
    await page.locator('.sidebar-nav-btn').first().waitFor()

    const positions = await page.evaluate(() => {
      const cardIcon = document.querySelector('.sidebar-character-header svg:first-child')
      const navIcon = document.querySelector('.sidebar-nav-btn svg')
      const cardRect = cardIcon?.getBoundingClientRect()
      const navRect = navIcon?.getBoundingClientRect()
      return {
        cardX: cardRect ? cardRect.x + cardRect.width / 2 : null,
        navX: navRect ? navRect.x + navRect.width / 2 : null,
      }
    })

    expect(positions.cardX).not.toBeNull()
    expect(positions.navX).not.toBeNull()
    // Card icon should align with nav icons (within 2px for border)
    expect(Math.abs(positions.cardX! - positions.navX!)).toBeLessThanOrEqual(2)
  })

  test('character card shows name and build info', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    await expect(page.locator('.sidebar-character-card')).toBeVisible()
    await expect(page.locator('.sidebar-character-name')).toContainText('Thordak')
    await expect(page.locator('.sidebar-character-build').first()).toBeVisible()
  })
})

// --- Helpers ---

async function getIconCenters(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    // Character card icon has dedicated tests — exclude it here since it
    // intentionally shifts X when collapsing to align with nav icons.
    const icons = document.querySelectorAll('.app-sidebar .sidebar-nav-btn svg, .app-sidebar .sidebar-collapse-btn svg')
    return Array.from(icons).map((el) => {
      const rect = el.getBoundingClientRect()
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    })
  })
}
