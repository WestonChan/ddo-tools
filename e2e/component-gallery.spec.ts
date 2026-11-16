import { expect, test } from '@playwright/test'
import { COMPONENT_GALLERY_SECTIONS } from '../src/features/resources/dev/componentGallerySections'

test('every gallery section uses seeded data without requesting the API', async ({ page }) => {
  const apiRequests: string[] = []
  await page.route('**/v1/**', async (route) => {
    apiRequests.push(route.request().url())
    await route.fulfill({ status: 500, body: 'Unexpected gallery API request' })
  })
  await page.goto('/dev/components')
  await expect(
    page.getByRole('heading', { name: 'Interface components', exact: true }),
  ).toBeVisible()
  for (const section of COMPONENT_GALLERY_SECTIONS) {
    await page.getByRole('link', { name: section.label, exact: true }).click()
    await expect(
      page.getByRole('heading', { name: section.label, exact: true, level: 2 }),
    ).toBeInViewport()
  }
  await page.getByRole('link', { name: 'Item filters', exact: true }).click()
  const appliedSpecimen = page.locator('.component-gallery__specimen').filter({
    has: page.getByRole('heading', { name: 'Applied with match modes', exact: true }),
  })
  await appliedSpecimen.getByRole('button', { name: 'Show applied · 6', exact: true }).click()
  await expect(
    appliedSpecimen.getByRole('button', { name: 'Remove Raid: A gallery raid', exact: true }),
  ).toBeVisible()
  await expect(
    appliedSpecimen.getByRole('button', {
      name: 'Remove Crafting system: Thunder-Forged',
      exact: true,
    }),
  ).toBeVisible()
  expect(apiRequests).toEqual([])
})
