import { expect, test } from '@playwright/test'

const items = [
  {
    id: 1,
    name: 'Bloodstone',
    slot: 'Trinket',
    category: 'Trinket',
    item_type: null,
    minimum_level: 12,
    enhancement_bonus: null,
    icon: null,
    pack: 'Vault of Night',
    is_raid: true,
    is_rare: false,
    is_legacy: false,
  },
  {
    id: 2,
    name: 'Cloak of Night',
    slot: 'Back',
    category: 'Cloak',
    item_type: null,
    minimum_level: 20,
    enhancement_bonus: null,
    icon: null,
    pack: 'Shadowfell',
    is_raid: false,
    is_rare: false,
    is_legacy: false,
  },
  {
    id: 3,
    name: 'Ring of Spell Storing',
    slot: 'Ring',
    category: 'Ring',
    item_type: null,
    minimum_level: 4,
    enhancement_bonus: null,
    icon: null,
    pack: 'Vault of Night',
    is_raid: false,
    is_rare: true,
    is_legacy: false,
  },
]

function listPage<K extends string, Row>(
  rowsKey: K,
  rows: Row[],
): Record<K, Row[]> & {
  total: number
  limit: number
  offset: number
} {
  return { total: rows.length, limit: 10_000, offset: 0, [rowsKey]: rows } as Record<K, Row[]> & {
    total: number
    limit: number
    offset: number
  }
}

test.beforeEach(async ({ page }) => {
  await page.route('**/v1/**', async (route) => {
    const requestedUrl = new URL(route.request().url())
    const path = requestedUrl.pathname
    if (path === '/v1/items' && requestedUrl.searchParams.has('order')) {
      await route.fulfill({ status: 400, body: 'Unknown field: order' })
      return
    }
    const sortedItems = [...items]
    const sort = requestedUrl.searchParams.get('sort')
    if (sort === '-minimum_level' || sort === 'minimum_level') {
      const direction = sort.startsWith('-') ? -1 : 1
      sortedItems.sort((left, right) => (left.minimum_level - right.minimum_level) * direction)
    }
    const response =
      path === '/v1/items'
        ? {
            total: items.length,
            limit: 200,
            offset: Number(requestedUrl.searchParams.get('offset') ?? 0),
            items: sortedItems.slice(
              Number(requestedUrl.searchParams.get('offset') ?? 0),
              Number(requestedUrl.searchParams.get('offset') ?? 0) + 200,
            ),
          }
        : path === '/v1/enchantments'
          ? listPage('enchantments', [
              { name: 'Strength', kind: 'stat', item_count: 2 },
              { name: 'Vorpal', kind: 'effect', item_count: 1 },
            ])
          : path === '/v1/equipment-slots'
            ? listPage('equipment_slots', [
                { id: 1, name: 'Back', sort_order: 1, category: 'Armor' },
                { id: 2, name: 'Ring', sort_order: 2, category: 'Jewelry' },
                { id: 3, name: 'Trinket', sort_order: 3, category: 'Jewelry' },
              ])
            : path === '/v1/adventure-packs'
              ? listPage('adventure_packs', [
                  { id: 1, name: 'Shadowfell', is_free_to_play: false },
                  { id: 2, name: 'Vault of Night', is_free_to_play: false },
                ])
              : path === '/v1/quests'
                ? listPage('quests', [
                    { id: 7, name: 'The Raid', pack: 'Vault of Night', is_raid: true },
                    { id: 8, name: 'Another Raid', pack: 'Shadowfell', is_raid: true },
                  ])
                : listPage('items', [])
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })
})

test('filter chips keep their label width when values are selected', async ({ page }) => {
  await page.goto('/resources/items')
  await expect(page.getByRole('table', { name: 'items list', exact: true })).toBeVisible()
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  const chips = page.locator('.filter-chip-wrap .filter-chip')
  const widths = await Promise.all(
    [0, 1, 2].map((index) =>
      chips.nth(index).evaluate((chip) => (chip as HTMLElement).offsetWidth),
    ),
  )
  await chips.nth(0).click()
  await page.getByRole('spinbutton', { name: 'Min ML', exact: true }).fill('20')
  await page.getByRole('spinbutton', { name: 'Max ML', exact: true }).fill('32')
  await page.getByRole('spinbutton', { name: 'Max ML', exact: true }).press('Enter')
  const slotChip = chips.nth(1)
  await slotChip.click()
  await page.getByRole('option', { name: 'Back', exact: true }).click()
  await expect(slotChip.locator('.filter-chip-text')).toHaveText('Gear slot')
  await expect(slotChip).toHaveAttribute('data-tip', 'Gear slot: Back')
  await expect(page.locator('.filter-chip-wrap').nth(1).locator('.filter-chip-badge')).toHaveText(
    '1',
  )
  const enchantmentsChip = chips.nth(2)
  await enchantmentsChip.click()
  await page.getByRole('option', { name: 'Strength', exact: true }).click()
  await page.getByRole('option', { name: 'Vorpal', exact: true }).click()
  await expect(enchantmentsChip.locator('.filter-chip-text')).toHaveText('Enchantments')
  await expect(page.locator('.filter-chip-wrap').nth(2).locator('.filter-chip-badge')).toHaveText(
    '2',
  )
  for (const index of [0, 1, 2]) {
    expect(await chips.nth(index).evaluate((chip) => (chip as HTMLElement).offsetWidth)).toBe(
      widths[index],
    )
  }
})

test('selected picker options move to the top only when reopened and have no footer', async ({
  page,
}) => {
  await page.goto('/resources/items')
  await expect(page.getByRole('table', { name: 'items list', exact: true })).toBeVisible()
  const slotChip = page.getByRole('button', { name: 'Gear slot', exact: true })
  await slotChip.click()
  const picker = page.getByRole('group', { name: 'Gear slot picker', exact: true })
  const optionLabels = (): Promise<string[]> => picker.getByRole('option').allTextContents()
  await expect(picker.locator('.combobox-footer')).toHaveCount(0)
  await expect(picker.locator('.combobox-option-wrap--divider')).toHaveCount(0)
  expect(await optionLabels()).toEqual(['Back', 'Ring', 'Trinket'])
  await picker.getByRole('option', { name: 'Ring', exact: true }).click()
  expect(await optionLabels()).toEqual(['Back', 'Ring', 'Trinket'])
  await expect(picker.locator('.combobox-option-wrap--divider')).toHaveCount(0)
  await slotChip.click()
  await slotChip.click()
  expect(await optionLabels()).toEqual(['Ring', 'Back', 'Trinket'])
  const divider = picker.locator('.combobox-option-wrap--divider')
  await expect(divider.getByRole('option', { name: 'Ring', exact: true })).toBeVisible()
  expect(
    await divider.evaluate((element) => {
      const style = getComputedStyle(element)
      return [style.borderBottomWidth, style.paddingBottom, style.marginBottom]
    }),
  ).toEqual(['1px', '3px', '3px'])
  await picker.getByRole('combobox', { name: 'Gear slot', exact: true }).fill('Ring')
  await expect(divider).toHaveCount(0)
})

for (const theme of ['dark', 'light']) {
  test(`ledger and filters work in ${theme} theme at desktop and 375px`, async ({ page }) => {
    await page.addInitScript((selectedTheme) => localStorage.setItem('theme', selectedTheme), theme)
    await page.goto('/resources/items')
    await expect(page.getByRole('table', { name: 'items list', exact: true })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await expect(page.getByRole('columnheader', { name: /Pack/ })).toBeVisible()
    await page.getByRole('button', { name: 'Sort ML', exact: true }).click()
    await expect
      .poll(() =>
        page.locator('.ledger-header-cell[data-column-key="ml"]').getAttribute('aria-sort'),
      )
      .toBe('descending')
    const rows = page.getByRole('table', { name: 'items list', exact: true }).getByRole('row')
    await expect(rows.nth(1)).toContainText('Cloak of Night')
    await rows.nth(1).focus()
    await page.keyboard.press('End')
    await expect(rows.nth(3)).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/resources\/items\/3$/)

    await page.goto('/resources/items')
    await page.setViewportSize({ width: 375, height: 800 })
    await expect(page.getByRole('columnheader', { name: /Slot/ })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Pack/ })).toHaveCount(0)
    await expect(page.getByRole('columnheader', { name: /Raid/ })).toHaveCount(0)
    const chipGroups = page.locator('.filter-chip-group')
    const firstGroup = await chipGroups.nth(0).boundingBox()
    const secondGroup = await chipGroups.nth(1).boundingBox()
    expect(firstGroup).not.toBeNull()
    expect(secondGroup).not.toBeNull()
    expect((secondGroup?.y ?? 0) > (firstGroup?.y ?? 0)).toBe(true)
    await page.getByRole('button', { name: 'Pack', exact: true }).click()
    const picker = page.getByRole('group', { name: 'Pack picker', exact: true })
    const pickerBox = await picker.boundingBox()
    expect(pickerBox).not.toBeNull()
    expect(pickerBox?.x ?? -1).toBeGreaterThanOrEqual(0)
    expect((pickerBox?.x ?? 0) + (pickerBox?.width ?? 0)).toBeLessThanOrEqual(375)
  })
}

test('sorts with the signed sort field and keeps Raid and Rare headers static', async ({
  page,
}) => {
  const itemRequests: URL[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname === '/v1/items') itemRequests.push(url)
  })
  await page.goto('/resources/items')
  for (const column of ['raid', 'rare']) {
    const header = page.locator(`.ledger-header-cell[data-column-key="${column}"]`)
    await expect(header).toBeVisible()
    expect(await header.getAttribute('aria-sort')).toBeNull()
    await expect(header.getByRole('button')).toHaveCount(0)
  }
  await page.getByRole('button', { name: 'Sort ML', exact: true }).click()
  await expect
    .poll(() => itemRequests.at(-1)?.searchParams.getAll('sort'))
    .toEqual(['-minimum_level'])
  expect(itemRequests.at(-1)?.searchParams.has('order')).toBe(false)
  await page.getByRole('button', { name: 'Sort ML', exact: true }).click()
  await expect
    .poll(() => itemRequests.at(-1)?.searchParams.getAll('sort'))
    .toEqual(['minimum_level'])
  expect(itemRequests.at(-1)?.searchParams.has('order')).toBe(false)
})

test('sends all active filters in one item request and removes cleared parameters', async ({
  page,
}) => {
  const itemRequests: URL[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname === '/v1/items') itemRequests.push(url)
  })
  await page.goto('/resources/items')
  await expect(page.getByRole('table', { name: 'items list', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Gear slot', exact: true }).click()
  await page.getByRole('option', { name: 'Back', exact: true }).click()
  await page.getByRole('option', { name: 'Ring', exact: true }).click()
  await page.getByRole('button', { name: 'Enchantments', exact: true }).click()
  const enchantmentPicker = page.getByRole('group', { name: 'Enchantments picker', exact: true })
  await expect(enchantmentPicker.getByRole('button', { name: 'Any', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  const requestsBeforeMatch = itemRequests.length
  const parametersBeforeMatch = itemRequests.at(-1)?.searchParams.toString()
  await enchantmentPicker.getByRole('button', { name: 'All', exact: true }).click()
  await expect(enchantmentPicker.getByRole('button', { name: 'All', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect(itemRequests).toHaveLength(requestsBeforeMatch)
  expect(itemRequests.at(-1)?.searchParams.toString()).toBe(parametersBeforeMatch)
  await page.getByRole('option', { name: 'Strength', exact: true }).click()
  await page.getByRole('option', { name: /Vorpal/ }).click()
  await expect.poll(() => itemRequests.at(-1)?.searchParams.get('enchantment_match')).toBe('all')
  await page.getByRole('checkbox', { name: 'Include set bonuses', exact: true }).check()
  await page.getByRole('button', { name: 'Enchantments', exact: true }).click()
  await page.getByRole('button', { name: 'Pack', exact: true }).click()
  await page.getByRole('option', { name: 'Shadowfell', exact: true }).click()
  await page.getByRole('option', { name: 'Vault of Night', exact: true }).click()
  await page.getByRole('button', { name: 'Pack', exact: true }).click()
  await page.getByRole('button', { name: 'Raid', exact: true }).click()
  await page.getByRole('option', { name: /The Raid/ }).click()
  await page.getByRole('option', { name: /Another Raid/ }).click()
  await page.getByRole('button', { name: 'Raid', exact: true }).click()
  await page.getByRole('button', { name: 'ML range', exact: true }).click()
  await page.getByRole('spinbutton', { name: 'Min ML', exact: true }).fill('20')
  await page.getByRole('spinbutton', { name: 'Max ML', exact: true }).fill('32')
  await page.getByRole('spinbutton', { name: 'Max ML', exact: true }).press('Enter')
  await page.getByRole('button', { name: 'Rare only', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Search items', exact: true }).fill('torc')
  await expect.poll(() => itemRequests.at(-1)?.searchParams.get('q')).toBe('torc')
  const finalParameters = Object.fromEntries(
    [...itemRequests.at(-1)!.searchParams].filter(
      ([key]) => !['slot', 'pack', 'quest', 'enchantment'].includes(key),
    ),
  )
  expect(finalParameters).toEqual({
    q: 'torc',
    min_level: '20',
    max_level: '32',
    enchantment_match: 'all',
    include_set_bonuses: 'true',
    rare: 'true',
    limit: '200',
    offset: '0',
  })
  expect(itemRequests.at(-1)!.searchParams.getAll('enchantment')).toEqual(['Strength', 'Vorpal'])
  expect(itemRequests.at(-1)!.searchParams.getAll('slot')).toEqual(['Back', 'Ring'])
  expect(itemRequests.at(-1)!.searchParams.getAll('pack')).toEqual(['Shadowfell', 'Vault of Night'])
  expect(itemRequests.at(-1)!.searchParams.getAll('quest')).toEqual(['7', '8'])
  expect(
    itemRequests.filter((url) => Object.fromEntries(url.searchParams).q === 'torc'),
  ).toHaveLength(1)
  await page.getByRole('button', { name: 'Show applied · 10', exact: true }).click()
  await page.getByRole('button', { name: 'Remove Gear slot: Back', exact: true }).click()
  await expect.poll(() => itemRequests.at(-1)?.searchParams.getAll('slot')).toEqual(['Ring'])
  expect(itemRequests.at(-1)?.searchParams.getAll('enchantment')).toEqual(['Strength', 'Vorpal'])
  expect(new Set(itemRequests.map((url) => url.search)).size).toBe(itemRequests.length)
})

test('loads the next 200 items near the virtual list end without resetting scroll', async ({
  page,
}) => {
  const pagedItems = Array.from({ length: 201 }, (_, index) => ({
    ...items[0],
    id: index + 1,
    name: `Item ${String(index + 1).padStart(3, '0')}`,
  }))
  const offsets: number[] = []
  await page.route(/\/v1\/items\?/, async (route) => {
    const url = new URL(route.request().url())
    const offset = Number(url.searchParams.get('offset'))
    offsets.push(offset)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total: pagedItems.length,
        limit: 200,
        offset,
        items: pagedItems.slice(offset, offset + 200),
      }),
    })
  })
  await page.goto('/resources/items')
  await expect(page.getByText('201 results')).toBeVisible()
  expect(offsets).toEqual([0])
  const ledgerBody = page.locator('.ledger-body')
  await ledgerBody.evaluate((element) => element.scrollTo(0, element.scrollHeight))
  const scrollTopBeforeAppend = await ledgerBody.evaluate((element) => element.scrollTop)
  await expect.poll(() => offsets).toEqual([0, 200])
  expect(await ledgerBody.evaluate((element) => element.scrollTop)).toBeGreaterThanOrEqual(
    scrollTopBeforeAppend,
  )
  await ledgerBody.evaluate((element) => element.scrollTo(0, element.scrollHeight))
  await expect(page.getByRole('row', { name: /Item 201/ })).toBeVisible()
  expect(await ledgerBody.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
})
