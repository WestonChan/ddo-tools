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

function pinnedGroup(page: Page, label: string): Locator {
  return page
    .getByRole('region', { name: 'Pinned stats', exact: true })
    .getByRole('group', { name: label, exact: true })
}

function statNamesIn(container: Locator): Promise<string[]> {
  return container.locator('.stats-panel-stat-name').allTextContents()
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/build-plan')
  await page.getByRole('region', { name: 'Pinned stats', exact: true }).waitFor()
})

test('dragging a stat from All stats onto a pinned row pins it before that row', async ({
  page,
}) => {
  const allStats = page.getByRole('region', { name: 'All stats', exact: true })
  await dragByPointer(
    page,
    allStats.getByRole('button', { name: 'Move Spell pen', exact: true }),
    pinnedGroup(page, 'Offense').getByRole('listitem').filter({ hasText: 'Spell crit' }),
  )

  expect(await statNamesIn(pinnedGroup(page, 'Offense'))).toEqual([
    'Evocation DC',
    'Spell power (fire)',
    'Spell pen',
    'Spell crit',
  ])
  expect(await statNamesIn(allStats)).not.toContain('Spell pen')
})

test('dropping a stat on the New group gap creates a group named after its All stats group', async ({
  page,
}) => {
  await dragByPointer(
    page,
    page
      .getByRole('region', { name: 'All stats', exact: true })
      .getByRole('button', { name: 'Move HP', exact: true }),
    page.getByRole('region', { name: 'Pinned stats', exact: true }).getByText('New group').last(),
  )

  expect(await statNamesIn(pinnedGroup(page, 'Defense'))).toEqual(['HP'])
})

test('dragging a pinned stat out of the pinned groups unpins it', async ({ page }) => {
  const allStats = page.getByRole('region', { name: 'All stats', exact: true })
  await dragByPointer(
    page,
    pinnedGroup(page, 'Offense').getByRole('button', { name: 'Move Spell crit', exact: true }),
    allStats.getByRole('heading', { name: 'Defense', exact: true }),
  )

  expect(await statNamesIn(pinnedGroup(page, 'Offense'))).toEqual([
    'Evocation DC',
    'Spell power (fire)',
  ])
  expect(await statNamesIn(allStats)).toContain('Spell crit')
})
