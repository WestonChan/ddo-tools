import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('ddo-nav-bar-expanded'))
})

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

    expect(collapsedBox!.x).toBe(expandedBox!.x)
    expect(collapsedBox!.y).toBe(expandedBox!.y)
  })

  test('icons do not shift when collapsing the nav bar', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await page.locator('.nav-bar-btn').first().waitFor()

    const expandedIconCenters = await navBarIconCenters(page)
    expect(expandedIconCenters.length).toBeGreaterThan(0)

    await page.click('.nav-bar-collapse-btn')
    await page.waitForTimeout(100)

    const collapsedIconCenters = await navBarIconCenters(page)
    expect(collapsedIconCenters.length).toBe(expandedIconCenters.length)

    for (let i = 0; i < expandedIconCenters.length; i++) {
      expect(collapsedIconCenters[i].x).toBe(expandedIconCenters[i].x)
      expect(collapsedIconCenters[i].y).toBe(expandedIconCenters[i].y)
    }
  })
})

test.describe('responsive breakpoints', () => {
  test('nav bar is expanded by default at >= 900px', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    const navBar = page.locator('.app-nav-bar')
    await expect(navBar).toHaveClass(/expanded/)
    await expect(page.locator('.nav-bar-label').first()).toBeVisible()
  })

  test('nav bar auto-collapses at < 900px', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 800 })
    await page.goto('/')

    const navBar = page.locator('.app-nav-bar')
    await expect(navBar).not.toHaveClass(/expanded/)
  })

  test('nav bar re-expands when resizing back above 900px', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await expect(page.locator('.app-nav-bar')).toHaveClass(/expanded/)

    await page.setViewportSize({ width: 800, height: 800 })
    await expect(page.locator('.app-nav-bar')).not.toHaveClass(/expanded/)

    await page.setViewportSize({ width: 1000, height: 800 })
    await expect(page.locator('.app-nav-bar')).toHaveClass(/expanded/)
  })

  test('manually collapsed nav bar stays collapsed after resize cycle', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await expect(page.locator('.app-nav-bar')).toHaveClass(/expanded/)

    await page.click('.nav-bar-collapse-btn')
    await expect(page.locator('.app-nav-bar')).not.toHaveClass(/expanded/)

    await page.setViewportSize({ width: 800, height: 800 })
    await expect(page.locator('.app-nav-bar')).not.toHaveClass(/expanded/)

    await page.setViewportSize({ width: 1000, height: 800 })
    await expect(page.locator('.app-nav-bar')).not.toHaveClass(/expanded/)
  })

  test('expanded nav bar is full-screen at < 600px', async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 800 })
    await page.goto('/')

    await expect(page.locator('.app-nav-bar')).not.toHaveClass(/expanded/)
    await page.click('.nav-bar-collapse-btn')
    await expect(page.locator('.app-nav-bar')).toHaveClass(/expanded/)

    const box = await page.locator('.app-nav-bar').boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBe(0)
    expect(box!.y).toBe(0)
    expect(box!.width).toBe(500)
  })

  test('nav bar auto-closes on navigate at < 600px', async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 800 })
    await page.goto('/')

    await page.click('.nav-bar-collapse-btn')
    await expect(page.locator('.app-nav-bar')).toHaveClass(/expanded/)

    await page.getByRole('link', { name: 'Gear' }).click()

    await expect(page.locator('.app-nav-bar')).not.toHaveClass(/expanded/)
  })

  test('nav bar does NOT auto-close on navigate at >= 600px', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await expect(page.locator('.app-nav-bar')).toHaveClass(/expanded/)

    await page.getByRole('link', { name: 'Gear' }).click()

    await expect(page.locator('.app-nav-bar')).toHaveClass(/expanded/)
  })
})

test.describe('layout', () => {
  test('bottom bar is always at viewport bottom', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    const bottomBar = page.locator('.bottom-bar')
    const box = await bottomBar.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.y + box!.height).toBeCloseTo(800, -1)
  })

  test('stats panel visible on build-plan view', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    await page.getByRole('link', { name: 'Build Plan', exact: true }).click()
    await expect(page.locator('.side-panel')).toBeVisible()
  })

  test('stats panel hidden on non-build-plan views', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    await page.getByRole('link', { name: 'Build Plan', exact: true }).click()
    await expect(page.locator('.side-panel')).toBeVisible()
    await page.getByRole('link', { name: 'Gear' }).click()
    await expect(page.locator('.side-panel')).not.toBeVisible()
  })

  test('nav bar width is 220px when expanded', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    const box = await page.locator('.app-nav-bar').boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBe(220)
  })

  test('nav bar handles small viewport height', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 400 })
    await page.goto('/')
    await page.locator('.nav-bar-btn').first().waitFor()

    const collapseButton = page.locator('.nav-bar-collapse-btn')
    await expect(collapseButton).toBeVisible()
    const collapseButtonBox = await collapseButton.boundingBox()
    expect(collapseButtonBox).not.toBeNull()
    expect(collapseButtonBox!.y + collapseButtonBox!.height).toBeLessThanOrEqual(400)

    const card = page.locator('.nav-bar-character-card')
    const cardBox = await card.boundingBox()
    expect(cardBox).not.toBeNull()
    expect(cardBox!.height).toBeGreaterThan(50)

    const isScrollable = await page.evaluate(() => {
      const scrollContainer = document.querySelector('.nav-bar-scroll')
      return scrollContainer ? scrollContainer.scrollHeight > scrollContainer.clientHeight : false
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

test.describe('navigation', () => {
  test('clicking nav items changes the active view', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    await page.getByRole('link', { name: 'Gear' }).click()
    await expect(page).toHaveURL(/\/gear$/)
    await expect(page.locator('.app-content')).toContainText('Gear Planner')

    await page.getByRole('link', { name: 'Settings' }).click()
    await expect(page).toHaveURL(/\/settings$/)
  })

  test('clicking the card navigates to characters view with accent bar', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    await page.locator('.nav-bar-character-card').click()
    await expect(page).toHaveURL(/\/characters$/)

    const card = page.locator('.nav-bar-character-card')
    await expect(card).toHaveClass(/active/)

    const accentBarWidth = await card.evaluate((el) => getComputedStyle(el, '::before').width)
    expect(parseInt(accentBarWidth)).toBe(3)
  })

  test('active nav items have accent indicator', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    await page.getByRole('link', { name: 'Build Plan', exact: true }).click()

    const activeNavBarButtons = page.locator('.nav-bar-btn.active')
    await expect(activeNavBarButtons).toHaveCount(2)
    await expect(activeNavBarButtons.first()).toContainText('Build Plan')
    await expect(activeNavBarButtons.last()).toContainText('Level Plan')
  })
})

test.describe('compact sub-items', () => {
  test('compact items are same height as regular items (prevents icon shift)', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await page.locator('.nav-bar-btn').first().waitFor()

    const buttonHeights = await page.evaluate(() => {
      const compact = document.querySelector('.nav-bar-btn--compact')
      const regular = document.querySelector('.nav-bar-btn:not(.nav-bar-btn--compact)')
      return {
        compact: compact?.getBoundingClientRect().height ?? 0,
        regular: regular?.getBoundingClientRect().height ?? 0,
      }
    })

    expect(buttonHeights.compact).toBe(40)
    expect(buttonHeights.regular).toBe(40)
  })

  test('compact items have muted styling', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await page.locator('.nav-bar-btn').first().waitFor()

    const compactIconOpacity = await page.evaluate(() => {
      const icon = document.querySelector('.nav-bar-btn--compact:not(.active) svg')
      return icon ? getComputedStyle(icon).opacity : '1'
    })

    expect(parseFloat(compactIconOpacity)).toBeLessThan(1)
  })
})

test.describe('group hierarchy', () => {
  test('group parent button shows for build-plan group', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    const buildPlanGroup = page.locator('.nav-bar-group').first()
    await expect(buildPlanGroup.locator('.nav-bar-group-label-text')).toContainText('Build Plan')
    await expect(buildPlanGroup.locator('.nav-bar-btn').first()).toContainText('Build Plan')
  })

  test('swap button has border and background', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await page.locator('.nav-bar-character-swap-btn').waitFor()

    const swapButtonStyles = await page.evaluate(() => {
      const swapButton = document.querySelector('.nav-bar-character-swap-btn')
      if (!swapButton) return null
      const computedStyle = getComputedStyle(swapButton)
      return {
        borderTopWidth: computedStyle.borderTopWidth,
        hasBackground: computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)',
        width: swapButton.getBoundingClientRect().width,
        height: swapButton.getBoundingClientRect().height,
      }
    })

    expect(swapButtonStyles).not.toBeNull()
    expect(parseInt(swapButtonStyles!.borderTopWidth)).toBe(1)
    expect(swapButtonStyles!.hasBackground).toBe(true)
    expect(swapButtonStyles!.width).toBe(24)
    expect(swapButtonStyles!.height).toBe(24)
  })

  test('character card icons align with nav icons when collapsed', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 800 })
    await page.goto('/')
    await page.locator('.nav-bar-btn').first().waitFor()

    const iconCenterXs = await page.evaluate(() => {
      const navIcon = document.querySelector('.nav-bar-btn svg')
      const stripIcon = document.querySelector('.nav-bar-character-strip > svg')
      const slotIcon = document.querySelector('.nav-bar-character-slot > svg')
      const navRect = navIcon?.getBoundingClientRect()
      return {
        navIconCenterX: navRect ? navRect.x + navRect.width / 2 : null,
        stripIconCenterX: stripIcon
          ? stripIcon.getBoundingClientRect().x + stripIcon.getBoundingClientRect().width / 2
          : null,
        buildSummaryIconCenterX: slotIcon
          ? slotIcon.getBoundingClientRect().x + slotIcon.getBoundingClientRect().width / 2
          : null,
      }
    })

    expect(iconCenterXs.navIconCenterX).not.toBeNull()
    expect(
      Math.abs(iconCenterXs.stripIconCenterX! - iconCenterXs.navIconCenterX!),
    ).toBeLessThanOrEqual(2)
    expect(
      Math.abs(iconCenterXs.buildSummaryIconCenterX! - iconCenterXs.navIconCenterX!),
    ).toBeLessThanOrEqual(2)
  })

  test('character card shows character name, build name, and race/class', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    await expect(page.locator('.nav-bar-character-card')).toBeVisible()
    await expect(page.locator('.nav-bar-character-strip-name')).toContainText('Thordak')
    await expect(page.locator('.nav-bar-character-name').first()).toBeVisible()
    await expect(page.locator('.nav-bar-character-build').first()).toBeVisible()
  })
})

async function navBarIconCenters(
  page: import('@playwright/test').Page,
): Promise<{ x: number; y: number }[]> {
  return page.evaluate(() => {
    const icons = document.querySelectorAll('.app-nav-bar svg')
    return Array.from(icons).map((el) => {
      const rect = el.getBoundingClientRect()
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    })
  })
}
