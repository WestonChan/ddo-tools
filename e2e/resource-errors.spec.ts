import { expect, test } from '@playwright/test'
import capturedItem from '../src/features/resources/queries/fixtures/item-stolen-necklace-level-25.json' with { type: 'json' }
import capturedPacks from '../src/lib/api/fixtures/adventure-packs.json' with { type: 'json' }
import capturedEffects from '../src/features/resources/queries/fixtures/effects-page.json' with { type: 'json' }

for (const width of [1440, 375]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`first-page notices share content sizing and centring at ${width}px in ${colorScheme}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ colorScheme })
      const pack = capturedPacks.adventure_packs[0].name
      const effect = capturedEffects.effects[0]
      const bonusType = effect.bonus_types.find((type) => type.item_count > 0)!.name
      let responseKind: 'success' | 'ordinary' | 'rejected' = 'success'
      await page.route('**/v1/**', async (route) => {
        const url = new URL(route.request().url())
        if (url.pathname === '/v1/adventure-packs') return route.fulfill({ json: capturedPacks })
        if (url.pathname === '/v1/effects') return route.fulfill({ json: capturedEffects })
        expect(url.pathname).toBe('/v1/items')
        if (responseKind !== 'success') {
          expect(url.searchParams.getAll('pack')).toContain(pack)
          expect(url.searchParams.getAll('bonus')).toContain(`${effect.name}:${bonusType}`)
          return route.fulfill({
            status: 400,
            json: {
              error:
                responseKind === 'ordinary'
                  ? `unknown bonus type ${JSON.stringify(bonusType)}`
                  : `unknown pack ${JSON.stringify(pack)}; accepted values: ${capturedPacks.adventure_packs[1].name}`,
            },
          })
        }
        return route.fulfill({ json: { total: 0, limit: 200, offset: 0, items: [] } })
      })
      await page.goto('/resources/items')
      await page.getByRole('button', { name: 'Pack', exact: true }).click()
      await page.getByRole('option', { name: pack, exact: true }).click()
      await page.getByRole('button', { name: 'Pack', exact: true }).click()
      await page.getByRole('button', { name: 'Bonuses', exact: true }).click()
      await page
        .getByRole('option')
        .filter({ hasText: effect.name })
        .getByText('Stat · Any type')
        .click()
      await page
        .getByRole('option')
        .getByText(`${effect.name} · ${bonusType}`, { exact: true })
        .click()
      await page.getByRole('button', { name: 'Bonuses', exact: true }).click()

      for (const noticeKind of ['ordinary', 'rejected'] as const) {
        responseKind = noticeKind
        await page.reload()
        const slot = page.locator('.resources-list-error')
        const notice = slot.getByRole('status')
        await expect(notice).toContainText(
          noticeKind === 'ordinary'
            ? 'Something went wrong on our side.'
            : `Pack: "${pack}" is no longer in the game data.`,
        )
        const container = slot.locator(':scope > .resources-status')
        await expect(container.locator(':scope > .status-notice')).toHaveCount(1)
        await expect(container).toHaveCSS('display', 'flex')
        await expect(container).toHaveCSS('flex-direction', 'column')
        await expect(slot).toHaveCSS('align-items', 'center')
        await page.evaluate(() => document.fonts.ready)
        const slotBounds = (await slot.boundingBox())!
        const containerBounds = (await container.boundingBox())!
        const noticeBounds = (await notice.boundingBox())!
        expect(noticeBounds).toEqual(containerBounds)
        expect(noticeBounds.width).toBeLessThanOrEqual(slotBounds.width)
        if (width === 1440) expect(noticeBounds.width).toBeLessThan(slotBounds.width)
        expect(noticeBounds.x + noticeBounds.width / 2).toBeCloseTo(
          slotBounds.x + slotBounds.width / 2,
          1,
        )
        await testInfo.attach(`${noticeKind}-bounds`, {
          body: JSON.stringify({
            slot: slotBounds,
            container: containerBounds,
            notice: noticeBounds,
          }),
          contentType: 'application/json',
        })
        await testInfo.attach(`${noticeKind}-notice`, {
          body: await notice.screenshot(),
          contentType: 'image/png',
        })
      }
    })
  }
}

test('an unknown slug shows the missing link and a way back to items', async ({ page }) => {
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    await route.fulfill(
      path === '/v1/items/unknown-item'
        ? { status: 404, json: { error: 'Not found' } }
        : { json: { total: 0, limit: 200, offset: 0, items: [] } },
    )
  })
  await page.goto('/resources/items/unknown-item')
  await expect(page.getByText('Item link "unknown-item" was not found.')).toBeVisible()
  await page.getByRole('button', { name: 'Back to items', exact: true }).click()
  await expect(page).toHaveURL('/resources/items')
})

async function routeItemError(
  page: import('@playwright/test').Page,
  isMalformed: boolean,
): Promise<void> {
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === `/v1/items/${capturedItem.slug}`) {
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
                slug: capturedItem.slug,
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
  await page.goto(`/resources/items/${capturedItem.slug}?private=ignored`)
  const detail = page.getByRole('region', { name: 'Item details', exact: true })
  await expect(detail.getByText('Something went wrong on our side.')).toBeVisible()
  const report = detail.getByRole('link', { name: 'Report a bug', exact: true })
  const issueUrl = new URL((await report.getAttribute('href')) ?? '')
  expect(issueUrl.searchParams.get('body')).toContain(
    `/v1/items/${capturedItem.slug}: augment_slots`,
  )
  expect(issueUrl.searchParams.get('body')).toContain(`/resources/items/${capturedItem.slug}`)
  expect(issueUrl.searchParams.get('body')).not.toContain('private=ignored')
  await expect(report).toHaveAttribute('target', '_blank')
})

test('an aborted item request offers connection guidance without a report link', async ({
  page,
}) => {
  await routeItemError(page, false)
  await page.goto(`/resources/items/${capturedItem.slug}`)
  const detail = page.getByRole('region', { name: 'Item details', exact: true })
  await expect(detail.getByText('Could not reach the game-data service.')).toBeVisible()
  await expect(detail.getByRole('button', { name: 'Retry', exact: true })).toBeVisible()
  await expect(detail.getByRole('link', { name: 'Report a bug', exact: true })).toHaveCount(0)
})
