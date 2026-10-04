import { expect, test } from '@playwright/test'
import capturedRing from '../src/features/resources/queries/fixtures/item487.json' with { type: 'json' }
import capturedArmor from '../src/features/resources/queries/fixtures/item831.json' with { type: 'json' }
import capturedSet from '../src/features/resources/queries/fixtures/set93.json' with { type: 'json' }

test('search keyboard navigation scrolls a virtualized result into view and opens its detail', async ({
  page,
}) => {
  const listItems = Array.from({ length: 120 }, (_, index) => ({
    id: 9000 + index,
    name: `Armor ${String(index + 1).padStart(3, '0')}`,
    slot: capturedArmor.slot,
    category: capturedArmor.category,
    item_type: capturedArmor.item_type,
    minimum_level: capturedArmor.minimum_level,
    enhancement_bonus: capturedArmor.enhancement_bonus,
    icon: capturedArmor.icon,
    pack: null,
    is_raid: false,
    is_rare: false,
    is_legacy: capturedArmor.is_legacy,
  }))
  await page.setViewportSize({ width: 1440, height: 800 })
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const response =
      path === '/v1/items'
        ? { total: listItems.length, limit: 200, offset: 0, items: listItems }
        : path === '/v1/items/9119'
          ? { ...capturedArmor, id: 9119, name: 'Armor 120' }
          : []
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })

  await page.goto('/resources/items')
  const search = page.getByRole('searchbox', { name: 'Search items', exact: true })
  const scrollBody = page.locator('.ledger-body')
  await expect(search).toBeVisible()
  await expect(scrollBody).not.toHaveAttribute('tabindex')
  await page.getByRole('columnheader', { name: 'Name', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('row', { name: /Armor 001/ })).toBeFocused()
  await page.keyboard.press('PageDown')
  await expect(page.getByRole('row', { name: /Armor 001/ })).not.toBeFocused()
  await expect.poll(() => scrollBody.evaluate((body) => body.scrollTop)).toBeGreaterThan(0)
  await page.keyboard.press('/')
  await expect(search).toBeFocused()
  await page.keyboard.press('ArrowUp')
  const lastRow = page.getByRole('row', { name: /Armor 120/ })
  await expect(lastRow).toBeFocused()
  expect(await lastRow.evaluate((row) => getComputedStyle(row).boxShadow)).toBe('none')
  await expect(lastRow).toBeInViewport()
  await expect(search).not.toBeFocused()
  await expect(search).toHaveAttribute('aria-controls', (await scrollBody.getAttribute('id')) ?? '')
  await expect(search).not.toHaveAttribute('aria-activedescendant')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('t')
  await expect(lastRow).toHaveAttribute('data-hover-card-pinned')
  await expect(page.getByRole('dialog')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(lastRow).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(lastRow).toBeFocused()
  await page.keyboard.press('/')
  await expect(search).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('row', { name: /Armor 001/ })).toBeFocused()
  await page.keyboard.press('/')
  await expect(search).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(lastRow).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/resources\/items\/9119$/)
  await expect(lastRow).toBeFocused()
  await expect(lastRow).toHaveClass(/ledger-row--selected/)
  const selectedRowStyle = await lastRow.evaluate((row) => {
    const rowStyle = getComputedStyle(row)
    const name = row.querySelector('.resources-ledger-name')
    if (!name) throw new Error('Selected row has no name')
    const colorSample = document.createElement('span')
    colorSample.style.color = 'var(--text-accent)'
    colorSample.style.backgroundColor = 'var(--surface-selected)'
    row.append(colorSample)
    const accentColor = getComputedStyle(colorSample).color
    const activeFill = getComputedStyle(colorSample).backgroundColor
    colorSample.remove()
    return {
      boxShadow: rowStyle.boxShadow,
      outlineStyle: rowStyle.outlineStyle,
      outlineColor: rowStyle.outlineColor,
      backgroundColor: rowStyle.backgroundColor,
      activeFill,
      nameColor: getComputedStyle(name).color,
      accentColor,
      nameWeight: getComputedStyle(name).fontWeight,
    }
  })
  expect(selectedRowStyle.boxShadow).toBe('none')
  expect(selectedRowStyle.outlineStyle).toBe('solid')
  expect(selectedRowStyle.outlineColor).toBe('rgba(0, 0, 0, 0)')
  expect(selectedRowStyle.backgroundColor).toBe(selectedRowStyle.activeFill)
  expect(selectedRowStyle.nameColor).toBe(selectedRowStyle.accentColor)
  expect(selectedRowStyle.nameWeight).toBe('600')
  await expect(page.getByRole('heading', { name: 'Armor 120', exact: true })).not.toBeFocused()
  await expect(search).not.toBeFocused()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(lastRow).toBeFocused()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(lastRow).toBeFocused()
  await expect(page).toHaveURL(/\/resources\/items\/9119$/)
  await page.keyboard.press('Enter')
  await expect(lastRow).toBeFocused()
  await page.keyboard.press('/')
  await expect(search).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(search).toBeFocused()
})

test('item detail fact cells and tags render in pane and hover', async ({ page }) => {
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const response =
      path === '/v1/items/831'
        ? capturedArmor
        : path === '/v1/items'
          ? {
              total: 1,
              limit: 200,
              offset: 0,
              items: [
                {
                  id: capturedArmor.id,
                  name: capturedArmor.name,
                  slot: capturedArmor.slot,
                  category: capturedArmor.category,
                  item_type: capturedArmor.item_type,
                  minimum_level: capturedArmor.minimum_level,
                  enhancement_bonus: capturedArmor.enhancement_bonus,
                  icon: capturedArmor.icon,
                  pack: null,
                  is_raid: false,
                  is_rare: false,
                  is_legacy: capturedArmor.is_legacy,
                },
              ],
            }
          : path === '/v1/augments'
            ? { total: 0, limit: 200, offset: 0, augments: [] }
            : []
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })

  await page.goto('/resources/items/831')
  const detailPane = page.getByRole('region', { name: 'Item details', exact: true })
  const grid = detailPane.locator('.detail-fact-grid')
  await expect(grid.locator('.detail-fact-grid__cell')).toHaveText([
    'Armor bonus16',
    'Max Dex bonus1',
    'Enhancement+5',
  ])
  expect(
    await grid.evaluate((element) => {
      const style = getComputedStyle(element)
      return [style.display, style.columnGap, style.rowGap, style.padding]
    }),
  ).toEqual(['grid', '16px', '10px', '2px 12px 4px'])
  await detailPane.getByRole('button', { name: 'More armor details', exact: true }).click()
  const tags = detailPane.locator('.detail-extras')
  await expect(tags.locator('.detail-extras__entry')).toHaveText([
    'Arcane spell failure35%',
    'Armor check penalty-5',
    'MaterialMagesteel',
  ])
  await expect(tags).not.toHaveAttribute('data-layout')
  expect(
    await tags.evaluate((element) => {
      const style = getComputedStyle(element)
      return [style.display, style.flexWrap, style.gap]
    }),
  ).toEqual(['flex', 'wrap', '6px'])
  const itemRow = page.getByRole('row', { name: /Beholder Plate Armor/ })
  await itemRow.hover()
  await itemRow.press('t')
  await expect(itemRow).toHaveAttribute('data-hover-card-pinned', '')
  const hoverCard = page.locator('[data-hover-card]')
  await expect(hoverCard).toBeFocused()
  expect(await hoverCard.evaluate((card) => getComputedStyle(card).outlineColor)).toBe(
    'rgba(0, 0, 0, 0)',
  )
  expect(await itemRow.evaluate((row) => getComputedStyle(row).outlineColor)).not.toBe(
    'rgba(0, 0, 0, 0)',
  )
  await expect(hoverCard.locator('.detail-fact-grid__cell')).toHaveText([
    'Armor bonus16',
    'Max Dex bonus1',
    'Enhancement+5',
  ])
  await hoverCard.getByRole('button', { name: 'More armor details', exact: true }).click()
  await expect(hoverCard.locator('.detail-extras__entry')).toHaveText([
    'Arcane spell failure35%',
    'Armor check penalty-5',
    'MaterialMagesteel',
  ])
})

test('set band heights and opening an augment socket preserve the item detail layout', async ({
  page,
}) => {
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const response =
      path === '/v1/items/487'
        ? capturedRing
        : path === '/v1/sets/93'
          ? capturedSet
          : path === '/v1/items'
            ? {
                total: 1,
                limit: 200,
                offset: 0,
                items: [
                  {
                    id: capturedRing.id,
                    name: capturedRing.name,
                    slot: capturedRing.slot,
                    category: capturedRing.category,
                    item_type: capturedRing.item_type,
                    minimum_level: capturedRing.minimum_level,
                    enhancement_bonus: capturedRing.enhancement_bonus,
                    icon: capturedRing.icon,
                    pack: null,
                    is_raid: false,
                    is_rare: false,
                    is_legacy: capturedRing.is_legacy,
                  },
                ],
              }
            : path === '/v1/augments'
              ? { total: 0, limit: 200, offset: 0, augments: [] }
              : []
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })

  await page.goto('/resources/items/487')
  const detailPane = page.getByRole('region', { name: 'Item details', exact: true })
  const setHeading = detailPane.locator('.resources-enchantment-ledger .ledger-row--heading')
  const tierEyebrow = detailPane.locator('.resources-enchantment-ledger .ledger-row--subheading')
  await expect(tierEyebrow).toHaveText('5 pieces')
  await page.evaluate(() => document.fonts.ready)
  expect((await setHeading.boundingBox())?.height).toBe(34)
  expect((await tierEyebrow.boundingBox())?.height).toBe(24)
  const enchantmentBody = detailPane.locator('.resources-enchantment-ledger .ledger-plain-body')
  await expect(enchantmentBody).not.toHaveAttribute('tabindex')
  await detailPane.locator('.resources-enchantment-ledger .ledger-header-cell').first().focus()
  await page.keyboard.press('Tab')
  await expect(
    detailPane.locator('.resources-enchantment-ledger .ledger-row').first(),
  ).toBeFocused()
  await page.keyboard.press('End')
  const tierBonus = detailPane.locator('.resources-enchantment-ledger .ledger-row').last()
  await expect(tierBonus).toBeFocused()
  await expect(tierEyebrow).not.toBeFocused()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('t')
  await expect(tierBonus).toHaveAttribute('data-hover-card-pinned')
  await page.keyboard.press('Escape')
  await expect(tierBonus).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(tierBonus).toBeFocused()
  await detailPane.locator('.resources-enchantment-ledger .ledger-header-cell').first().focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('End')
  await expect(tierBonus).toBeFocused()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(tierBonus).toBeFocused()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(tierBonus).toBeFocused()
  await expect(page).toHaveURL(/\/resources\/items\/487$/)
  const header = detailPane.locator('.detail-card__header')
  const facts = header.locator('.detail-card__facts')
  const socket = facts.getByRole('button', { name: 'Yellow', exact: true })
  await expect(socket).toBeVisible()
  await expect(facts.locator('.detail-card__fact .section-label')).toHaveText([
    'ML',
    'Gear slot',
    'Raid',
    'Rare',
    'Set',
    'Augments',
  ])
  expect(await facts.evaluate((row) => getComputedStyle(row).columnGap)).toBe('28px')
  expect(await facts.evaluate((row) => getComputedStyle(row).rowGap)).toBe('10px')
  const factPositions = (): Promise<
    Array<{ label: string | null | undefined; offsetTop: number; offsetLeft: number }>
  > =>
    facts.evaluate((grid) =>
      Array.from(grid.children).map((fact) => ({
        label: fact.querySelector('.section-label')?.textContent,
        offsetTop: (fact as HTMLElement).offsetTop,
        offsetLeft: (fact as HTMLElement).offsetLeft,
      })),
    )
  await page.evaluate(() => document.fonts.ready)
  const closedPositions = await factPositions()
  await socket.click()
  const ledger = detailPane.locator('.resources-augment-candidates')
  await expect(ledger).toBeVisible()
  await expect(ledger.locator('.resources-augment-candidates__heading')).toHaveText(
    'Yellow socket · 0 augments',
  )
  expect(await header.evaluate((titleBar) => titleBar.nextElementSibling?.className)).toBe(
    'resources-augment-candidates',
  )
  const headerBounds = await header.boundingBox()
  const ledgerBounds = await ledger.boundingBox()
  expect(ledgerBounds?.x).toBe(headerBounds?.x)
  expect(ledgerBounds?.width).toBe(headerBounds?.width)
  expect(await factPositions()).toEqual(closedPositions)
  await socket.click()
  await expect(ledger).toHaveCount(0)
  expect(await factPositions()).toEqual(closedPositions)
  await page.getByRole('row', { name: /Adversion/ }).hover()
  const hoverCard = page.locator('[data-hover-card]')
  await expect(hoverCard.locator('.detail-card__header .detail-card__facts')).toBeVisible()
  await expect(hoverCard.locator('.detail-card__facts .resources-augment-gem')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(hoverCard).toBeVisible()
  await page.mouse.move(0, 0)
  await expect(hoverCard).toHaveCount(0)
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/resources/items/487')
  await expect(facts).toBeVisible()
  await expect(page.locator('.resources-picker')).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
  const mobileLayout = await page.evaluate(() => {
    const titleBar = document.querySelector<HTMLElement>(
      '.resources-detail-pane .detail-card__header',
    )!
    const headerBox = titleBar.getBoundingClientRect()
    return {
      headerLeft: headerBox.left,
      headerRight: headerBox.right,
      viewportWidth: window.innerWidth,
      facts: Array.from(titleBar.querySelectorAll<HTMLElement>('.detail-card__fact')).map(
        (fact) => {
          const box = fact.getBoundingClientRect()
          return { offsetTop: fact.offsetTop, left: box.left, right: box.right }
        },
      ),
    }
  })
  expect(mobileLayout.facts.some((fact) => fact.offsetTop > mobileLayout.facts[0].offsetTop)).toBe(
    true,
  )
  expect(mobileLayout.headerRight).toBeLessThanOrEqual(mobileLayout.viewportWidth)
  expect(
    mobileLayout.facts.every(
      (fact) => fact.left >= mobileLayout.headerLeft && fact.right <= mobileLayout.headerRight,
    ),
  ).toBe(true)
})

test('the detail pane displays the item name once beside the list and takes over at 375px', async ({
  page,
}) => {
  const dataRequests: string[] = []
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname
    if (path.startsWith('/v1/')) dataRequests.push(path)
  })
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const response =
      path === '/v1/items/831'
        ? capturedArmor
        : path === '/v1/items'
          ? {
              total: 1,
              limit: 200,
              offset: 0,
              items: [
                {
                  id: capturedArmor.id,
                  name: capturedArmor.name,
                  slot: capturedArmor.slot,
                  category: capturedArmor.category,
                  item_type: capturedArmor.item_type,
                  minimum_level: capturedArmor.minimum_level,
                  enhancement_bonus: capturedArmor.enhancement_bonus,
                  icon: capturedArmor.icon,
                  pack: null,
                  is_raid: false,
                  is_rare: false,
                  is_legacy: capturedArmor.is_legacy,
                },
              ],
            }
          : []
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })
  await page.goto('/resources/items/831')
  const detailPane = page.getByRole('region', { name: 'Item details', exact: true })
  await expect(
    detailPane.getByRole('heading', { name: 'Beholder Plate Armor', exact: true }),
  ).toBeVisible()
  await expect(detailPane.locator('.detail-card__name')).toHaveText('Beholder Plate Armor')
  expect(dataRequests.sort()).toEqual(['/v1/items', '/v1/items/831'])
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const picker = page.locator('.resources-picker')
  const desktopPicker = await picker.boundingBox()
  const desktopPane = await detailPane.boundingBox()
  expect(desktopPicker).not.toBeNull()
  expect(desktopPane).not.toBeNull()
  expect((desktopPane?.x ?? 0) > (desktopPicker?.x ?? 0)).toBe(true)
  const itemRow = page.getByRole('row', { name: /Beholder Plate Armor/ })
  await itemRow.hover()
  const hoverCard = page.locator('[data-hover-card]')
  await expect(hoverCard).toBeVisible()
  await expect(hoverCard.locator('.detail-card__header .detail-card__facts')).toBeVisible()
  await expect(hoverCard.locator('.detail-card__facts .resources-augment-control')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(hoverCard).toBeVisible()
  await page.mouse.move(0, 0)
  await expect(page.locator('[data-hover-card]')).toHaveCount(0)
  await expect(page).toHaveURL(/\/resources\/items\/831$/)
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/resources\/items\/831$/)
  await page.getByRole('button', { name: 'Back to items', exact: true }).click()
  await expect(page).toHaveURL(/\/resources\/items$/)
  await expect(itemRow).toBeFocused()
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/resources/items/831')
  await expect(
    detailPane.getByRole('heading', { name: 'Beholder Plate Armor', exact: true }),
  ).toBeVisible()
  await expect(picker).toHaveCount(0)
  await expect(detailPane).toBeInViewport()
  await expect(detailPane.locator('.detail-card__header .detail-card__facts')).toBeInViewport()
  await expect(detailPane.locator('.detail-card__facts .resources-augment-control')).toBeVisible()
  const mobileName = await detailPane.locator('.detail-card__name').boundingBox()
  const mobileActions = await detailPane.locator('.detail-card__actions').boundingBox()
  expect((mobileActions?.y ?? 0) >= (mobileName?.y ?? 0) + (mobileName?.height ?? 0)).toBe(true)
  await page.getByRole('button', { name: 'Back to items', exact: true }).click()
  await expect(picker).toBeVisible()
  await expect(detailPane).toHaveCount(0)
  await page.getByRole('row', { name: /Beholder Plate Armor/ }).click()
  await expect(detailPane).toBeVisible()
  await page.goBack()
  await expect(picker).toBeVisible()
  await expect(detailPane).toHaveCount(0)
  await expect(page.getByRole('row', { name: /Beholder Plate Armor/ })).toBeFocused()
  await page.getByRole('row', { name: /Beholder Plate Armor/ }).click()
  await expect(detailPane).toBeVisible()
  await page.getByRole('button', { name: 'Back to items', exact: true }).click()
  await expect(picker).toBeVisible()
  await expect(page.getByRole('row', { name: /Beholder Plate Armor/ })).toBeFocused()
  await page.goForward()
  await expect(detailPane).toBeVisible()
})
