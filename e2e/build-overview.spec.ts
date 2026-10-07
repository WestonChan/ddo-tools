import { test, expect, type Locator, type Page } from '@playwright/test'

async function dragByPointer(page: Page, handle: Locator, target: Locator): Promise<void> {
  const handleBox = (await handle.boundingBox())!
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y - 12, { steps: 4 })
  const targetBox = (await target.boundingBox())!
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
    steps: 8,
  })
  await page.mouse.up()
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/overview')
  await page.getByRole('region', { name: 'Hotbars', exact: true }).waitFor()
})

test('a filled slot shows its code without spilling the full ability name', async ({ page }) => {
  const polarRay = page.getByRole('button', { name: 'Slot 4: Polar Ray', exact: true })
  const statBlock = polarRay.locator('xpath=following-sibling::*[1]')
  await expect(polarRay).toContainText('PR')
  await expect(statBlock).toHaveCSS('width', '1px')
  await expect(statBlock).toHaveCSS('clip-path', 'inset(50%)')
})

test('the ability card uses the shared header without covering its pin hint', async ({ page }) => {
  const polarRay = page.getByRole('button', { name: 'Slot 4: Polar Ray', exact: true })
  await polarRay.hover()
  const card = page.locator('.hover-card[data-kind="ability"]')
  await expect(card.getByText('T to pin')).toBeVisible()
  await expect(card.locator('.detail-card__kicker-row .section-label')).toHaveText('Ability')
  const kicker = await card.locator('.detail-card__kicker-row .section-label').boundingBox()
  const pinStatus = await card.locator('.hover-card__pin-status').boundingBox()
  expect(kicker).not.toBeNull()
  expect(pinStatus).not.toBeNull()
  expect(kicker!.x + kicker!.width).toBeLessThanOrEqual(pinStatus!.x)
})

test('dragging a pool ability onto an empty slot places it there and keeps the page', async ({
  page,
}) => {
  const nukesBar = page
    .getByRole('region', { name: 'Hotbars', exact: true })
    .getByRole('group', { name: 'Nukes', exact: true })
  const quickenSpell = page
    .getByRole('region', { name: 'Ability pools', exact: true })
    .getByRole('button', { name: 'Quicken Spell', exact: true })

  await dragByPointer(page, quickenSpell, nukesBar.getByRole('listitem').nth(6))

  await expect(
    nukesBar.getByRole('button', { name: 'Slot 7: Quicken Spell', exact: true }),
  ).toBeVisible()
  await expect(nukesBar.getByRole('listitem').nth(7)).toHaveAccessibleName('Slot 8: empty')
  await expect(page).toHaveURL(/\/overview$/)
})
