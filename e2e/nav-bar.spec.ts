import { test, expect } from '@playwright/test'

// Clear nav bar state before each test so breakpoint defaults are predictable
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('ddo-nav-bar-expanded'))
})

// --- Icon position stability ---

test.describe('icon position stability', () => {
  test('nav bar position does not shift when toggling expand/collapse', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    const expandedBox = await page.locator('.app-nav-bar').boundingBox()
    expect(expandedBox).not.toBeNull()

    await page.click('.nav-bar-collapse-btn')
    await page.waitForTimeout(100)

    const collapsedBox = await page.locator('.app-nav-bar').boundingBox()
    expect(collapsedBox).not.toBeNull()

    // Nav bar should stay pinned at top-left
    expect(collapsedBox!.x).toBe(expandedBox!.x)
    expect(collapsedBox!.y).toBe(expandedBox!.y)
  })

  test('icons do not shift vertically when collapsing the nav bar', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await page.locator('.nav-bar-btn').first().waitFor()

    // Nav bar starts expanded (default stored pref removed, width >= 900)
    const expandedPositions = await getIconCenters(page)
    expect(expandedPositions.length).toBeGreaterThan(0)

    // Collapse
    await page.click('.nav-bar-collapse-btn')
    await page.waitForTimeout(100)

    const collapsedPositions = await getIconCenters(page)
    expect(collapsedPositions.length).toBe(expandedPositions.length)

    // Every icon's vertical center should be within 1px
    for (let i = 0; i < expandedPositions.length; i++) {
      expect(collapsedPositions[i].y).toBeCloseTo(expandedPositions[i].y, 0)
    }
  })

  test('icons do not shift horizontally when collapsing the nav bar', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    const expandedPositions = await getIconCenters(page)
    await page.click('.nav-bar-collapse-btn')
    await page.waitForTimeout(100)
    const collapsedPositions = await getIconCenters(page)

    for (let i = 0; i < expandedPositions.length; i++) {
      expect(collapsedPositions[i].x).toBeCloseTo(expandedPositions[i].x, 0)
    }
  })
})

// --- Responsive breakpoints ---

test.describe('responsive breakpoints', () => {
  test('nav bar is expanded by default at >= 900px', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    const navBar = page.locator('.app-nav-bar')
    await expect(navBar).toHaveClass(/expanded/)
    // Should show nav labels
    await expect(page.locator('.nav-bar-label').first()).toBeVisible()
  })

  test('nav bar auto-collapses at < 900px', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 800 })
    await page.goto('/')

    const navBar = page.locator('.app-nav-bar')
    await expect(navBar).not.toHaveClass(/expanded/)
  })

  test('nav bar collapses when resizing from wide to narrow', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await expect(page.locator('.app-nav-bar')).toHaveClass(/expanded/)

    // Resize below 900px
    await page.setViewportSize({ width: 800, height: 800 })
    await expect(page.locator('.app-nav-bar')).not.toHaveClass(/expanded/)
  })

  test('nav bar re-expands when resizing back above 900px', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await expect(page.locator('.app-nav-bar')).toHaveClass(/expanded/)

    // Collapse by crossing threshold
    await page.setViewportSize({ width: 800, height: 800 })
    await expect(page.locator('.app-nav-bar')).not.toHaveClass(/expanded/)

    // Cross back above 900
    await page.setViewportSize({ width: 1000, height: 800 })
    await expect(page.locator('.app-nav-bar')).toHaveClass(/expanded/)
  })

  test('expanded nav bar is full-screen at < 600px', async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 800 })
    await page.goto('/')

    // Nav bar starts expanded at <600 (default pref is true)
    await expect(page.locator('.app-nav-bar')).toHaveClass(/expanded/)

    // Nav bar should cover the full viewport (position: fixed, inset: 0)
    const box = await page.locator('.app-nav-bar').boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBe(0)
    expect(box!.y).toBe(0)
    expect(box!.width).toBe(500)
  })

  test('nav bar auto-closes on navigate at < 600px', async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 800 })
    await page.goto('/')

    // Nav bar starts expanded at <600
    await expect(page.locator('.app-nav-bar')).toHaveClass(/expanded/)

    // Click a nav item
    await page.getByRole('button', { name: 'Gear' }).click()

    // Nav bar should auto-close
    await expect(page.locator('.app-nav-bar')).not.toHaveClass(/expanded/)
  })

  test('nav bar does NOT auto-close on navigate at >= 600px', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await expect(page.locator('.app-nav-bar')).toHaveClass(/expanded/)

    await page.getByRole('button', { name: 'Gear' }).click()

    // Nav bar should stay expanded
    await expect(page.locator('.app-nav-bar')).toHaveClass(/expanded/)
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

  test('nav bar width is 220px when expanded', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    const box = await page.locator('.app-nav-bar').boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBe(220)
  })

  test('collapse button is visible at small viewport height', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 400 })
    await page.goto('/')

    const collapse = page.locator('.nav-bar-collapse-btn')
    await expect(collapse).toBeVisible()

    // Collapse button should be within the viewport
    const box = await collapse.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.y + box!.height).toBeLessThanOrEqual(400)
  })

  test('character card visible at small viewport height', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 400 })
    await page.goto('/')

    const card = page.locator('.nav-bar-character-card')
    const box = await card.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.height).toBeGreaterThan(50)
  })

  test('nav bar scrolls at small viewport height', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 400 })
    await page.goto('/')
    await page.locator('.nav-bar-btn').first().waitFor()

    // The scroll wrapper should have overflow (scrollHeight > clientHeight)
    const isScrollable = await page.evaluate(() => {
      const scroll = document.querySelector('.nav-bar-scroll')
      return scroll ? scroll.scrollHeight > scroll.clientHeight : false
    })
    expect(isScrollable).toBe(true)
  })

  test('nav bar width is 56px when collapsed', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 800 })
    await page.goto('/')

    const box = await page.locator('.app-nav-bar').boundingBox()
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

  test('clicking the card navigates to characters view', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    // Any click on the card routes to characters view
    await page.locator('.nav-bar-character-card').click()
    await expect(page).toHaveURL(/\/characters$/)
  })

  test('card shows active accent bar on characters view', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await page.locator('.nav-bar-character-card').click()

    const card = page.locator('.nav-bar-character-card')
    await expect(card).toHaveClass(/active/)

    // Active state should have a ::before accent bar spanning the card
    const beforeWidth = await card.evaluate(
      (el) => getComputedStyle(el, '::before').width,
    )
    expect(parseInt(beforeWidth)).toBe(3)
  })

  test('active nav items have accent indicator', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    // Build Plan parent + Level Plan sub-item are both active on build-plan view
    const activeBtns = page.locator('.nav-bar-btn.active')
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
    await page.locator('.nav-bar-btn').first().waitFor()

    const heights = await page.evaluate(() => {
      const compact = document.querySelector('.nav-bar-btn--compact')
      const regular = document.querySelector('.nav-bar-btn:not(.nav-bar-btn--compact)')
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
    await page.locator('.nav-bar-btn').first().waitFor()

    const opacity = await page.evaluate(() => {
      const icon = document.querySelector('.nav-bar-btn--compact:not(.active) svg')
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
    const group = page.locator('.nav-bar-group').first()
    await expect(group.locator('.nav-bar-group-label-text')).toContainText('Build Plan')
    await expect(group.locator('.nav-bar-btn').first()).toContainText('Build Plan')
  })

  test('character card icons do not shift when collapsing', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await page.locator('.nav-bar-character-card svg').first().waitFor()

    const getCardIconCenters = () =>
      page.evaluate(() => {
        // Character strip icon + both build slot icons
        const icons = document.querySelectorAll('.nav-bar-character-strip > svg, .nav-bar-character-slot > svg')
        return Array.from(icons).map((el) => {
          const rect = el.getBoundingClientRect()
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
        })
      })

    const expandedPositions = await getCardIconCenters()
    await page.click('.nav-bar-collapse-btn')
    await page.waitForTimeout(100)
    const collapsedPositions = await getCardIconCenters()

    expect(expandedPositions).toHaveLength(3)
    expect(collapsedPositions).toHaveLength(3)
    for (let i = 0; i < expandedPositions.length; i++) {
      expect(collapsedPositions[i].x).toBeCloseTo(expandedPositions[i].x, 0)
      expect(collapsedPositions[i].y).toBeCloseTo(expandedPositions[i].y, 0)
    }
  })

  test('swap button has border and background', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await page.locator('.nav-bar-character-swap-btn').waitFor()

    const styles = await page.evaluate(() => {
      const btn = document.querySelector('.nav-bar-character-swap-btn')
      if (!btn) return null
      const s = getComputedStyle(btn)
      return {
        borderWidth: s.borderTopWidth,
        hasBackground: s.backgroundColor !== 'rgba(0, 0, 0, 0)',
        width: btn.getBoundingClientRect().width,
        height: btn.getBoundingClientRect().height,
      }
    })

    expect(styles).not.toBeNull()
    expect(parseInt(styles!.borderWidth)).toBe(1)
    expect(styles!.hasBackground).toBe(true)
    expect(styles!.width).toBe(24)
    expect(styles!.height).toBe(24)
  })

  test('swap button icon does not shift when collapsing', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await page.locator('.nav-bar-character-swap-btn svg').waitFor()

    const expandedPos = await page.evaluate(() => {
      const icon = document.querySelector('.nav-bar-character-swap-btn svg')
      const rect = icon?.getBoundingClientRect()
      return rect ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : null
    })

    await page.click('.nav-bar-collapse-btn')
    await page.waitForTimeout(100)

    const collapsedPos = await page.evaluate(() => {
      const icon = document.querySelector('.nav-bar-character-swap-btn svg')
      const rect = icon?.getBoundingClientRect()
      return rect ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : null
    })

    expect(expandedPos).not.toBeNull()
    expect(collapsedPos).not.toBeNull()
    expect(collapsedPos!.x).toBeCloseTo(expandedPos!.x, 0)
    expect(collapsedPos!.y).toBeCloseTo(expandedPos!.y, 0)
  })

  test('character card icons align with nav icons when collapsed', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 800 })
    await page.goto('/')
    await page.locator('.nav-bar-btn').first().waitFor()

    const positions = await page.evaluate(() => {
      const navIcon = document.querySelector('.nav-bar-btn svg')
      const stripIcon = document.querySelector('.nav-bar-character-strip > svg')
      const slotIcon = document.querySelector('.nav-bar-character-slot > svg')
      const navRect = navIcon?.getBoundingClientRect()
      return {
        navX: navRect ? navRect.x + navRect.width / 2 : null,
        stripX: stripIcon ? stripIcon.getBoundingClientRect().x + stripIcon.getBoundingClientRect().width / 2 : null,
        slotX: slotIcon ? slotIcon.getBoundingClientRect().x + slotIcon.getBoundingClientRect().width / 2 : null,
      }
    })

    expect(positions.navX).not.toBeNull()
    // All card icons should align with nav icons (within 2px for border)
    expect(Math.abs(positions.stripX! - positions.navX!)).toBeLessThanOrEqual(2)
    expect(Math.abs(positions.slotX! - positions.navX!)).toBeLessThanOrEqual(2)
  })

  test('character card shows character name, build name, and race/class', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    await expect(page.locator('.nav-bar-character-card')).toBeVisible()
    // Character name lives in the strip
    await expect(page.locator('.nav-bar-character-strip-name')).toContainText('Thordak')
    // Build name + race/class live in the slot
    await expect(page.locator('.nav-bar-character-name').first()).toBeVisible()
    await expect(page.locator('.nav-bar-character-build').first()).toBeVisible()
  })
})

// --- Helpers ---

async function getIconCenters(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const icons = document.querySelectorAll('.app-nav-bar .nav-bar-character-strip > svg, .app-nav-bar .nav-bar-character-slot > svg, .app-nav-bar .nav-bar-btn svg, .app-nav-bar .nav-bar-collapse-btn svg')
    return Array.from(icons).map((el) => {
      const rect = el.getBoundingClientRect()
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    })
  })
}
