import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear())
  await page.goto('/dev/components')
})

test('note hints start their intended or assumed value on a new rendered line', async ({
  page,
}) => {
  for (const [title, prefix] of [
    ['Game-bug notes', 'Intended:'],
    ['Unverified notes', 'Assumed:'],
  ]) {
    const specimen = page.locator('.component-gallery__specimen').filter({
      has: page.getByRole('heading', { name: title, exact: true }),
    })
    for (const variant of ['pane', 'hover']) {
      const marker = specimen.locator(`.detail-card--${variant} .resources-note-marker`).first()
      await marker.hover()
      const hint = page.getByRole('tooltip')
      await expect(hint).toContainText(prefix)
      const geometry = await hint.evaluate((element, prefix) => {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
        let node: Node | null
        while ((node = walker.nextNode())) {
          const text = node.textContent ?? ''
          const index = text.indexOf(prefix)
          if (index < 1) continue
          const range = document.createRange()
          range.setStart(node, 0)
          range.setEnd(node, 1)
          const start = range.getBoundingClientRect()
          range.setStart(node, index - 2)
          range.setEnd(node, index - 1)
          const last = range.getBoundingClientRect()
          range.setStart(node, index)
          range.setEnd(node, index + 1)
          const value = range.getBoundingClientRect()
          return { startX: start.x, valueX: value.x, lastBottom: last.bottom, valueTop: value.top }
        }
        throw new Error('Note hint has no value label')
      }, prefix)
      expect(geometry.valueTop).toBeGreaterThanOrEqual(geometry.lastBottom)
      expect(geometry.valueX).toBeCloseTo(geometry.startX, 1)
      await page.mouse.move(0, 0)
      await expect(hint).toBeHidden()
    }
  }
})

test('note marker kinds receive their token colours from CSS', async ({ page }) => {
  for (const [title, kind, token] of [
    ['Game-bug notes', 'game_bug', '--status-warn'],
    ['Unverified notes', 'unverified', '--text-muted'],
  ]) {
    const specimen = page.locator('.component-gallery__specimen').filter({
      has: page.getByRole('heading', { name: title, exact: true }),
    })
    const markers = specimen.locator('.resources-note-marker')
    for (const marker of await markers.all()) {
      await expect(marker).toHaveAttribute('data-note-kind', kind)
      await expect(marker).not.toHaveAttribute('style')
      expect(
        await marker.evaluate((element, token) => {
          const probe = document.createElement('span')
          probe.style.color = `var(${token})`
          element.append(probe)
          const expected = getComputedStyle(probe).color
          probe.remove()
          return getComputedStyle(element).color === expected
        }, token),
      ).toBe(true)
    }
    expect(await markers.count()).toBeGreaterThan(0)
  }
})
