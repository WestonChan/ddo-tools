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
