import { expect, test, type Locator, type Page } from '@playwright/test'
import capturedRing from '../src/features/resources/queries/fixtures/effects-item-487.json' with { type: 'json' }
import capturedRunearm from '../src/features/resources/queries/fixtures/effects-item-924.json' with { type: 'json' }
import capturedArmor from '../src/features/resources/queries/fixtures/effects-item-831.json' with { type: 'json' }
import capturedWeapon from '../src/features/resources/queries/fixtures/effects-item-3479.json' with { type: 'json' }
import capturedShield from '../src/features/resources/queries/fixtures/effects-item-8203.json' with { type: 'json' }
import capturedNecklace from '../src/features/resources/queries/fixtures/effects-item-7631.json' with { type: 'json' }
import capturedSet from '../src/features/resources/queries/fixtures/effects-set-93.json' with { type: 'json' }
import charismaDetail from '../src/features/resources/queries/fixtures/effect-detail-6.json' with { type: 'json' }

async function routeFocusRestoreItems(page: Page, width = 1440): Promise<void> {
  const items = [
    { ...capturedArmor, id: 11000, name: 'Focus Armor 1' },
    { ...capturedArmor, id: 11001, name: 'Focus Armor 2' },
  ]
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const item = items.find((candidate) => path === `/v1/items/${candidate.id}`)
    const response =
      path === '/v1/items'
        ? {
            total: items.length,
            limit: 200,
            offset: 0,
            items: items.map((candidate) => ({
              id: candidate.id,
              name: candidate.name,
              slot: candidate.slot,
              category: candidate.category,
              item_type: candidate.item_type,
              minimum_level: candidate.minimum_level,
              enhancement_bonus: candidate.enhancement_bonus,
              icon: candidate.icon,
              pack: null,
              is_raid: false,
              is_rare: false,
              is_legacy: candidate.is_legacy,
            })),
          }
        : (item ?? [])
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/resources/items')
}

async function expectCardBesideNameCell(
  page: Page,
  row: Locator,
  card: Locator,
  nextRows: Locator[],
): Promise<void> {
  const nameCell = row.locator('.ledger-cell--primary')
  await expect(nameCell).toBeVisible()
  await expect(card).toBeVisible()
  const rowBounds = await row.boundingBox()
  const nameBounds = await nameCell.boundingBox()
  const cardBounds = await card.boundingBox()
  const viewport = page.viewportSize()
  if (!rowBounds || !nameBounds || !cardBounds || !viewport)
    throw new Error('Card or name cell has no bounds')
  const canFitRight = nameBounds.x + nameBounds.width + 8 + cardBounds.width + 8 <= viewport.width
  if (canFitRight) expect(cardBounds.x).toBeCloseTo(nameBounds.x + nameBounds.width + 8, 0)
  else expect(cardBounds.x + cardBounds.width).toBeCloseTo(nameBounds.x - 8, 0)
  expect(cardBounds.y).toBeCloseTo(
    Math.max(8, Math.min(rowBounds.y, viewport.height - cardBounds.height - 8)),
    0,
  )
  for (const nextRow of nextRows) {
    const nextNameBounds = await nextRow.locator('.ledger-cell--primary').boundingBox()
    if (!nextNameBounds) throw new Error('Next row name cell has no bounds')
    expect(
      cardBounds.x < nextNameBounds.x + nextNameBounds.width &&
        cardBounds.x + cardBounds.width > nextNameBounds.x &&
        cardBounds.y < nextNameBounds.y + nextNameBounds.height &&
        cardBounds.y + cardBounds.height > nextNameBounds.y,
    ).toBe(false)
  }
}

test('clicking a list row focuses its detail without a visible focus ring, then Tab enters its actions', async ({
  page,
}) => {
  await routeFocusRestoreItems(page)
  const firstRow = page.getByRole('row', { name: /Focus Armor 1/ })
  await firstRow.click()
  const pane = page.getByRole('region', { name: 'Item details', exact: true })
  const firstTitle = pane.getByRole('heading', { name: 'Focus Armor 1', exact: true })
  await expect(firstTitle).toBeFocused()
  await expect(page.locator('.resources-detail-pane .detail-card__name:focus-visible')).toHaveCount(
    0,
  )
  await page.keyboard.press('Tab')
  await expect(
    pane.getByRole('button', { name: 'Copy link to this item', exact: true }),
  ).toBeFocused()

  await page.getByRole('row', { name: /Focus Armor 2/ }).click()
  await expect(pane.getByRole('heading', { name: 'Focus Armor 2', exact: true })).toBeFocused()
  await expect(page.locator('.resources-detail-pane .detail-card__name:focus-visible')).toHaveCount(
    0,
  )
})

test('clicking Back restores the item row without opening its card', async ({ page }) => {
  await routeFocusRestoreItems(page)
  const row = page.getByRole('row', { name: /Focus Armor 1/ })
  await row.click()
  await page.mouse.move(0, 0)
  await page.getByRole('button', { name: 'Back to items', exact: true }).click()
  await expect(row).toBeFocused()
  await expect(page.locator('[data-hover-card]')).toHaveCount(0)
  await page.waitForTimeout(300)
  await expect(page.locator('[data-hover-card]')).toHaveCount(0)
})

for (const width of [1440, 375]) {
  test(`Enter opens the detail, Escape restores the row, and ArrowDown opens the next card at ${width}px`, async ({
    page,
  }) => {
    await routeFocusRestoreItems(page, width)
    const firstRow = page.getByRole('row', { name: /Focus Armor 1/ })
    const nextRow = page.getByRole('row', { name: /Focus Armor 2/ })
    const search = page.getByRole('searchbox', { name: 'Search items', exact: true })
    await search.focus()
    await page.keyboard.press('ArrowDown')
    await expect(firstRow).toBeFocused()
    await expect(page).toHaveURL(/\/resources\/items$/)
    await page.keyboard.press('Enter')
    const title = page
      .getByRole('region', { name: 'Item details', exact: true })
      .getByRole('heading', { name: 'Focus Armor 1', exact: true })
    await expect(title).toBeFocused()
    await expect(title).toHaveAttribute('tabindex', '-1')
    await expect(
      page.locator('.resources-detail-pane .detail-card__name:focus-visible'),
    ).toHaveCount(1)
    await expect(page.locator('[data-hover-card]')).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/resources\/items$/)
    await expect(firstRow).toBeFocused()
    await page.waitForTimeout(300)
    await expect(page.locator('[data-hover-card]')).toHaveCount(0)
    await page.keyboard.press('ArrowDown')
    await expect(nextRow).toBeFocused()
    await expect(page.locator('[data-hover-card]')).toContainText('Focus Armor 2')
  })
}

test('hover cards align links, leave keyboard rows visible, and clear tall row anchors', async ({
  page,
}) => {
  const armorItems = Array.from({ length: 12 }, (_, index) => ({
    ...capturedArmor,
    id: 10000 + index,
    name: `Beholder Plate Armor ${index + 1}`,
  }))
  const listItems = [
    ...armorItems.slice(0, 5),
    capturedRunearm,
    capturedNecklace,
    ...armorItems.slice(5),
  ]
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const item = listItems.find((candidate) => path === `/v1/items/${candidate.id}`)
    const response =
      path === '/v1/items'
        ? {
            total: listItems.length,
            limit: 200,
            offset: 0,
            items: listItems.map((candidate) => ({
              id: candidate.id,
              name: candidate.name,
              slot: candidate.slot,
              category: candidate.category,
              item_type: candidate.item_type,
              minimum_level: candidate.minimum_level,
              enhancement_bonus: candidate.enhancement_bonus,
              icon: candidate.icon,
              pack: null,
              is_raid: false,
              is_rare: false,
              is_legacy: candidate.is_legacy,
            })),
          }
        : path === '/v1/quests/423'
          ? { ...capturedNecklace.quests[0], items: [] }
          : (item ?? [])
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })

  await page.goto('/resources/items/7631')
  const pane = page.getByRole('region', { name: 'Item details', exact: true })
  const questAnchor = pane
    .locator('.resources-item-source-row .resources-hover-anchor')
    .filter({ hasText: 'Friends in Low Places' })
  await expect(questAnchor).toBeVisible()
  const questBounds = await questAnchor.boundingBox()
  if (!questBounds) throw new Error('Quest anchor has no bounds')
  const card = page.locator('[data-hover-card]')
  await questAnchor.hover({ position: { x: 4, y: questBounds.height / 2 } })
  await expect(card).toBeVisible()
  await expect(card).toContainText('Friends in Low Places')
  const firstQuestCardBounds = await card.boundingBox()
  await page.mouse.move(0, 0)
  await expect(card).toHaveCount(0)
  await questAnchor.hover({ position: { x: questBounds.width / 2, y: questBounds.height / 2 } })
  await expect(card).toBeVisible()
  await expect(card).toContainText('Friends in Low Places')
  const secondQuestCardBounds = await card.boundingBox()
  expect(firstQuestCardBounds?.x).toBeCloseTo(questBounds.x, 0)
  expect(secondQuestCardBounds?.x).toBeCloseTo(questBounds.x, 0)

  await page.mouse.move(0, 0)
  const rows = page.locator('.resources-picker .ledger-row')
  const search = page.getByRole('searchbox', { name: 'Search items', exact: true })
  await search.focus()
  for (let rowIndex = 0; rowIndex <= 4; rowIndex++) {
    await page.keyboard.press('ArrowDown')
    await expect(rows.nth(rowIndex)).toBeFocused()
    await expect(card.locator('.detail-card__name')).toHaveText(
      `Beholder Plate Armor ${rowIndex + 1}`,
    )
    await expectCardBesideNameCell(page, rows.nth(rowIndex), card, [
      rows.nth(rowIndex + 1),
      rows.nth(rowIndex + 2),
    ])
  }

  await search.focus()
  await expect(card).toHaveCount(0)
  const lowRow = rows.nth(5)
  await lowRow.hover({ position: { x: 40, y: 16 } })
  await expect(card).toBeVisible()
  await expect(card.locator('.detail-card__name')).toHaveText(capturedRunearm.name)
  const lowRowBounds = await lowRow.boundingBox()
  const tallCardBounds = await card.boundingBox()
  if (!lowRowBounds || !tallCardBounds) throw new Error('Low row has no bounds')
  expect(
    tallCardBounds.y >= lowRowBounds.y + lowRowBounds.height + 6 ||
      tallCardBounds.y + tallCardBounds.height <= lowRowBounds.y - 6,
  ).toBe(true)

  await lowRow.click({ position: { x: 40, y: 16 } })
  await expect(pane.getByRole('heading', { name: capturedRunearm.name, exact: true })).toBeVisible()
  await page.waitForTimeout(350)
  expect((await card.boundingBox())?.x).toBeCloseTo(tallCardBounds.x, 0)
  const detailPaneBounds = await pane.boundingBox()
  if (!detailPaneBounds) throw new Error('Detail pane has no bounds')
  expect((await card.boundingBox())?.x).toBeLessThan(detailPaneBounds.x)
})

test('keyboard enchantment cards sit beside their name cells', async ({ page }) => {
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        path === '/v1/items/487'
          ? capturedRing
          : path === '/v1/sets/93'
            ? capturedSet
            : path === '/v1/items'
              ? { total: 0, limit: 200, offset: 0, items: [] }
              : [],
      ),
    })
  })
  await page.setViewportSize({ width: 1440, height: 800 })
  await page.goto('/resources/items/487')
  const pane = page.getByRole('region', { name: 'Item details', exact: true })
  const rows = pane.locator(
    '.resources-effect-ledger .ledger-row:not(.ledger-row--heading):not(.ledger-row--subheading)',
  )
  const card = page.locator('.hover-card[data-kind="enchantment"]')
  await pane.locator('.resources-effect-ledger .ledger-header-cell').first().focus()
  await page.keyboard.press('Tab')
  for (let rowIndex = 0; rowIndex < 2; rowIndex++) {
    if (rowIndex > 0) await page.keyboard.press('ArrowDown')
    await expect(rows.nth(rowIndex)).toBeFocused()
    await expect(card).toBeVisible()
    await expect(card).not.toContainText('Loading bonus…')
    await expectCardBesideNameCell(page, rows.nth(rowIndex), card, [
      rows.nth(rowIndex + 1),
      rows.nth(rowIndex + 2),
    ])
  }
})

test('a card re-places above after delayed detail content makes it too tall for below', async ({
  page,
}) => {
  const listItems = Array.from({ length: 20 }, (_, index) => ({
    ...capturedArmor,
    id: 11000 + index,
    name: `Beholder Plate Armor ${index + 1}`,
  }))
  let delayedItemId: number | null = null
  let releaseItemResponse: () => void = () => {}
  const itemResponseReady = new Promise<void>((resolve) => {
    releaseItemResponse = resolve
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const item = listItems.find((candidate) => path === `/v1/items/${candidate.id}`)
    if (item && item.id === delayedItemId) await itemResponseReady
    const response =
      path === '/v1/items'
        ? {
            total: listItems.length,
            limit: 200,
            offset: 0,
            items: listItems.map((candidate) => ({
              id: candidate.id,
              name: candidate.name,
              slot: candidate.slot,
              category: candidate.category,
              item_type: candidate.item_type,
              minimum_level: candidate.minimum_level,
              enhancement_bonus: candidate.enhancement_bonus,
              icon: candidate.icon,
              pack: null,
              is_raid: false,
              is_rare: false,
              is_legacy: candidate.is_legacy,
            })),
          }
        : (item ?? [])
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })

  await page.goto('/resources/items')
  const rows = page.locator('.resources-picker .ledger-row')
  await expect(rows.first()).toBeVisible()
  const targetRowIndex = await rows.evaluateAll((renderedRows) => {
    const visibleRows = renderedRows
      .map((row, index) => ({ index, top: row.getBoundingClientRect().top }))
      .filter(({ top }) => top >= 620 && top <= 680)
    return visibleRows[0]?.index ?? -1
  })
  expect(targetRowIndex).toBeGreaterThanOrEqual(0)
  const row = rows.nth(targetRowIndex)
  const rowBounds = await row.boundingBox()
  const rowId = await row.getAttribute('data-row-key')
  if (!rowBounds || !rowId) throw new Error('Delayed item row has no bounds or id')
  delayedItemId = Number(rowId)
  await row.hover({ position: { x: 40, y: rowBounds.height / 2 } })
  const card = page.locator('[data-hover-card]')
  await expect(card).toContainText('Loading item…')
  expect((await card.boundingBox())?.y).toBeCloseTo(rowBounds.y + rowBounds.height + 6, 0)

  releaseItemResponse()
  await expect(card.locator('.detail-card__name')).toHaveText(
    listItems.find((item) => item.id === delayedItemId)?.name ?? '',
  )
  await expect.poll(async () => (await card.boundingBox())?.y ?? 0).toBeLessThan(rowBounds.y - 6)
  const loadedCardBounds = await card.boundingBox()
  if (!loadedCardBounds) throw new Error('Loaded card has no bounds')
  expect(loadedCardBounds.y + loadedCardBounds.height).toBeLessThanOrEqual(rowBounds.y - 6)
  expect(await card.evaluate((element) => element.style.maxHeight)).toBe('')
  expect(await card.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(
    true,
  )
})

test('capped list and nested cards keep their height and viewport margin', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 500 })
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const response =
      path === '/v1/items'
        ? {
            total: 1,
            limit: 200,
            offset: 0,
            items: [
              {
                id: capturedRunearm.id,
                name: capturedRunearm.name,
                slot: capturedRunearm.slot,
                category: capturedRunearm.category,
                item_type: capturedRunearm.item_type,
                minimum_level: capturedRunearm.minimum_level,
                enhancement_bonus: capturedRunearm.enhancement_bonus,
                icon: capturedRunearm.icon,
                pack: null,
                is_raid: false,
                is_rare: false,
                is_legacy: capturedRunearm.is_legacy,
              },
            ],
          }
        : path === '/v1/items/487'
          ? capturedRing
          : path === '/v1/items/924'
            ? capturedRunearm
            : path === '/v1/sets/93'
              ? capturedSet
              : []
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })

  const stableCap = async (selector: string): Promise<void> => {
    const card = page.locator(selector)
    await expect.poll(async () => card.evaluate((element) => element.style.maxHeight)).not.toBe('')
    const measurements = await card.evaluate(async (element) => {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const readings: { maxHeight: string; bottom: number }[] = []
      const record = (): void => {
        readings.push({
          maxHeight: element.style.maxHeight,
          bottom: element.getBoundingClientRect().bottom,
        })
      }
      record()
      const observer = new MutationObserver(record)
      observer.observe(element, { attributes: true, attributeFilter: ['style'] })
      await new Promise((resolve) => window.setTimeout(resolve, 1300))
      observer.disconnect()
      record()
      return readings
    })
    expect(measurements[0].maxHeight).not.toBe('')
    for (const measurement of measurements) {
      expect(measurement.maxHeight).toBe(measurements[0].maxHeight)
      expect(measurement.bottom).toBeCloseTo(measurements[0].bottom, 0)
      expect(measurement.bottom).toBeLessThanOrEqual(492)
    }
  }

  await page.goto('/resources/items/487')
  const listRow = page.locator('.resources-picker .ledger-row').first()
  await listRow.hover()
  const listCard = page.locator('[data-hover-card][data-depth="0"]')
  await expect(listCard.locator('.detail-card__name')).toHaveText(capturedRunearm.name)
  await stableCap('[data-hover-card][data-depth="0"]')

  await page.mouse.move(0, 0)
  await expect(listCard).toHaveCount(0)
  const setBand = page
    .getByRole('region', { name: 'Item details', exact: true })
    .locator('.resources-effect-ledger .ledger-row--heading')
    .filter({ hasText: capturedSet.name })
  await setBand.hover()
  const setCard = page.getByRole('dialog').filter({ hasText: capturedSet.name })
  await expect(setCard).toBeVisible()
  await page.keyboard.press('t')
  await expect(setCard).toHaveClass(/hover-card--pinned/)
  const runearmPiece = setCard.getByRole('button', {
    name: capturedSet.items[1].name,
    exact: false,
  })
  await runearmPiece.hover()
  const nestedCard = page.locator('[data-hover-card][data-depth="1"]')
  await expect(nestedCard.locator('.detail-card__name')).toHaveText(capturedRunearm.name)
  await stableCap('[data-hover-card][data-depth="1"]')
})

test('augment symbols keep their shape, focus ring, colour, and mobile bounds', async ({
  page,
}) => {
  const apiSlot = capturedArmor.augment_slots[0]
  const itemResponses = [
    {
      ...capturedArmor,
      id: 633,
      name: 'Armor of Sunlight',
      augment_slots: ['blue', 'sun'].map((label, sort_order) => ({
        ...apiSlot,
        family: 'standard',
        label,
        variant: label,
        sort_order,
      })),
    },
    {
      ...capturedRing,
      id: 1831,
      name: 'Dinosaur Bone Belt',
      slot: 'Waist',
      set: null,
      set_name: null,
      augment_slots: [
        'isle of dread: artifact scale (accessory)',
        'isle of dread: artifact fang (accessory)',
        'isle of dread: artifact claw (accessory)',
        'isle of dread: artifact horn (accessory)',
        'blue',
        'green',
        'yellow',
      ].map((label, sort_order) => ({
        ...apiSlot,
        family: sort_order < 4 ? 'dino' : 'standard',
        label,
        variant: label,
        sort_order,
      })),
    },
    {
      ...capturedRing,
      id: 4022,
      name: 'Item 4022',
      set: null,
      set_name: null,
      augment_slots: [
        'crafting: nearly complete: quality ability score (legendary)',
        'green',
        'colorless',
        'moon',
      ].map((label, sort_order) => ({
        ...apiSlot,
        family: sort_order === 0 ? 'crafting' : 'standard',
        label,
        variant: label,
        sort_order,
      })),
    },
  ]
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const item = itemResponses.find((response) => path === `/v1/items/${response.id}`)
    const response =
      item ??
      (path === '/v1/items'
        ? {
            total: itemResponses.length,
            limit: 200,
            offset: 0,
            items: itemResponses.map((itemResponse) => ({
              id: itemResponse.id,
              name: itemResponse.name,
              slot: itemResponse.slot,
              category: itemResponse.category,
              item_type: itemResponse.item_type,
              minimum_level: itemResponse.minimum_level,
              enhancement_bonus: itemResponse.enhancement_bonus,
              icon: itemResponse.icon,
              pack: null,
              is_raid: false,
              is_rare: false,
              is_legacy: itemResponse.is_legacy,
            })),
          }
        : path === '/v1/augments'
          ? { total: 0, limit: 200, offset: 0, augments: [] }
          : [])
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })

  await page.goto('/resources/items/633')
  const pane = page.getByRole('region', { name: 'Item details', exact: true })
  const sun = pane.getByRole('button', { name: 'Sun slot', exact: true })
  await expect(sun).toHaveText('S')
  const sunBounds = await sun.boundingBox()
  expect(sunBounds?.width).toBe(26)
  expect(sunBounds?.height).toBe(26)
  await pane.getByRole('button', { name: 'Blue slot', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(sun).toBeFocused()
  const focusRing = sun.locator('..').locator('.augment-slot-focus-ring')
  for (const theme of ['dark', 'light']) {
    await page.evaluate((chosenTheme) => {
      document.documentElement.dataset.theme = chosenTheme
    }, theme)
    await expect(focusRing).toBeVisible()
    const clearance = await focusRing.evaluate((ring) => {
      const symbol = ring.parentElement!.querySelector('button')!
      const ringBounds = ring.getBoundingClientRect()
      const symbolBounds = symbol.getBoundingClientRect()
      return {
        left: symbolBounds.left - ringBounds.left,
        top: symbolBounds.top - ringBounds.top,
        right: ringBounds.right - symbolBounds.right,
        bottom: ringBounds.bottom - symbolBounds.bottom,
      }
    })
    for (const side of Object.values(clearance)) expect(side).toBeGreaterThan(2)
    expect(
      await focusRing.evaluate((ring) => getComputedStyle(ring, '::after').borderLeftWidth),
    ).toBe('2px')
  }
  await sun.click()
  await expect(pane.locator('.resources-augment-candidates__heading')).toHaveText(
    'Sun socket · 0 augments',
  )
  await page.getByRole('row', { name: /Armor of Sunlight/ }).hover()
  await expect(page.locator('[data-hover-card] .augment-slot-symbol--sun')).toHaveText('S')
  await page.mouse.move(0, 0)

  await page.goto('/resources/items/1831')
  const dinosaurSymbols = pane.locator('.augment-slot-symbol--dino')
  await expect(dinosaurSymbols).toHaveCount(4)
  await expect(dinosaurSymbols.first()).toHaveText('D')
  const dinosaurBounds = await dinosaurSymbols.first().boundingBox()
  expect(dinosaurBounds?.width).toBe(26)
  expect(dinosaurBounds?.height).toBeCloseTo(22.52, 1)
  await expect(pane.locator('.augment-slot-symbol')).toHaveCount(7)

  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/resources/items/4022')
  const longWord = pane.getByRole('button', {
    name: 'Crafting: Nearly Complete: Quality Ability Score (Legendary)',
    exact: true,
  })
  await expect(longWord).toHaveAttribute(
    'data-tip',
    'Crafting: Nearly Complete: Quality Ability Score (Legendary) slot',
  )
  expect(
    await longWord
      .locator('.augment-slot-word-label')
      .evaluate((label) => label.scrollWidth > label.clientWidth),
  ).toBe(true)
  await expect(pane.locator('.augment-slot-symbol')).toHaveCount(3)
  const symbolRightEdges = await pane
    .locator('.augment-slot-symbol')
    .evaluateAll((symbols) => symbols.map((symbol) => symbol.getBoundingClientRect().right))
  expect(Math.max(...symbolRightEdges)).toBeLessThanOrEqual(375)
  const colorless = pane.getByRole('button', { name: 'Colorless slot', exact: true })
  for (const [theme, stoneToken] of [
    ['dark', '--stone-300'],
    ['light', '--stone-200'],
  ] as const) {
    await page.evaluate((chosenTheme) => {
      document.documentElement.dataset.theme = chosenTheme
    }, theme)
    const colors = await colorless.evaluate((button, token) => {
      const swatch = document.createElement('span')
      swatch.style.backgroundColor = `var(${token})`
      document.body.append(swatch)
      const expectedBackground = getComputedStyle(swatch).backgroundColor
      swatch.remove()
      const style = getComputedStyle(button)
      return { background: style.backgroundColor, expectedBackground, ink: style.color }
    }, stoneToken)
    expect(colors.background).toBe(colors.expectedBackground)
    expect(colors.ink).toBe('rgb(20, 17, 14)')
  }
})

test('the item pane keeps the original kicker and title positions at desktop width', async ({
  page,
}) => {
  const item = { ...capturedArmor, id: 633, name: 'Armor of Sunlight' }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const response = path === '/v1/items/633' ? item : []
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })
  await page.goto('/resources/items/633')
  const pane = page.getByRole('region', { name: 'Item details', exact: true })
  const title = pane.getByRole('heading', {
    name: 'Armor of Sunlight',
    level: 2,
    exact: true,
  })
  await expect(title).toBeVisible()
  const positions = await pane.locator('.detail-card__header').evaluate((header) => {
    const kicker = header.querySelector<HTMLElement>('.detail-card__kicker-row .section-label')!
    const title = header.querySelector<HTMLElement>('.detail-card__name')!
    return {
      kickerToTitle: title.getBoundingClientRect().y - kicker.getBoundingClientRect().y,
      titleY: title.getBoundingClientRect().y - header.getBoundingClientRect().y,
      titleYInPane:
        title.getBoundingClientRect().y -
        header.closest('[data-detail-pane]')!.getBoundingClientRect().y,
    }
  })
  expect(Math.round(positions.kickerToTitle)).toBe(18)
  expect(Math.round(positions.titleY)).toBe(33)
  expect(Math.round(positions.titleYInPane)).toBe(86)
})

test('Escape from a tabbed detail pane returns to its focused list row at wide and narrow widths', async ({
  page,
}) => {
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const response =
      path === '/v1/items'
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
        : path === `/v1/items/${capturedRing.id}`
          ? capturedRing
          : path === '/v1/sets/93'
            ? capturedSet
            : []
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })

  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/resources/items')
    const row = page.getByRole('row', { name: /Adversion/ })
    await expect(row).toBeVisible()
    const pane = page.getByRole('region', { name: 'Item details', exact: true })
    const ringHeading = pane.getByRole('heading', { name: capturedRing.name, exact: true })
    const copyLink = pane.getByRole('button', {
      name: 'Copy link to this item',
      exact: true,
    })

    await row.focus()
    await page.keyboard.press('Enter')
    await expect(ringHeading).toBeVisible()
    await copyLink.focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Shift+Tab')
    await expect(copyLink).toBeFocused()
    await expect(page.getByRole('tooltip')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('tooltip')).toHaveCount(0)
    await expect(page).toHaveURL(new RegExp(`/resources/items/${capturedRing.id}$`))
    await expect(ringHeading).toBeVisible()
    await expect(copyLink).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/resources\/items$/)
    await expect(row).toBeFocused()
    await expect(row).toBeInViewport()
    await expect(ringHeading).toHaveCount(0)

    await page.keyboard.press('Enter')
    await expect(ringHeading).toBeVisible()
    await page.keyboard.press('Tab')
    await expect
      .poll(() => pane.evaluate((element) => element.contains(document.activeElement)))
      .toBe(true)
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/resources\/items$/)
    await expect(row).toBeFocused()
    await expect(row).toBeInViewport()
    await expect(ringHeading).toHaveCount(0)
  }
})

test('Escape cancels a keyboard column move in the detail enchantment ledger without closing the detail', async ({
  page,
}) => {
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        path === '/v1/items/487'
          ? capturedRing
          : path === '/v1/sets/93'
            ? capturedSet
            : path === '/v1/items'
              ? { total: 0, limit: 200, offset: 0, items: [] }
              : [],
      ),
    })
  })
  await page.setViewportSize({ width: 1440, height: 800 })
  await page.goto('/resources/items/487')
  const pane = page.getByRole('region', { name: 'Item details', exact: true })
  const headers = pane.locator('.resources-effect-ledger .ledger-header-cell')
  const typeHeader = headers.filter({ hasText: 'Type' })
  const firstColumnKey = await headers.first().getAttribute('data-column-key')
  await typeHeader.focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(typeHeader).toBeFocused()
  await expect(page.getByRole('tooltip')).toBeVisible()
  await page.keyboard.press('m')
  await expect(typeHeader).toHaveClass(/ledger-header-cell--dragging/)
  await page.evaluate(() => new Promise<void>((resolve) => setTimeout(resolve, 0)))
  await page.keyboard.press('ArrowRight')
  await expect(pane.locator('.ledger-header-cell--over')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(typeHeader).not.toHaveClass(/ledger-header-cell--dragging/)
  await expect(page.getByRole('tooltip')).toHaveCount(0)

  await expect(page).toHaveURL(/\/resources\/items\/487$/)
  await expect(headers.first()).toHaveAttribute('data-column-key', firstColumnKey!)
  await expect(typeHeader).toBeFocused()

  await page.keyboard.press('Escape')

  await expect(page).toHaveURL(/\/resources\/items$/)
})

test('Escape closes a socket from its header and keeps focus in the detail', async ({ page }) => {
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
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
              : [],
      ),
    })
  })
  await page.setViewportSize({ width: 1440, height: 800 })
  await page.goto('/resources/items')
  const row = page.getByRole('row', { name: /Adversion/ })
  await row.focus()
  await page.keyboard.press('Enter')
  const pane = page.getByRole('region', { name: 'Item details', exact: true })
  const yellowSocket = pane.getByRole('button', { name: 'Yellow slot', exact: true })
  await yellowSocket.click()
  const nameHeader = pane.locator('.resources-augment-candidates').getByRole('columnheader', {
    name: 'Name',
    exact: true,
  })
  await expect(nameHeader).toBeVisible()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(nameHeader).toBeFocused()
  await expect(page.getByRole('tooltip')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await expect(nameHeader).toBeFocused()
  await expect(yellowSocket).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')
  await expect(yellowSocket).toHaveAttribute('aria-expanded', 'false')
  await expect(yellowSocket).toBeFocused()
  await page.waitForTimeout(300)
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/resources\/items$/)
  await expect(row).toBeFocused()
})

test('detail sections share the title facts left edge at desktop and mobile widths', async ({
  page,
}) => {
  const items = [capturedWeapon, capturedArmor, capturedShield, capturedRing]
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const item = items.find((candidate) => path === `/v1/items/${candidate.id}`)
    const response =
      path === '/v1/items'
        ? {
            total: items.length,
            limit: 200,
            offset: 0,
            items: items.map((candidate) => ({
              id: candidate.id,
              name: candidate.name,
              slot: candidate.slot,
              category: candidate.category,
              item_type: candidate.item_type,
              minimum_level: candidate.minimum_level,
              enhancement_bonus: candidate.enhancement_bonus,
              icon: candidate.icon,
              pack: null,
              is_raid: false,
              is_rare: false,
              is_legacy: candidate.is_legacy,
            })),
          }
        : path === '/v1/sets/93'
          ? capturedSet
          : (item ?? [])
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })

  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 800 })
    for (const item of items) {
      await page.goto(`/resources/items/${item.id}`)
      const detailPane = page.getByRole('region', { name: 'Item details', exact: true })
      await expect(detailPane.getByRole('heading', { name: item.name, exact: true })).toBeVisible()
      const moreButton = detailPane.getByRole('button', { name: 'More details', exact: true })
      if (await moreButton.count()) await moreButton.click()
      const leftEdges = await detailPane.evaluate((pane) => {
        const selectors = {
          titleFact: '.detail-card__header .detail-card__fact',
          factGrid: '.detail-fact-grid',
          firstFactCell: '.detail-fact-grid__cell',
          drBypass: '.detail-dr-bypass',
          toggle: '.detail-stats__toggle-row',
          extras: '.detail-extras',
          description: '.resources-detail-description',
          effects: '.resources-effect-ledger',
        }
        return Object.fromEntries(
          Object.entries(selectors).flatMap(([name, selector]) => {
            const element = pane.querySelector(selector)
            return element ? [[name, Number(element.getBoundingClientRect().left.toFixed(2))]] : []
          }),
        )
      })
      expect(leftEdges.titleFact).toBeDefined()
      for (const name of ['toggle', 'extras', 'description', 'effects']) {
        expect(leftEdges[name], `${item.name} at ${width}px is missing ${name}`).toBeDefined()
      }
      if (item.id !== capturedRing.id) expect(leftEdges.firstFactCell).toBeDefined()
      if (item.id === capturedWeapon.id || item.id === capturedShield.id) {
        expect(leftEdges.drBypass).toBeDefined()
      }
      expect(
        Object.entries(leftEdges).every(([, left]) => Math.abs(left - leftEdges.titleFact) <= 0.5),
        `${item.name} at ${width}px: ${JSON.stringify(leftEdges)}`,
      ).toBe(true)
      console.info(`${item.name} at ${width}px: ${JSON.stringify(leftEdges)}`)
    }
  }
})

test('list selections share one history entry across a reload-free resize', async ({ page }) => {
  const items = [capturedRing, capturedArmor, capturedNecklace]
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const item = items.find((candidate) => path === `/v1/items/${candidate.id}`)
    const response =
      path === '/v1/items'
        ? {
            total: items.length,
            limit: 200,
            offset: 0,
            items: items.map((candidate) => ({
              id: candidate.id,
              name: candidate.name,
              slot: candidate.slot,
              category: candidate.category,
              item_type: candidate.item_type,
              minimum_level: candidate.minimum_level,
              enhancement_bonus: candidate.enhancement_bonus,
              icon: candidate.icon,
              pack: null,
              is_raid: false,
              is_rare: false,
              is_legacy: candidate.is_legacy,
            })),
          }
        : path === '/v1/sets/93'
          ? capturedSet
          : (item ?? [])
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })

  await page.setViewportSize({ width: 1440, height: 800 })
  await page.goto('/')
  await page.goto('/resources/items')
  const picker = page.locator('.resources-picker')
  const pane = page.getByRole('region', { name: 'Item details', exact: true })
  await expect(picker).toBeVisible()
  const search = picker.getByRole('searchbox', { name: 'Search items', exact: true })
  await search.fill('e')
  const initialHistoryLength = await page.evaluate(() => window.history.length)

  for (const item of items) {
    await picker.getByRole('row', { name: item.name, exact: false }).click()
    await expect(pane.getByRole('heading', { name: item.name, exact: true })).toBeVisible()
  }
  expect(await page.evaluate(() => window.history.length)).toBe(initialHistoryLength + 1)
  await page.setViewportSize({ width: 375, height: 800 })
  await expect(picker).toHaveCount(0)
  await expect(pane).toBeVisible()
  await page.getByRole('button', { name: 'Back to items', exact: true }).click()
  await expect(page).toHaveURL(/\/resources\/items$/)
  await expect(picker).toBeVisible()
  await expect(search).toHaveValue('e')
  await expect(pane).toHaveCount(0)

  await page.setViewportSize({ width: 1440, height: 800 })
  await expect(picker).toBeVisible()
  for (const item of items) {
    await picker.getByRole('row', { name: item.name, exact: false }).click()
    await expect(pane.getByRole('heading', { name: item.name, exact: true })).toBeVisible()
  }
  await page.setViewportSize({ width: 375, height: 800 })
  await expect(picker).toHaveCount(0)
  await page.goBack()
  await expect(page).toHaveURL(/\/resources\/items$/)
  await expect(picker).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
})

test('Tab wraps from the last set card control to its first piece', async ({ page }) => {
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const response =
      path === '/v1/items/487'
        ? capturedRing
        : path === '/v1/sets/93'
          ? capturedSet
          : path === '/v1/items'
            ? { total: 0, limit: 200, offset: 0, items: [] }
            : []
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })

  await page.goto('/resources/items/487')
  const detailPane = page.getByRole('region', { name: 'Item details', exact: true })
  const setBand = detailPane
    .locator('.resources-effect-ledger .ledger-row--heading')
    .filter({ hasText: capturedSet.name })
  await setBand.hover()
  const setCard = page.getByRole('dialog').filter({ hasText: capturedSet.name })
  await expect(setCard).toBeVisible()
  await page.keyboard.press('t')
  await expect(setCard).toHaveClass(/hover-card--pinned/)
  await expect(setCard).toBeFocused()

  const firstPiece = setCard.getByRole('button', {
    name: capturedSet.items[0].name,
    exact: false,
  })
  await expect(firstPiece).toBeVisible()
  const lastControl = setCard.locator('.resources-hover-effect-row[tabindex="0"]').last()
  await expect(lastControl).toBeVisible()
  await lastControl.focus()
  await page.keyboard.press('Tab')
  await expect(firstPiece).toBeFocused()
})

test('the full pane breadcrumb survives a three-deep stack and a narrow resize', async ({
  page,
}) => {
  const thirdSetPiece = capturedSet.items.find((item) => item.id === 1036)
  if (!thirdSetPiece) throw new Error('Expected the third captured set piece')
  const thirdItem = {
    ...capturedRing,
    id: thirdSetPiece.id,
    name: thirdSetPiece.name,
    slot: thirdSetPiece.slot,
    minimum_level: thirdSetPiece.minimum_level,
    wiki_url: null,
  }
  const items = [capturedRing, capturedRunearm, thirdItem]
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const item = items.find((candidate) => path === `/v1/items/${candidate.id}`)
    const response =
      path === '/v1/items'
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
        : path === '/v1/sets/93'
          ? capturedSet
          : (item ?? [])
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })

  await page.setViewportSize({ width: 1440, height: 800 })
  await page.goto('/resources/items')
  const picker = page.locator('.resources-picker')
  const pane = page.getByRole('region', { name: 'Item details', exact: true })
  const breadcrumb = page.getByRole('navigation', { name: 'Detail breadcrumb', exact: true })
  await expect(picker.getByRole('row', { name: /Adversion/ })).toBeVisible()
  await picker.getByRole('row', { name: /Adversion/ }).click()
  await expect(pane.getByRole('heading', { name: capturedRing.name, exact: true })).toBeVisible()

  const openSetPiece = async (name: string): Promise<void> => {
    const setBand = pane
      .locator('.resources-effect-ledger .ledger-row--heading')
      .filter({ hasText: capturedSet.name })
    await page.mouse.move(0, 0)
    await setBand.hover()
    const setCard = page.getByRole('dialog').filter({ hasText: capturedSet.name })
    await expect(setCard).toBeVisible()
    await page.keyboard.press('t')
    await expect(setCard).toHaveClass(/hover-card--pinned/)
    await setCard.getByRole('button', { name, exact: false }).click()
    await expect(pane.getByRole('heading', { name, exact: true })).toBeVisible()
  }

  await openSetPiece(capturedRunearm.name)
  await openSetPiece(thirdSetPiece.name)
  await expect(breadcrumb.getByRole('button', { name: 'Back to items', exact: true })).toBeVisible()
  await expect(breadcrumb.getByRole('button', { name: capturedRing.name })).toBeVisible()
  await expect(breadcrumb.getByRole('button', { name: capturedRunearm.name })).toBeVisible()
  await expect(breadcrumb.getByText(thirdSetPiece.name, { exact: true })).toBeVisible()
  await expect(breadcrumb.getByRole('button', { name: thirdSetPiece.name })).toHaveCount(0)
  await expect(page).toHaveURL(/\/resources\/items\/487$/)

  await page.setViewportSize({ width: 375, height: 800 })
  await expect(picker).toHaveCount(0)
  await expect(breadcrumb.getByRole('button', { name: capturedRing.name })).toBeVisible()
  await expect(breadcrumb.getByRole('button', { name: capturedRunearm.name })).toBeVisible()
  const currentCrumb = breadcrumb.getByText(thirdSetPiece.name, { exact: true })
  await expect(currentCrumb).toBeVisible()
  await expect(currentCrumb).toHaveAttribute('data-tip', thirdSetPiece.name)
  await page.evaluate(() => document.fonts.ready)
  expect(
    await breadcrumb
      .locator('.resources-detail-breadcrumb-link-wrap, .resources-detail-breadcrumb-current')
      .evaluateAll(
        (crumbs) => new Set(crumbs.map((crumb) => crumb.getBoundingClientRect().top)).size,
      ),
  ).toBeGreaterThan(1)
  await expect(currentCrumb).toHaveCSS('text-overflow', 'ellipsis')
  await expect
    .poll(() =>
      breadcrumb.evaluate((nav) =>
        [...nav.querySelectorAll('*')].every(
          (crumb) => crumb.getBoundingClientRect().right <= nav.getBoundingClientRect().right + 0.5,
        ),
      ),
    )
    .toBe(true)

  await page.getByRole('button', { name: 'Back one level', exact: true }).click()
  await expect(pane.getByRole('heading', { name: capturedRunearm.name, exact: true })).toBeVisible()
  await expect(breadcrumb.getByText(thirdSetPiece.name, { exact: true })).toHaveCount(0)
  await openSetPiece(thirdSetPiece.name)
  await page.goBack()
  await expect(page).toHaveURL(/\/resources\/items$/)
  await expect(picker).toBeVisible()
})

test('obtained-from rows keep source details left and quest metadata right at wide and narrow widths', async ({
  page,
}) => {
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const response =
      path === '/v1/items/7631'
        ? capturedNecklace
        : path === '/v1/items'
          ? { total: 0, limit: 200, offset: 0, items: [] }
          : []
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })

  await page.setViewportSize({ width: 1440, height: 800 })
  await page.goto('/resources/items/7631')
  const pane = page.getByRole('region', { name: 'Item details', exact: true })
  const questRow = pane
    .locator('.resources-item-source-row')
    .filter({ hasText: 'Friends in Low Places' })
  const leftColumn = questRow.locator('.resources-item-source-left')
  const rightColumn = questRow.locator('.resources-item-source-right')
  const sourceRowGeometry = (
    row: Element,
  ): {
    rowRight: number
    leftRight: number
    leftTop: number
    leftWidth: number
    rightLeft: number
    rightRight: number
    rightTop: number
  } => {
    const left = row.querySelector('.resources-item-source-left')
    const right = row.querySelector('.resources-item-source-right')
    if (!left || !right) throw new Error('Source row is missing a column')
    const rowBounds = row.getBoundingClientRect()
    const leftBounds = left.getBoundingClientRect()
    const rightBounds = right.getBoundingClientRect()
    return {
      rowRight: rowBounds.right,
      leftRight: leftBounds.right,
      leftTop: leftBounds.top,
      leftWidth: leftBounds.width,
      rightLeft: rightBounds.left,
      rightRight: rightBounds.right,
      rightTop: rightBounds.top,
    }
  }
  await expect(leftColumn.locator('.resources-item-source-title')).toHaveText(
    'Friends in Low Places',
  )
  await expect(rightColumn.locator('.resources-item-source-level')).toHaveText('Level 16 / 26')
  const wideGeometry = await questRow.evaluate(sourceRowGeometry)
  expect(wideGeometry.rightLeft).toBeGreaterThanOrEqual(wideGeometry.leftRight)
  expect(Math.abs(wideGeometry.leftTop - wideGeometry.rightTop)).toBeLessThan(2)

  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/resources/items/7631')
  await expect(
    pane.getByRole('heading', { name: capturedNecklace.name, exact: true }),
  ).toBeVisible()
  await expect(page.locator('.resources-picker')).toHaveCount(0)
  await expect(questRow).toBeVisible()
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  const narrowGeometry = await questRow.evaluate(sourceRowGeometry)
  expect(narrowGeometry.leftWidth).toBeGreaterThanOrEqual(120)
  expect(narrowGeometry.rightTop).toBeGreaterThan(narrowGeometry.leftTop)
  expect(Math.abs(narrowGeometry.rightRight - narrowGeometry.rowRight)).toBeLessThan(1)
})

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
  const title = page.getByRole('heading', { name: 'Armor 120', exact: true })
  await expect(title).toBeFocused()
  await expect(lastRow).toHaveClass(/ledger-row--selected/)
  const selectedRowStyle = await lastRow.evaluate((row) => {
    const rowStyle = getComputedStyle(row)
    const name = row.querySelector('.ledger-cell--primary')
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
      backgroundColor: getComputedStyle(row, '::before').backgroundColor,
      activeFill,
      nameColor: getComputedStyle(name).color,
      accentColor,
      nameWeight: getComputedStyle(name).fontWeight,
    }
  })
  expect(selectedRowStyle.boxShadow).toBe('none')
  expect(selectedRowStyle.backgroundColor).toBe(selectedRowStyle.activeFill)
  expect(selectedRowStyle.nameColor).toBe(selectedRowStyle.accentColor)
  expect(selectedRowStyle.nameWeight).toBe('600')
  await expect(search).not.toBeFocused()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(lastRow).toBeFocused()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/resources\/items$/)
  await page.keyboard.press('Enter')
  await expect(title).toBeFocused()
  await page.keyboard.press('/')
  await expect(search).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(search).toBeFocused()
})

test('item detail fact cells and columns render in pane and hover', async ({ page }) => {
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
  const enhancementRow = detailPane.locator('.resources-effect-ledger .ledger-row').first()
  await expect(enhancementRow.locator('.resources-effect-name')).toHaveText('Enhancement Bonus')
  await expect(enhancementRow.locator('.resources-effect-type')).toHaveText('Enhancement')
  await expect(enhancementRow.locator('.resources-effect-value')).toHaveText('+5')
  const grid = detailPane.locator('.detail-fact-grid')
  await expect(grid.locator('.detail-fact-grid__cell')).toHaveText([
    'Armor bonus16',
    'Max Dex bonus1',
  ])
  expect(
    await grid.evaluate((element) => {
      const style = getComputedStyle(element)
      return [style.display, style.columnGap, style.rowGap, style.padding]
    }),
  ).toEqual(['grid', '16px', '10px', '2px 0px 4px'])
  const moreButton = detailPane.getByRole('button', { name: 'More details', exact: true })
  expect(
    await moreButton.evaluate((button) => button.parentElement?.previousElementSibling?.className),
  ).toBe('detail-fact-grid')
  await moreButton.click()
  const extras = detailPane.locator('.detail-extras')
  await expect(extras.locator('.detail-extras__entry')).toHaveText([
    'Spell failure35%',
    'Check penalty-5',
    'MaterialMagesteel',
  ])
  expect(
    await detailPane
      .getByRole('button', { name: 'Less details', exact: true })
      .evaluate((button) => button.parentElement?.nextElementSibling?.className),
  ).toBe('detail-extras')
  expect(
    await extras.evaluate((element) => {
      const style = getComputedStyle(element)
      return [style.columnWidth, style.columnGap, style.marginTop, style.borderTopStyle]
    }),
  ).toEqual(['210px', '24px', '10px', 'none'])
  expect(
    await extras
      .locator('.detail-extras__entry')
      .first()
      .evaluate((entry) => {
        const style = getComputedStyle(entry)
        return [style.display, style.breakInside, style.alignItems, style.gap, style.padding]
      }),
  ).toEqual(['flex', 'avoid', 'baseline', '8px', '0px'])
  const itemRow = page.getByRole('row', { name: /Beholder Plate Armor/ })
  await itemRow.hover()
  await itemRow.press('t')
  await expect(itemRow).toHaveAttribute('data-hover-card-pinned', '')
  const hoverCard = page.locator('[data-hover-card]')
  await expect(hoverCard).toBeFocused()
  expect(await hoverCard.evaluate((card) => getComputedStyle(card).outlineColor)).toBe(
    'rgba(0, 0, 0, 0)',
  )
  expect(await itemRow.evaluate((row) => getComputedStyle(row, '::after').content)).not.toBe('none')
  await expect(hoverCard.locator('.detail-fact-grid__cell')).toHaveText([
    'Armor bonus16',
    'Max Dex bonus1',
  ])
  await hoverCard.getByRole('button', { name: 'More details', exact: true }).click()
  await expect(hoverCard.locator('.detail-extras__entry')).toHaveText([
    'Spell failure35%',
    'Check penalty-5',
    'MaterialMagesteel',
  ])
})

test('item 4127 keeps its set in the folded enchantment band in the pane and pinned card', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/resources/items/4127')
  const pane = page.getByRole('region', { name: 'Item details', exact: true })
  await expect(
    pane.getByRole('heading', {
      name: "Legendary Bracers of the Demon's Consort",
      exact: true,
    }),
  ).toBeVisible()
  await expect(pane.locator('.detail-card__fact .section-label')).toHaveText([
    'ML',
    'Gear slot',
    'Raid',
    'Rare',
    'Augments',
  ])
  const paneSetBand = pane.locator('.resources-effect-ledger .ledger-row--heading')
  await expect(paneSetBand).toBeVisible()
  await expect(paneSetBand).toHaveAttribute('aria-expanded', 'false')
  await expect(paneSetBand).toContainText(/set/i)
  await expect(paneSetBand).toContainText(/\d+ bonuses/)
  await expect(pane.locator('.resources-effect-ledger .ledger-row--subheading')).toHaveCount(0)

  await page
    .getByRole('searchbox', { name: 'Search items', exact: true })
    .fill("Legendary Bracers of the Demon's Consort")
  const itemRow = page.getByRole('row', { name: /Legendary Bracers of the Demon's Consort/ })
  await itemRow.hover()
  const card = page.locator('.hover-card[data-kind="item"]')
  await expect(card).toBeVisible()
  await itemRow.press('t')
  await expect(card).toHaveClass(/hover-card--pinned/)
  const enchantments = card.locator('[data-section-key="enchantments"]')
  const cardSetBand = enchantments.locator('.resources-effect-ledger .ledger-row--heading')
  await expect(cardSetBand).toBeVisible()
  await expect(cardSetBand).toHaveAttribute('aria-expanded', 'false')
  expect(await enchantments.locator('.resources-hover-effect-row').count()).toBeLessThanOrEqual(5)
  await cardSetBand.click()
  await expect(cardSetBand).toHaveAttribute('aria-expanded', 'true')
  await cardSetBand.focus()
  await page.keyboard.press('Space')
  await expect(cardSetBand).toHaveAttribute('aria-expanded', 'false')
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
  const setHeading = detailPane.locator('.resources-effect-ledger .ledger-row--heading')
  const tierEyebrow = detailPane.locator('.resources-effect-ledger .ledger-row--subheading')
  await expect(setHeading).toHaveAttribute('aria-expanded', 'false')
  await expect(setHeading).toContainText('7 bonuses')
  await expect(tierEyebrow).toHaveCount(0)
  await setHeading.click()
  await page.mouse.move(0, 0)
  await expect(setHeading).toHaveAttribute('aria-expanded', 'true')
  await expect(tierEyebrow).toHaveText('5 pieces')
  await page.evaluate(() => document.fonts.ready)
  expect((await setHeading.boundingBox())?.height).toBe(34)
  expect((await tierEyebrow.boundingBox())?.height).toBe(24)
  const effectBody = detailPane.locator('.resources-effect-ledger .ledger-plain-body')
  await expect(effectBody).not.toHaveAttribute('tabindex')
  await detailPane.locator('.resources-effect-ledger .ledger-header-cell').first().focus()
  await page.keyboard.press('Tab')
  await expect(setHeading).toBeFocused()
  await page.keyboard.press('End')
  const tierBonus = detailPane.locator('.resources-effect-ledger .ledger-row').last()
  await expect(tierBonus).toBeFocused()
  await expect(tierEyebrow).not.toBeFocused()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('t')
  await expect(tierBonus).toHaveAttribute('data-hover-card-pinned')
  await page.keyboard.press('Escape')
  await expect(tierBonus).toBeFocused()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/resources\/items\/487$/)
  await detailPane.locator('.resources-effect-ledger .ledger-header-cell').first().focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('End')
  await expect(tierBonus).toBeFocused()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(tierBonus).toBeFocused()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/resources\/items\/487$/)
  const header = detailPane.locator('.detail-card__header')
  const facts = header.locator('.detail-card__facts')
  const socket = facts.getByRole('button', { name: 'Yellow slot', exact: true })
  await expect(socket).toBeVisible()
  const symbolStyle = await socket.evaluate((symbol) => {
    const style = getComputedStyle(symbol)
    return { width: style.width, height: style.height, clipPath: style.clipPath }
  })
  expect(Number.parseFloat(symbolStyle.width)).toBe(26)
  expect(Number.parseFloat(symbolStyle.height)).toBeCloseTo(22.52, 1)
  expect(symbolStyle.clipPath.replaceAll('0px', '0')).toBe(
    'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)',
  )
  await expect(facts.locator('.detail-card__fact .section-label')).toHaveText([
    'ML',
    'Gear slot',
    'Raid',
    'Rare',
    'Augments',
  ])
  const factValueStyles = (grid: Element): Array<{ fontSize: string; fontWeight: string }> =>
    Array.from(grid.querySelectorAll('.detail-card__fact')).map((fact) => {
      const value =
        fact.querySelector(
          '.augment-slot-symbol, .num, .resources-hover-anchor, .detail-card__fact-empty',
        ) ?? fact.lastElementChild!
      const style = getComputedStyle(value)
      return { fontSize: style.fontSize, fontWeight: style.fontWeight }
    })
  expect(await facts.evaluate(factValueStyles)).toEqual([
    ...Array(4).fill({ fontSize: '15px', fontWeight: '600' }),
    { fontSize: '13px', fontWeight: '700' },
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
  await expect(hoverCard.locator('.detail-card__facts .augment-slot-symbol')).toBeVisible()
  expect(await hoverCard.locator('.detail-card__facts').evaluate(factValueStyles)).toEqual([
    ...Array(4).fill({ fontSize: '12.5px', fontWeight: '600' }),
    { fontSize: '13px', fontWeight: '700' },
  ])
  await page.keyboard.press('Escape')
  await expect(hoverCard).toHaveCount(0)
  await expect(page).toHaveURL(/\/resources\/items\/487$/)
  await page.mouse.move(0, 0)
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
  await expect(hoverCard.locator('.detail-card__facts .augment-slot-word')).toBeVisible()
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
  await expect(detailPane.locator('.detail-card__facts .augment-slot-word')).toBeVisible()
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

test('pinned item cards keep one fact row, three weapon stat columns, and expandable rows', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const slot = capturedArmor.augment_slots[0]
  const items = [
    {
      ...capturedArmor,
      id: 9001,
      name: 'Three Socket Armor',
      set: null,
      set_name: null,
      augment_slots: ['blue', 'green', 'colorless'].map((label, sort_order) => ({
        ...slot,
        family: 'standard',
        label,
        variant: label,
        sort_order,
      })),
    },
    { ...capturedWeapon, id: 9002, name: 'Five Stat Weapon', set: null, set_name: null },
  ]
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const item = items.find((candidate) => path === `/v1/items/${candidate.id}`)
    const response =
      item ??
      (path === '/v1/items'
        ? {
            total: items.length,
            limit: 200,
            offset: 0,
            items: items.map((candidate) => ({
              id: candidate.id,
              name: candidate.name,
              slot: candidate.slot,
              category: candidate.category,
              item_type: candidate.item_type,
              minimum_level: candidate.minimum_level,
              enhancement_bonus: candidate.enhancement_bonus,
              icon: candidate.icon,
              pack: null,
              is_raid: false,
              is_rare: false,
              is_legacy: candidate.is_legacy,
            })),
          }
        : path === '/v1/augments'
          ? { total: 0, limit: 200, offset: 0, augments: [] }
          : [])
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })
  await page.goto('/resources/items/9001')
  await page.getByRole('row', { name: /Three Socket Armor/ }).hover()
  const armorCard = page.locator('.hover-card[data-kind="item"]')
  await expect(armorCard).toBeVisible()
  await page.keyboard.press('t')
  await expect(armorCard).toHaveClass(/hover-card--pinned/)
  const armorKicker = await armorCard
    .locator('.detail-card__kicker-row .section-label')
    .boundingBox()
  const armorPinStatus = await armorCard.locator('.hover-card__pin-status').boundingBox()
  expect(armorKicker).not.toBeNull()
  expect(armorPinStatus).not.toBeNull()
  expect(armorKicker!.x + armorKicker!.width).toBeLessThanOrEqual(armorPinStatus!.x)
  const factTops = await armorCard
    .locator('.detail-card__fact')
    .evaluateAll((facts) => facts.map((fact) => Math.round(fact.getBoundingClientRect().top)))
  expect(new Set(factTops).size).toBe(1)
  const sourceRow = armorCard.locator('.resources-item-source-brief-row').first()
  await expect(sourceRow).toBeVisible()
  const sourcePositions = await sourceRow.evaluate((row) => {
    const rowBounds = row.getBoundingClientRect()
    const rowStyle = getComputedStyle(row)
    const inlineStart =
      Number.parseFloat(rowStyle.borderLeftWidth) + Number.parseFloat(rowStyle.paddingLeft)
    const inlineEnd =
      Number.parseFloat(rowStyle.borderRightWidth) + Number.parseFloat(rowStyle.paddingRight)
    const name = row.firstElementChild!.getBoundingClientRect()
    const details = row.lastElementChild!.getBoundingClientRect()
    return {
      contentLeft: rowBounds.left + inlineStart,
      contentWidth: rowBounds.width - inlineStart - inlineEnd,
      nameLeft: name.left,
      nameWidth: name.width,
      nameBottom: name.bottom,
      detailsLeft: details.left,
      detailsTop: details.top,
    }
  })
  expect(Math.abs(sourcePositions.nameWidth - sourcePositions.contentWidth)).toBeLessThanOrEqual(1)
  expect(Math.abs(sourcePositions.nameLeft - sourcePositions.contentLeft)).toBeLessThanOrEqual(1)
  expect(Math.abs(sourcePositions.detailsLeft - sourcePositions.nameLeft)).toBeLessThanOrEqual(1)
  expect(sourcePositions.detailsTop).toBeGreaterThanOrEqual(sourcePositions.nameBottom)
  await page.keyboard.press('Escape')
  await expect(armorCard).toHaveCount(0)

  await page.getByRole('row', { name: /Five Stat Weapon/ }).hover()
  const weaponCard = page.locator('.hover-card[data-kind="item"]')
  await expect(weaponCard).toBeVisible()
  await page.keyboard.press('t')
  await expect(weaponCard).toHaveClass(/hover-card--pinned/)
  const statTops = await weaponCard
    .locator('.detail-fact-grid__cell')
    .evaluateAll((cells) => cells.map((cell) => Math.round(cell.getBoundingClientRect().top)))
  expect(statTops.length).toBeGreaterThanOrEqual(5)
  expect(new Set(statTops.slice(0, 3)).size).toBe(1)
  expect(statTops[3]).toBeGreaterThan(statTops[0])
  const more = weaponCard.getByRole('button', { name: /\+\d+ more/ })
  await expect(more).toBeVisible()
  await more.click()
  const showLess = weaponCard.getByRole('button', { name: 'Show less', exact: true })
  await expect(showLess).toBeVisible()
  await showLess.focus()
  await page.keyboard.press('Enter')
  await expect(weaponCard.getByRole('button', { name: /\+\d+ more/ })).toBeVisible()
})

test('a loading bonus keeps its kicker line height until the kind arrives', async ({ page }) => {
  let releaseEffectDetail!: () => void
  const effectDetailResponse = new Promise<void>((resolve) => {
    releaseEffectDetail = resolve
  })
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/v1/effects/6') await effectDetailResponse
    const response =
      path === '/v1/items/7631'
        ? capturedNecklace
        : path === '/v1/effects/6'
          ? charismaDetail
          : path === '/v1/items'
            ? {
                total: 1,
                limit: 200,
                offset: 0,
                items: [
                  {
                    id: capturedNecklace.id,
                    name: capturedNecklace.name,
                    slot: capturedNecklace.slot,
                    category: capturedNecklace.category,
                    item_type: capturedNecklace.item_type,
                    minimum_level: capturedNecklace.minimum_level,
                    enhancement_bonus: capturedNecklace.enhancement_bonus,
                    icon: capturedNecklace.icon,
                    pack: null,
                    is_raid: false,
                    is_rare: false,
                    is_legacy: capturedNecklace.is_legacy,
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
  await page.goto('/resources/items/7631')
  await page.evaluate(() => document.fonts.ready)
  const detailPane = page.getByRole('region', { name: 'Item details', exact: true })
  const charismaRow = detailPane
    .locator('.resources-effect-ledger .ledger-row')
    .filter({ hasText: 'Charisma' })
    .first()
  await expect(charismaRow).toBeVisible()
  await expect
    .poll(async () => {
      const before = await charismaRow.boundingBox()
      await page.evaluate(
        () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
      )
      const after = await charismaRow.boundingBox()
      return before !== null && after !== null && Math.abs(before.y - after.y) < 1
    })
    .toBe(true)
  await charismaRow.hover()
  const card = page.locator('.hover-card[data-kind="enchantment"]')
  const kicker = card.locator('.detail-card__kicker-row')
  await expect(card.getByText('T to pin')).toBeVisible()
  await expect(kicker).toHaveText('')
  await expect(card.locator('.detail-card__name')).toHaveText('Charisma')
  await expect(card.locator('.detail-card__facts')).toContainText('Value+8')
  const loadingHeight = (await kicker.boundingBox())?.height
  releaseEffectDetail()
  await expect(kicker).toHaveText('Stat')
  expect((await kicker.boundingBox())?.height).toBe(loadingHeight)
})
