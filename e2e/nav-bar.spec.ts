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
    await expectRailToSettleAtCollapsedWidth(page)

    const collapsedBox = await page.locator('.app-nav-bar').boundingBox()
    expect(collapsedBox).not.toBeNull()

    expect(collapsedBox!.x).toBe(expandedBox!.x)
    expect(collapsedBox!.y).toBe(expandedBox!.y)
  })

  test('row icons keep their horizontal position and sit centered when collapsed', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await page.locator('.nav-bar-row').first().waitFor()

    const expandedIconCenterXs = await railRowIconCenterXs(page)
    expect(expandedIconCenterXs.length).toBeGreaterThan(0)

    await page.click('.nav-bar-collapse-btn')
    await expect(page.locator('.app-nav-bar')).not.toHaveClass(/expanded/)
    await expectRailToSettleAtCollapsedWidth(page)

    const collapsedIconCenterXs = await railRowIconCenterXs(page)
    expect(collapsedIconCenterXs).toEqual(expandedIconCenterXs)

    const railBox = await page.locator('.app-nav-bar').boundingBox()
    for (const iconCenterX of collapsedIconCenterXs) {
      expect(Math.abs(iconCenterX - (railBox!.x + railBox!.width / 2))).toBeLessThanOrEqual(1)
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

    await page.getByRole('link', { name: 'Gear', exact: true }).click()

    await expect(page.locator('.app-nav-bar')).not.toHaveClass(/expanded/)
  })

  test('nav bar does NOT auto-close on navigate at >= 600px', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')
    await expect(page.locator('.app-nav-bar')).toHaveClass(/expanded/)

    await page.getByRole('link', { name: 'Gear', exact: true }).click()

    await expect(page.locator('.app-nav-bar')).toHaveClass(/expanded/)
  })
})

test.describe('layout', () => {
  test('stats panel visible on build-plan view', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    await page.getByRole('link', { name: 'Build plan', exact: true }).click()
    await expect(page.locator('.stats-panel')).toBeVisible()
  })

  test('stats panel hidden on non-build-plan views', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    await page.getByRole('link', { name: 'Build plan', exact: true }).click()
    await expect(page.locator('.stats-panel')).toBeVisible()
    await page.getByRole('link', { name: 'Resources', exact: true }).click()
    await expect(page.locator('.stats-panel')).not.toBeVisible()
  })

  test('nav bar width is 236px when expanded', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    const box = await page.locator('.app-nav-bar').boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBe(236)
  })

  test('nav bar scrolls within the viewport when it is short', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 400 })
    await page.goto('/')
    await page.locator('.nav-bar-row').first().waitFor()

    const railBox = await page.locator('.app-nav-bar').boundingBox()
    expect(railBox).not.toBeNull()
    expect(railBox!.y + railBox!.height).toBeLessThanOrEqual(400)

    const isScrollable = await page
      .locator('.app-nav-bar')
      .evaluate((rail) => rail.scrollHeight > rail.clientHeight)
    expect(isScrollable).toBe(true)

    const gitHubLink = page
      .locator('.app-nav-bar')
      .getByRole('link', { name: 'GitHub', exact: true })
    await gitHubLink.scrollIntoViewIfNeeded()
    await expect(gitHubLink).toBeInViewport()
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

    await page.getByRole('link', { name: 'Gear', exact: true }).click()
    await expect(page).toHaveURL(/\/gear$/)
    await expect(page.locator('.app-content')).toContainText('Raid set')

    await page.getByRole('link', { name: 'Settings', exact: true }).click()
    await expect(page).toHaveURL(/\/settings$/)
  })

  test('the active row carries the accent fill and left mark', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    const charactersRow = page.getByRole('link', { name: 'Characters & builds', exact: true })
    await charactersRow.click()
    await expect(page).toHaveURL(/\/characters$/)
    await expect(charactersRow).toHaveClass(/active/)

    const activeRowStyle = await charactersRow.evaluate((row) => {
      const computedStyle = getComputedStyle(row)
      return { boxShadow: computedStyle.boxShadow, fontWeight: computedStyle.fontWeight }
    })
    expect(activeRowStyle.boxShadow).toMatch(/2px 0px 0px 0px .*inset|inset .*2px 0px 0px 0px/)
    expect(activeRowStyle.fontWeight).toBe('600')
    await expect(page.locator('.nav-bar-row.active')).toHaveCount(1)
  })
})

test.describe('build plan sections', () => {
  test('appear only on /build-plan, and the picked section is marked active', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    const sectionRows = page.locator('.nav-bar-row--section')
    await expect(sectionRows).toHaveCount(0)

    await page.getByRole('link', { name: 'Build plan', exact: true }).click()
    await expect(sectionRows).toHaveText([
      'Levels',
      'Skills',
      'Spells',
      'Enhancements',
      'Destinies',
      'Reaper',
    ])
    const sectionRowHeight = (await sectionRows.first().boundingBox())!.height
    const regularRowHeight = (await page.locator('.nav-bar-row').first().boundingBox())!.height
    expect(sectionRowHeight).toBe(26)
    expect(regularRowHeight).toBe(32)

    await page.getByRole('link', { name: 'Skills', exact: true }).click()
    await expect(page).toHaveURL(/\/build-plan#skills$/)
    await expect(page.locator('.nav-bar-row.active')).toHaveText(['Build plan', 'Skills'])

    await page.getByRole('link', { name: 'Gear', exact: true }).click()
    await expect(sectionRows).toHaveCount(0)
  })

  test('clicking a section scrolls its header into view and records it in the URL', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/build-plan')

    const skillsHeader = page.locator('.page-section-header#skills')
    await page.getByRole('link', { name: 'Skills', exact: true }).click()

    await expect(page).toHaveURL(/\/build-plan#skills$/)
    await expect(skillsHeader).toBeInViewport()
    const contentTop = (await page.locator('.app-content').boundingBox())!.y
    const skillsHeaderTop = (await skillsHeader.boundingBox())!.y
    expect(skillsHeaderTop - contentTop).toBeLessThan(40)
  })

  test('scrolling the page moves the current section in the rail', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/build-plan#levels')
    await expect(page.locator('.nav-bar-row--section.active')).toHaveText(['Levels'])

    await page.locator('#skills').evaluate((header) => header.scrollIntoView())

    await expect(page).toHaveURL(/\/build-plan#skills$/)
    await expect(page.locator('.nav-bar-row--section.active')).toHaveText(['Skills'])
  })

  test('scrolling back up into the previous section body makes it current', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/build-plan')
    await page.locator('#skills').evaluate((header) => header.scrollIntoView())
    await expect(page).toHaveURL(/\/build-plan#skills$/)

    await page.locator('.app-content').evaluate((content) => content.scrollBy(0, -80))

    await expect(page).toHaveURL(/\/build-plan#levels$/)
    await expect(page.locator('.nav-bar-row--section.active')).toHaveText(['Levels'])
  })

  test('scrolling to the bottom of the page makes the last section current', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto('/build-plan#levels')
    await expect(page.locator('.nav-bar-row--section.active')).toHaveText(['Levels'])

    const content = page.locator('.app-content')
    for (let step = 0; step < 20; step++) {
      await content.evaluate((scroller) => scroller.scrollBy(0, 120))
      await page.waitForTimeout(30)
    }
    await content.evaluate((scroller) => scroller.scrollTo(0, scroller.scrollHeight))

    await expect(page).toHaveURL(/\/build-plan#reaper$/)
    await expect(page.locator('.nav-bar-row--section.active')).toHaveText(['Reaper'])
  })

  test('stay hidden while the rail is collapsed', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 800 })
    await page.goto('/build-plan')
    await page.locator('.nav-bar-row').first().waitFor()

    await expect(page.locator('.nav-bar-row--section')).toHaveCount(0)
  })
})

test.describe('character card', () => {
  test('the switcher opens below the viewed build and picking a planned build updates the card', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    const viewedBuildButton = page.getByRole('button', { name: /^Viewed build: / })
    await expect(viewedBuildButton).toContainText('Thordak')
    await viewedBuildButton.click()

    const switcher = page.getByRole('group', { name: 'Switch build', exact: true })
    await expect(switcher).toBeVisible()
    const viewedBuildBox = (await viewedBuildButton.boundingBox())!
    const switcherBox = (await switcher.boundingBox())!
    expect(switcherBox.y).toBeGreaterThanOrEqual(viewedBuildBox.y + viewedBuildBox.height)
    expect(switcherBox.x).toBeCloseTo(viewedBuildBox.x, 0)

    await switcher.getByRole('button', { name: 'Dwarf Tank (planned)', exact: true }).click()

    await expect(switcher).not.toBeVisible()
    await expect(viewedBuildButton).toContainText('Dwarf Tank')
    await expect(viewedBuildButton).toContainText('planned')
  })

  test('swap is dimmed until a comparison is picked', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    const swapButton = page.getByRole('button', { name: 'Swap', exact: true })
    await expect(swapButton).toBeDisabled()
    expect(await swapButton.evaluate((button) => getComputedStyle(button).opacity)).toBe('0.42')

    await page.getByRole('button', { name: 'Compare…', exact: true }).click()
    await page
      .getByRole('group', { name: 'Compare against', exact: true })
      .getByRole('button', { name: 'Dwarf Tank (planned)', exact: true })
      .click()

    await expect(swapButton).toBeEnabled()
    expect(await swapButton.evaluate((button) => getComputedStyle(button).opacity)).toBe('1')
  })

  test('the warnings popover opens above the warnings row', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/')

    const warningsRow = page.getByRole('button', { name: /^Warnings/ })
    await warningsRow.click()
    const warningsPopover = page.getByRole('group', { name: 'Build warnings', exact: true })
    await expect(warningsPopover).toBeVisible()
    const warningsRowBox = (await warningsRow.boundingBox())!
    const popoverBox = (await warningsPopover.boundingBox())!
    expect(popoverBox.y + popoverBox.height).toBeLessThanOrEqual(warningsRowBox.y)

    await page.keyboard.press('Escape')
    await expect(warningsPopover).not.toBeVisible()
  })
})

async function railRowIconCenterXs(page: import('@playwright/test').Page): Promise<number[]> {
  return page.evaluate(() => {
    const icons = document.querySelectorAll('.app-nav-bar .nav-bar-row > svg:first-child')
    return Array.from(icons).map((icon) => {
      const rect = icon.getBoundingClientRect()
      return rect.x + rect.width / 2
    })
  })
}

const COLLAPSED_RAIL_WIDTH_PX = 56

async function expectRailToSettleAtCollapsedWidth(
  page: import('@playwright/test').Page,
): Promise<void> {
  await expect
    .poll(async () => (await page.locator('.app-nav-bar').boundingBox())?.width)
    .toBe(COLLAPSED_RAIL_WIDTH_PX)
}
