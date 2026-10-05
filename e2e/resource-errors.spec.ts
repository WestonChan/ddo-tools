import { expect, test } from '@playwright/test'
import capturedItem from '../src/features/resources/queries/fixtures/item7631.json' with { type: 'json' }

async function routeItemError(
  page: import('@playwright/test').Page,
  isMalformed: boolean,
): Promise<void> {
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/v1/items/7631') {
      if (isMalformed) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ...capturedItem, augment_slots: null }),
        })
      } else {
        await route.abort('failed')
      }
      return
    }
    const response =
      path === '/v1/items'
        ? {
            total: 1,
            limit: 200,
            offset: 0,
            items: [
              {
                id: capturedItem.id,
                name: capturedItem.name,
                slot: capturedItem.slot,
                category: capturedItem.category,
                item_type: capturedItem.item_type,
                minimum_level: capturedItem.minimum_level,
                enhancement_bonus: capturedItem.enhancement_bonus,
                icon: capturedItem.icon,
                pack: null,
                is_raid: false,
                is_rare: false,
                is_legacy: capturedItem.is_legacy,
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
}

test('malformed item detail offers a prefilled bug report', async ({ page }) => {
  await routeItemError(page, true)
  await page.goto('/resources/items/7631?private=ignored')
  const detail = page.getByRole('region', { name: 'Item details', exact: true })
  await expect(detail.getByText('Something went wrong on our side.')).toBeVisible()
  const report = detail.getByRole('link', { name: 'Report a bug', exact: true })
  const issueUrl = new URL((await report.getAttribute('href')) ?? '')
  expect(issueUrl.searchParams.get('body')).toContain('/v1/items/7631: augment_slots')
  expect(issueUrl.searchParams.get('body')).toContain('/resources/items/7631')
  expect(issueUrl.searchParams.get('body')).not.toContain('private=ignored')
  await expect(report).toHaveAttribute('target', '_blank')
})

test('an aborted item request offers connection guidance without a report link', async ({
  page,
}) => {
  await routeItemError(page, false)
  await page.goto('/resources/items/7631')
  const detail = page.getByRole('region', { name: 'Item details', exact: true })
  await expect(detail.getByText('Could not reach the game-data service.')).toBeVisible()
  await expect(detail.getByRole('button', { name: 'Retry', exact: true })).toBeVisible()
  await expect(detail.getByRole('link', { name: 'Report a bug', exact: true })).toHaveCount(0)
})
