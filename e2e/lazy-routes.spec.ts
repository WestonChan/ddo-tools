import { expect, test, type Locator, type Page } from '@playwright/test'
import capturedArmor from '../src/features/resources/queries/fixtures/item-beholder-plate-armor.json' with { type: 'json' }

interface LazyRoute {
  path: string
  navBarLinkName: string
  loadedView: (page: Page) => Locator
}

const LAZY_ROUTES: LazyRoute[] = [
  {
    path: '/characters',
    navBarLinkName: 'Characters & builds',
    loadedView: (page) => page.locator('.character-view'),
  },
  {
    path: '/overview',
    navBarLinkName: 'Build overview',
    loadedView: (page) => page.locator('.build-overview-view'),
  },
  {
    path: '/build-plan',
    navBarLinkName: 'Build plan',
    loadedView: (page) => page.getByRole('heading', { name: 'Levels', exact: true }),
  },
  {
    path: '/gear',
    navBarLinkName: 'Gear',
    loadedView: (page) => page.locator('.gear-view'),
  },
  {
    path: '/resources',
    navBarLinkName: 'Resources',
    loadedView: (page) => page.getByRole('table', { name: 'items list', exact: true }),
  },
  {
    path: '/settings',
    navBarLinkName: 'Settings',
    loadedView: (page) => page.getByRole('group', { name: 'Theme', exact: true }),
  },
]

const itemDetailPath = `/resources/items/${capturedArmor.slug}`

async function serveOneItem(page: Page): Promise<void> {
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
                slug: capturedArmor.slug,
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
        : path === `/v1/items/${capturedArmor.slug}`
          ? capturedArmor
          : []
    await route.fulfill({ json: response })
  })
}

async function expectNoViewCrash(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'This view crashed', exact: true })).toHaveCount(0)
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await serveOneItem(page)
})

for (const lazyRoute of LAZY_ROUTES) {
  test(`${lazyRoute.path} loads on direct navigation`, async ({ page }) => {
    await page.goto(lazyRoute.path)
    await expect(lazyRoute.loadedView(page)).toBeVisible()
    await expectNoViewCrash(page)
  })

  test(`${lazyRoute.path} loads from its nav bar link`, async ({ page }) => {
    await page.goto('/')
    await page
      .locator('.app-nav-bar')
      .getByRole('link', { name: lazyRoute.navBarLinkName, exact: true })
      .click()
    await expect(page).toHaveURL(lazyRoute.path)
    await expect(lazyRoute.loadedView(page)).toBeVisible()
    await expectNoViewCrash(page)
  })
}

test('a resource category loads on direct navigation', async ({ page }) => {
  await page.goto('/resources/items')
  await expect(page.getByRole('table', { name: 'items list', exact: true })).toBeVisible()
  await expectNoViewCrash(page)
})

test('a resource detail loads on direct navigation', async ({ page }) => {
  await page.goto(itemDetailPath)
  await expect(page.getByRole('heading', { name: capturedArmor.name, exact: true })).toBeVisible()
  await expectNoViewCrash(page)
})

test('a resource detail loads from its list row after arriving by link', async ({ page }) => {
  await page.goto('/')
  await page.locator('.app-nav-bar').getByRole('link', { name: 'Resources', exact: true }).click()
  await page.getByRole('row', { name: new RegExp(capturedArmor.name) }).click()
  await expect(page).toHaveURL(itemDetailPath)
  await expect(page.getByRole('heading', { name: capturedArmor.name, exact: true })).toBeVisible()
  await expectNoViewCrash(page)
})
