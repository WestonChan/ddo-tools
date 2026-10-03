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
                  ])
                : listPage('items', [])
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })
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
  await page.getByRole('button', { name: 'Slot', exact: true }).click()
  await page.getByRole('option', { name: 'Back', exact: true }).click()
  await page.getByRole('button', { name: 'Enchantments', exact: true }).click()
  await page.getByRole('option', { name: 'Strength', exact: true }).click()
  await page.getByRole('option', { name: /Vorpal/ }).click()
  await page.getByRole('checkbox', { name: 'Include set bonuses', exact: true }).check()
  await page.getByRole('button', { name: 'Enchantments · 2', exact: true }).click()
  await page.getByRole('button', { name: 'Raid', exact: true }).click()
  await page.getByRole('option', { name: /The Raid/ }).click()
  await page.getByRole('button', { name: 'ML', exact: true }).click()
  await page.getByRole('spinbutton', { name: 'Min ML', exact: true }).fill('20')
  await page.getByRole('spinbutton', { name: 'Max ML', exact: true }).fill('32')
  await page.getByRole('spinbutton', { name: 'Max ML', exact: true }).press('Enter')
  await page.getByRole('button', { name: 'Rare only', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Search items', exact: true }).fill('torc')
  await expect.poll(() => itemRequests.at(-1)?.searchParams.get('q')).toBe('torc')
  const finalParameters = Object.fromEntries(
    [...itemRequests.at(-1)!.searchParams].filter(([key]) => key !== 'enchantment'),
  )
  expect(finalParameters).toEqual({
    q: 'torc',
    slot: 'Back',
    min_level: '20',
    max_level: '32',
    quest: '7',
    include_set_bonuses: 'true',
    rare: 'true',
    limit: '200',
    offset: '0',
  })
  expect(itemRequests.at(-1)!.searchParams.getAll('enchantment')).toEqual(['Strength', 'Vorpal'])
  expect(
    itemRequests.filter((url) => Object.fromEntries(url.searchParams).q === 'torc'),
  ).toHaveLength(1)
  await page.getByRole('button', { name: 'Clear Slot', exact: true }).click()
  await expect.poll(() => itemRequests.at(-1)?.searchParams.has('slot')).toBe(false)
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
