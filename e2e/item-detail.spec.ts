import { expect, test } from '@playwright/test'
import capturedRing from '../src/features/resources/queries/fixtures/item487.json' with { type: 'json' }

test('opening an augment socket leaves every fact in its original position', async ({ page }) => {
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const response =
      path === '/v1/items/487'
        ? capturedRing
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
  const facts = detailPane.locator('.detail-card__facts')
  await expect(facts.getByRole('button', { name: 'Yellow', exact: true })).toBeVisible()
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
  await facts.getByRole('button', { name: 'Yellow', exact: true }).click()
  const ledger = detailPane.locator('.resources-augment-candidates')
  await expect(ledger).toBeVisible()
  await expect(ledger.locator('.resources-augment-candidates__heading')).toHaveText(
    'Yellow socket · 0 augments',
  )
  expect(await facts.evaluate((grid) => grid.nextElementSibling?.className)).toBe(
    'resources-augment-candidates',
  )
  expect(await factPositions()).toEqual(closedPositions)
  await facts.getByRole('button', { name: 'Yellow', exact: true }).click()
  await expect(ledger).toHaveCount(0)
  expect(await factPositions()).toEqual(closedPositions)
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
        ? {
            id: 831,
            name: 'Beholder Plate Armor',
            slot: 'Body',
            category: 'Armor',
            item_type: null,
            minimum_level: 10,
            enhancement_bonus: null,
            material: null,
            race_required: null,
            icon: null,
            description: null,
            drop_location: null,
            set_name: null,
            accepts_sentience: false,
            is_minor_artifact: false,
            wiki_url: null,
            is_legacy: false,
            weapon: null,
            armor: null,
            bonuses: [],
            modifiers: [],
            effects: [],
            augment_slots: [],
            clickies: [],
            set: null,
            quests: [],
            quest_chains: [],
            sagas: [],
            adventure_packs: [],
            crafting_systems: [],
            challenge_packs: [],
            vendors: [],
            events: [],
            starter_rewards: [],
            sources: [],
          }
        : path === '/v1/items'
          ? {
              total: 1,
              limit: 200,
              offset: 0,
              items: [
                {
                  id: 831,
                  name: 'Beholder Plate Armor',
                  slot: 'Body',
                  category: 'Armor',
                  item_type: null,
                  minimum_level: 10,
                  enhancement_bonus: null,
                  icon: null,
                  pack: null,
                  is_raid: false,
                  is_rare: false,
                  is_legacy: false,
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
  await expect(page.locator('[data-hover-card]')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-hover-card]')).toHaveCount(0)
  await expect(page).toHaveURL(/\/resources\/items\/831$/)
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/resources\/items$/)
  await expect(itemRow).toBeFocused()
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/resources/items/831')
  await expect(
    detailPane.getByRole('heading', { name: 'Beholder Plate Armor', exact: true }),
  ).toBeVisible()
  await expect(picker).toHaveCount(0)
  await expect(detailPane).toBeInViewport()
  await expect(detailPane.locator('.detail-card__facts')).toBeInViewport()
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
