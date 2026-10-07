import { expect, test } from '@playwright/test'
import capturedArmor from '../src/features/resources/queries/fixtures/effects-item-831.json' with { type: 'json' }
import capturedRing from '../src/features/resources/queries/fixtures/effects-item-487.json' with { type: 'json' }
import capturedSet from '../src/features/resources/queries/fixtures/effects-set-93.json' with { type: 'json' }

const focusedRoutes = [
  '/',
  '/resources/items',
  '/resources/items/633',
  '/settings',
  '/gear',
  '/build-plan',
]
const viewportWidths = [1440, 375]

function captureRestGeometry(): void {
  const restGeometry = new WeakMap<
    HTMLElement,
    {
      width: number
      height: number
      radii: string[]
      sibling: Element | null
      siblingLeft: number
      siblingTop: number
    }
  >()
  const focusableElements = document.querySelectorAll<HTMLElement>(
    'a[href], button, input, select, textarea, [tabindex], .app-content',
  )
  for (const element of focusableElements) {
    const bounds = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    const nextElement = element.nextElementSibling
    const sibling = nextElement?.classList.contains('focus-ring-proxy--sibling')
      ? (element.parentElement?.nextElementSibling ?? null)
      : (nextElement ?? element.parentElement?.nextElementSibling ?? null)
    const siblingBounds = sibling?.getBoundingClientRect()
    restGeometry.set(element, {
      width: bounds.width,
      height: bounds.height,
      radii: [
        style.borderTopLeftRadius,
        style.borderTopRightRadius,
        style.borderBottomRightRadius,
        style.borderBottomLeftRadius,
      ],
      sibling,
      siblingLeft: siblingBounds ? siblingBounds.left - bounds.left : 0,
      siblingTop: siblingBounds ? siblingBounds.top - bounds.top : 0,
    })
  }
  ;(
    window as typeof window & { focusRingRestGeometry?: typeof restGeometry }
  ).focusRingRestGeometry = restGeometry
}

function auditFocusedRing(): { stop: string; stopPath: string; issues: string[] } {
  const focusedElement = document.activeElement as HTMLElement
  if (focusedElement === document.body) {
    return { stop: 'document.body', stopPath: 'body', issues: [] }
  }
  const stopPath: number[] = []
  for (let element = focusedElement; element.parentElement; element = element.parentElement) {
    stopPath.unshift(Array.from(element.parentElement.children).indexOf(element))
  }
  const issues: string[] = []
  const bounds = focusedElement.getBoundingClientRect()
  const style = getComputedStyle(focusedElement)
  const restGeometry = (
    window as typeof window & { focusRingRestGeometry?: WeakMap<HTMLElement, unknown> }
  ).focusRingRestGeometry?.get(focusedElement) as
    | {
        width: number
        height: number
        radii: string[]
        sibling: Element | null
        siblingLeft: number
        siblingTop: number
      }
    | undefined
  if (!restGeometry) {
    issues.push('missing rest geometry')
  } else {
    if (Math.abs(bounds.width - restGeometry.width) > 0.5) {
      issues.push(
        `width changed on focus (${restGeometry.width.toFixed(1)} to ${bounds.width.toFixed(1)})`,
      )
    }
    if (Math.abs(bounds.height - restGeometry.height) > 0.5) {
      issues.push(
        `height changed on focus (${restGeometry.height.toFixed(1)} to ${bounds.height.toFixed(1)})`,
      )
    }
    const radii = [
      style.borderTopLeftRadius,
      style.borderTopRightRadius,
      style.borderBottomRightRadius,
      style.borderBottomLeftRadius,
    ]
    if (radii.some((radius, index) => radius !== restGeometry.radii[index])) {
      issues.push('shape changed on focus')
    }
    if (restGeometry.sibling?.isConnected) {
      const siblingBounds = restGeometry.sibling.getBoundingClientRect()
      if (
        Math.abs(siblingBounds.left - bounds.left - restGeometry.siblingLeft) > 0.5 ||
        Math.abs(siblingBounds.top - bounds.top - restGeometry.siblingTop) > 0.5
      ) {
        issues.push('next sibling moved on focus')
      }
    }
  }

  const nextProxy = focusedElement.nextElementSibling
  const parentProxy = focusedElement.parentElement
  const ringTarget = nextProxy?.classList.contains('focus-ring-proxy--sibling')
    ? (nextProxy as HTMLElement)
    : parentProxy?.classList.contains('focus-ring-proxy')
      ? parentProxy
      : ((focusedElement.closest('.focus-ring-surface, .search-well') as HTMLElement | null) ??
        focusedElement)
  const targetStyle = getComputedStyle(ringTarget)
  const pseudoStyle = getComputedStyle(ringTarget, '::after')
  const targetBounds = ringTarget.getBoundingClientRect()
  const isVisibleColor = (color: string): boolean =>
    !['transparent', 'rgba(0, 0, 0, 0)'].includes(color)
  const hasVisibleOutline = (outlineStyle: CSSStyleDeclaration): boolean =>
    outlineStyle.outlineStyle !== 'none' &&
    Number.parseFloat(outlineStyle.outlineWidth) > 0 &&
    isVisibleColor(outlineStyle.outlineColor)
  const hasVisibleProxyBorder = (borderStyle: CSSStyleDeclaration): boolean =>
    borderStyle.borderLeftStyle !== 'none' &&
    Number.parseFloat(borderStyle.borderLeftWidth) > 0 &&
    isVisibleColor(borderStyle.borderLeftColor)
  if (
    targetStyle.display === 'none' ||
    targetStyle.visibility === 'hidden' ||
    Number.parseFloat(targetStyle.opacity) === 0
  ) {
    issues.push('hidden')
  }
  const isPseudoVisible =
    pseudoStyle.content !== 'none' &&
    pseudoStyle.content !== 'normal' &&
    pseudoStyle.borderLeftStyle === 'solid' &&
    Number.parseFloat(pseudoStyle.borderLeftWidth) >= 2 &&
    isVisibleColor(pseudoStyle.borderLeftColor)
  const isNativeVisible =
    targetStyle.outlineStyle === 'solid' &&
    Number.parseFloat(targetStyle.outlineWidth) >= 2 &&
    isVisibleColor(targetStyle.outlineColor)
  if (!isNativeVisible && !isPseudoVisible) {
    issues.push('invisible')
  }
  if (ringTarget !== focusedElement && hasVisibleOutline(style)) {
    issues.push('second ring on focused element')
  }

  const ringCandidates = document.querySelectorAll<HTMLElement>(
    '.focus-ring-proxy, .focus-ring-surface, .search-well, a[href], button, input, select, textarea, [tabindex]',
  )
  for (const candidate of ringCandidates) {
    if (candidate === ringTarget || candidate === focusedElement) continue
    const isPinnedAnchor =
      candidate.hasAttribute('data-hover-card-pinned') ||
      candidate.querySelector('[data-hover-card-pinned]') !== null ||
      (candidate.classList.contains('focus-ring-proxy--sibling') &&
        candidate.previousElementSibling?.hasAttribute('data-hover-card-pinned'))
    if (isPinnedAnchor) continue
    if (hasVisibleOutline(getComputedStyle(candidate))) {
      issues.push(`ring on unfocused ${candidate.tagName}.${candidate.className}`)
    }
    if (candidate.classList.contains('focus-ring-proxy')) {
      const candidatePseudoStyle = getComputedStyle(candidate, '::after')
      if (hasVisibleOutline(candidatePseudoStyle) || hasVisibleProxyBorder(candidatePseudoStyle)) {
        issues.push(`proxy ring on unfocused ${candidate.tagName}.${candidate.className}`)
      }
    }
  }

  if (isNativeVisible || isPseudoVisible) {
    const ringWidth = isPseudoVisible
      ? Number.parseFloat(pseudoStyle.borderLeftWidth)
      : Number.parseFloat(targetStyle.outlineWidth)
    const ringOuter = isPseudoVisible
      ? {
          left: targetBounds.left + Number.parseFloat(pseudoStyle.left),
          top: targetBounds.top + Number.parseFloat(pseudoStyle.top),
          right: targetBounds.right - Number.parseFloat(pseudoStyle.right),
          bottom: targetBounds.bottom - Number.parseFloat(pseudoStyle.bottom),
        }
      : {
          left: targetBounds.left - Number.parseFloat(targetStyle.outlineOffset) - ringWidth,
          top: targetBounds.top - Number.parseFloat(targetStyle.outlineOffset) - ringWidth,
          right: targetBounds.right + Number.parseFloat(targetStyle.outlineOffset) + ringWidth,
          bottom: targetBounds.bottom + Number.parseFloat(targetStyle.outlineOffset) + ringWidth,
        }
    const ringInner = {
      left: ringOuter.left + ringWidth,
      top: ringOuter.top + ringWidth,
      right: ringOuter.right - ringWidth,
      bottom: ringOuter.bottom - ringWidth,
    }
    if (
      ringTarget !== focusedElement &&
      (ringOuter.left > bounds.left + 0.5 ||
        ringOuter.top > bounds.top + 0.5 ||
        ringOuter.right < bounds.right - 0.5 ||
        ringOuter.bottom < bounds.bottom - 0.5)
    ) {
      issues.push('ring does not contain focused element')
    }
    if (
      ringOuter.left < -0.5 ||
      ringOuter.top < -0.5 ||
      ringOuter.right > window.innerWidth + 0.5 ||
      ringOuter.bottom > window.innerHeight + 0.5
    ) {
      issues.push('clipped by viewport')
    }
    const cornerStyle = isPseudoVisible ? pseudoStyle : targetStyle
    const rootStyle = getComputedStyle(document.documentElement)
    const scaleRadii = ['--radius-xs', '--radius-sm', '--radius-md', '--radius-lg'].map((token) =>
      Number.parseFloat(rootStyle.getPropertyValue(token)),
    )
    if (
      [
        cornerStyle.borderTopLeftRadius,
        cornerStyle.borderTopRightRadius,
        cornerStyle.borderBottomRightRadius,
        cornerStyle.borderBottomLeftRadius,
      ].some(
        (radius) =>
          !Number.isFinite(Number.parseFloat(radius)) ||
          !scaleRadii.some(
            (scaleRadius) => Math.abs(Number.parseFloat(radius) - scaleRadius) < 0.5,
          ),
      )
    ) {
      issues.push('off-scale ring corner')
    }
    if (ringWidth < 2) issues.push('thin')
    for (let ancestor = ringTarget.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const ancestorStyle = getComputedStyle(ancestor)
      if (
        !/(hidden|clip|auto|scroll)/.test(`${ancestorStyle.overflowX} ${ancestorStyle.overflowY}`)
      ) {
        continue
      }
      const ancestorBounds = ancestor.getBoundingClientRect()
      const clip = {
        left: ancestorBounds.left + ancestor.clientLeft,
        top: ancestorBounds.top + ancestor.clientTop,
        right: ancestorBounds.left + ancestor.clientLeft + ancestor.clientWidth,
        bottom: ancestorBounds.top + ancestor.clientTop + ancestor.clientHeight,
      }
      if (
        ringOuter.left < clip.left - 0.5 ||
        ringOuter.top < clip.top - 0.5 ||
        ringOuter.right > clip.right + 0.5 ||
        ringOuter.bottom > clip.bottom + 0.5
      ) {
        issues.push(`clipped by ${ancestor.className || ancestor.tagName}`)
        break
      }
    }
    const minimumClearance = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--focus-ring-text-clearance'),
    )
    if (!Number.isFinite(minimumClearance)) issues.push('missing text clearance token')
    const occludedEdgeWidth =
      pseudoStyle.boxShadow === 'none' || !Number.isFinite(minimumClearance)
        ? 0
        : ringWidth + minimumClearance
    const textRoot = ringTarget.contains(focusedElement) ? ringTarget : focusedElement
    const textNodes = document.createTreeWalker(textRoot, NodeFilter.SHOW_TEXT)
    while (textNodes.nextNode()) {
      if (!textNodes.currentNode.textContent?.trim()) continue
      const textRange = document.createRange()
      textRange.selectNodeContents(textNodes.currentNode)
      for (const textBounds of textRange.getClientRects()) {
        const visibleTextBounds = {
          left: Math.max(
            textBounds.left,
            occludedEdgeWidth ? ringOuter.left + occludedEdgeWidth : 0,
          ),
          top: Math.max(textBounds.top, occludedEdgeWidth ? ringOuter.top + occludedEdgeWidth : 0),
          right: Math.min(
            textBounds.right,
            occludedEdgeWidth ? ringOuter.right - occludedEdgeWidth : window.innerWidth,
          ),
          bottom: Math.min(
            textBounds.bottom,
            occludedEdgeWidth ? ringOuter.bottom - occludedEdgeWidth : window.innerHeight,
          ),
        }
        for (
          let ancestor = textNodes.currentNode.parentElement;
          ancestor;
          ancestor = ancestor.parentElement
        ) {
          const ancestorStyle = getComputedStyle(ancestor)
          const isClippingHorizontally = /(hidden|clip|auto|scroll)/.test(ancestorStyle.overflowX)
          const isClippingVertically = /(hidden|clip|auto|scroll)/.test(ancestorStyle.overflowY)
          if (!isClippingHorizontally && !isClippingVertically) continue
          const ancestorBounds = ancestor.getBoundingClientRect()
          if (isClippingHorizontally) {
            visibleTextBounds.left = Math.max(
              visibleTextBounds.left,
              ancestorBounds.left + ancestor.clientLeft,
            )
            visibleTextBounds.right = Math.min(
              visibleTextBounds.right,
              ancestorBounds.left + ancestor.clientLeft + ancestor.clientWidth,
            )
          }
          if (isClippingVertically) {
            visibleTextBounds.top = Math.max(
              visibleTextBounds.top,
              ancestorBounds.top + ancestor.clientTop,
            )
            visibleTextBounds.bottom = Math.min(
              visibleTextBounds.bottom,
              ancestorBounds.top + ancestor.clientTop + ancestor.clientHeight,
            )
          }
        }
        if (
          visibleTextBounds.left >= visibleTextBounds.right ||
          visibleTextBounds.top >= visibleTextBounds.bottom
        ) {
          continue
        }
        const clearances = {
          left: visibleTextBounds.left - ringInner.left,
          top: visibleTextBounds.top - ringInner.top,
          right: ringInner.right - visibleTextBounds.right,
          bottom: ringInner.bottom - visibleTextBounds.bottom,
        }
        const [closestSide, closestClearance] = Object.entries(clearances).reduce(
          (closest, side) => (side[1] < closest[1] ? side : closest),
        )
        if (
          closestClearance < minimumClearance - 0.5 &&
          !issues.some((issue) => issue.startsWith('too close to text'))
        ) {
          issues.push(`too close to text (${closestSide} ${closestClearance.toFixed(1)}px)`)
        }
      }
    }
  }
  const stop = `${focusedElement.tagName}.${focusedElement.className} ${focusedElement.textContent?.trim().slice(0, 35)}`
  return { stop, stopPath: stopPath.join('.'), issues: [...new Set(issues)] }
}

test.beforeEach(async ({ page }) => {
  await page.route('**/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const item = {
      ...capturedArmor,
      id: 633,
      augment_slots: ['blue', 'sun'].map((label, sort_order) => ({
        ...capturedArmor.augment_slots[0],
        family: 'standard',
        label,
        variant: label,
        sort_order,
      })),
      quests: capturedArmor.quests.map((quest) => ({
        ...quest,
        name: 'The Key to the Mythal',
      })),
    }
    const listedItem = {
      id: item.id,
      name: item.name,
      slot: item.slot,
      category: item.category,
      item_type: item.item_type,
      minimum_level: item.minimum_level,
      enhancement_bonus: item.enhancement_bonus,
      icon: item.icon,
      pack: 'Reign of Madness',
      is_raid: false,
      is_rare: false,
      is_legacy: item.is_legacy,
    }
    const response =
      path === '/v1/items/633'
        ? item
        : path === '/v1/items/487'
          ? capturedRing
          : path === '/v1/sets/93'
            ? capturedSet
            : path === '/v1/items'
              ? { total: 1, limit: 200, offset: 0, items: [listedItem] }
              : { total: 0, limit: 200, offset: 0, items: [], sets: [], effects: [], quests: [] }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })
})

for (const viewportWidth of viewportWidths) {
  for (const route of focusedRoutes) {
    test(`every Tab stop keeps its box and has a clear, rounded, unclipped ring at ${viewportWidth}px on ${route}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewportWidth, height: 900 })
      await page.goto(route)
      await expect(page.locator('.app-nav-bar')).toBeVisible()
      if (route === '/resources/items' || (route.endsWith('/633') && viewportWidth === 1440)) {
        await expect(page.getByRole('table', { name: 'items list', exact: true })).toBeVisible()
      }
      if (route.endsWith('/633')) {
        await expect(page.getByRole('region', { name: 'Item details', exact: true })).toBeVisible()
      }
      if (route === '/settings') {
        await expect(page.getByRole('group', { name: 'Theme', exact: true })).toBeVisible()
      }
      if (route === '/gear') {
        await expect(page.locator('.gear-view-toolbar .underline-tab').first()).toBeVisible()
      }
      if (route === '/build-plan' && viewportWidth === 1440) {
        await expect(page.getByRole('complementary', { name: 'Stats', exact: true })).toBeVisible()
      }
      await page.evaluate(() => document.fonts.ready)

      const ringFailures: string[] = []
      const visitedStops = new Set<string>()
      let firstStop = ''
      let didWrap = false
      for (let tabIndex = 0; tabIndex < 250; tabIndex += 1) {
        await page.evaluate(captureRestGeometry)
        await page.keyboard.press('Tab')
        const focusedRing = await page.evaluate(auditFocusedRing)
        if (focusedRing.stopPath === 'body' && visitedStops.size > 5) {
          didWrap = true
          break
        }
        if (!firstStop) firstStop = focusedRing.stopPath
        else if (focusedRing.stopPath === firstStop) {
          didWrap = true
          break
        }
        visitedStops.add(focusedRing.stopPath)
        if (focusedRing.issues.length) {
          ringFailures.push(`${focusedRing.stop}: ${focusedRing.issues.join(', ')}`)
        }
      }
      expect(didWrap).toBe(true)
      expect(visitedStops.size).toBeGreaterThan(5)
      expect(ringFailures).toEqual([])
    })
  }
}

test('the build plan scroll region keeps keyboard scrolling and an inset ring', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto('/build-plan')
  const scrollRegion = page.locator('.app-content')
  await expect(scrollRegion).toBeVisible()
  for (let tabIndex = 0; tabIndex < 100; tabIndex += 1) {
    if (await scrollRegion.evaluate((element) => element === document.activeElement)) break
    await page.keyboard.press('Tab')
  }
  await expect(scrollRegion).toBeFocused()
  expect(
    await scrollRegion.evaluate((element) => {
      const ring = getComputedStyle(element, '::after')
      return ring.content !== 'none' && ring.boxShadow !== 'none'
    }),
  ).toBe(true)
  await page.keyboard.press('PageDown')
  await expect.poll(() => scrollRegion.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
})

for (const viewportWidth of viewportWidths) {
  test(`resting ledger rows keep square dividers and set headings keep their original top corners at ${viewportWidth}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewportWidth, height: 900 })
    await page.goto('/resources/items')
    const listRow = page.locator('.ledger-row').first()
    await expect(listRow).toBeVisible()
    const listShape = await listRow.evaluate((row) => ({
      corners: getComputedStyle(row).borderRadius,
      fillContent: getComputedStyle(row, '::before').content,
      height: row.getBoundingClientRect().height,
    }))
    expect(listShape).toEqual({ corners: '0px', fillContent: 'none', height: 32 })

    await page.goto('/resources/items/487')
    const setHeading = page.locator('.resources-effect-ledger .ledger-row--heading').first()
    await expect(setHeading).toBeVisible()
    const headingCorners = await setHeading.evaluate((row) => {
      const style = getComputedStyle(row)
      return [
        style.borderTopLeftRadius,
        style.borderTopRightRadius,
        style.borderBottomRightRadius,
        style.borderBottomLeftRadius,
      ]
    })
    expect(headingCorners).toEqual(['3px', '3px', '0px', '0px'])
    const otherCorners = await page
      .locator('.resources-effect-ledger .ledger-row:not(.ledger-row--heading)')
      .evaluateAll((rows) => rows.map((row) => getComputedStyle(row).borderRadius))
    expect(otherCorners.length).toBeGreaterThan(0)
    expect(otherCorners.every((radius) => radius === '0px')).toBe(true)
  })
}

for (const theme of ['Dark', 'Light']) {
  test(`${theme.toLowerCase()} focus rings contrast with their surfaces at representative stops`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/settings')
    await page
      .getByRole('group', { name: 'Theme', exact: true })
      .getByRole('button', { name: theme, exact: true })
      .click()
    await page.goto('/resources/items/633')
    await expect(page.getByRole('region', { name: 'Item details', exact: true })).toBeVisible()

    for (const selector of [
      '.nav-bar-row',
      '.ledger-row',
      '.resources-item-source-title .resources-hover-anchor',
    ]) {
      const stop = page.locator(selector).first()
      for (let tabIndex = 0; tabIndex < 200; tabIndex += 1) {
        if (await stop.evaluate((element) => element === document.activeElement)) break
        await page.keyboard.press('Tab')
      }
      await expect(stop).toBeFocused()
      const contrast = await stop.evaluate((element) => {
        const ringTarget = element.parentElement?.classList.contains('focus-ring-proxy')
          ? element.parentElement
          : element
        const pseudo = getComputedStyle(ringTarget, '::after')
        const ringColor =
          pseudo.content === 'none'
            ? getComputedStyle(ringTarget).outlineColor
            : pseudo.borderLeftColor
        const canvas = document.createElement('canvas')
        canvas.width = 1
        canvas.height = 1
        const context = canvas.getContext('2d')!
        context.fillStyle = getComputedStyle(document.body).backgroundColor
        context.fillRect(0, 0, 1, 1)
        const ancestors: Element[] = []
        for (let ancestor = ringTarget.parentElement; ancestor; ancestor = ancestor.parentElement) {
          ancestors.unshift(ancestor)
        }
        for (const ancestor of ancestors) {
          context.fillStyle = getComputedStyle(ancestor).backgroundColor
          context.fillRect(0, 0, 1, 1)
        }
        const surface = context.getImageData(0, 0, 1, 1).data
        context.fillStyle = ringColor
        context.fillRect(0, 0, 1, 1)
        const ring = context.getImageData(0, 0, 1, 1).data
        const luminance = (color: Uint8ClampedArray): number =>
          [0.2126, 0.7152, 0.0722].reduce((sum, weight, index) => {
            const channel = color[index] / 255
            return (
              sum +
              weight * (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
            )
          }, 0)
        const surfaceLuminance = luminance(surface)
        const ringLuminance = luminance(ring)
        return (
          (Math.max(surfaceLuminance, ringLuminance) + 0.05) /
          (Math.min(surfaceLuminance, ringLuminance) + 0.05)
        )
      })
      expect(contrast, `${theme} ${selector}`).toBeGreaterThanOrEqual(3)
    }
  })
}

test('a selected row keeps the same selection fill and ring when pinned', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/resources/items')
  const row = page.locator('.ledger-row').first()
  await row.click()
  await expect(row).toHaveClass(/ledger-row--selected/)
  await row.press('ArrowDown')
  await row.press('ArrowUp')
  await expect(row).toBeFocused()
  const selectedFocus = await row.evaluate((element) => {
    const sample = document.createElement('span')
    sample.style.backgroundColor = 'var(--surface-selected)'
    element.append(sample)
    const expectedFill = getComputedStyle(sample).backgroundColor
    sample.remove()
    const style = getComputedStyle(element, '::before')
    const ring = getComputedStyle(element, '::after')
    return {
      fill: style.backgroundColor,
      ringColor: ring.borderLeftColor,
      ringWidth: ring.borderLeftWidth,
      ringRadius: ring.borderTopLeftRadius,
      ringTop: ring.top,
      ringBottom: ring.bottom,
      expectedFill,
    }
  })
  expect(selectedFocus.fill).toBe(selectedFocus.expectedFill)
  await row.press('t')
  await expect(row).toHaveAttribute('data-hover-card-pinned')
  const selectedPinned = await row.evaluate((element) => {
    const style = getComputedStyle(element, '::before')
    const ring = getComputedStyle(element, '::after')
    return {
      fill: style.backgroundColor,
      ringColor: ring.borderLeftColor,
      ringWidth: ring.borderLeftWidth,
      ringRadius: ring.borderTopLeftRadius,
      ringTop: ring.top,
      ringBottom: ring.bottom,
    }
  })
  expect(selectedPinned).toEqual({
    fill: selectedFocus.fill,
    ringColor: selectedFocus.ringColor,
    ringWidth: selectedFocus.ringWidth,
    ringRadius: selectedFocus.ringRadius,
    ringTop: selectedFocus.ringTop,
    ringBottom: selectedFocus.ringBottom,
  })
})

test('quest title keeps the source text edge and rest row height', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/resources/items/633')
  const sourceRow = page.locator('.resources-item-source-row').filter({
    hasText: 'The Key to the Mythal',
  })
  await expect(sourceRow).toBeVisible()
  const geometry = await sourceRow.evaluate((row) => {
    const title = row.querySelector('.resources-item-source-title .resources-hover-anchor')!
    const descriptor = row.querySelector('.resources-item-source-descriptor')!
    const titleText = document.createRange()
    titleText.selectNodeContents(title)
    const descriptorText = document.createRange()
    descriptorText.selectNodeContents(descriptor)
    return {
      titleLeft: titleText.getBoundingClientRect().left,
      descriptorLeft: descriptorText.getBoundingClientRect().left,
      rowHeight: row.getBoundingClientRect().height,
    }
  })
  expect(Math.abs(geometry.titleLeft - geometry.descriptorLeft)).toBeLessThan(0.5)
  expect(geometry.rowHeight).toBeLessThan(60)
})

for (const viewportWidth of viewportWidths) {
  test(`a hovered row and focused row share a rounded fill, and pinning keeps the focus look at ${viewportWidth}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewportWidth, height: 900 })
    await page.goto('/resources/items')
    const row = page.locator('.ledger-row').first()
    await expect(row).toBeVisible()
    await row.hover()
    const hoverStyle = await row.evaluate((element) => ({
      outlineStyle: getComputedStyle(element).outlineStyle,
      ringContent: getComputedStyle(element, '::after').content,
      fill: getComputedStyle(element, '::before').backgroundColor,
      fillRadius: getComputedStyle(element, '::before').borderTopLeftRadius,
    }))
    expect(hoverStyle.outlineStyle).toBe('none')
    expect(['none', 'normal']).toContain(hoverStyle.ringContent)
    expect(hoverStyle.fill).not.toBe('rgba(0, 0, 0, 0)')
    await page.mouse.move(0, 0)
    for (let tabIndex = 0; tabIndex < 80; tabIndex += 1) {
      if (await row.evaluate((element) => element === document.activeElement)) break
      await page.keyboard.press('Tab')
    }
    await expect(row).toBeFocused()
    const focusedStyle = await row.evaluate((element) => ({
      outlineColor: getComputedStyle(element).outlineColor,
      ringContent: getComputedStyle(element, '::after').content,
      ringColor: getComputedStyle(element, '::after').borderLeftColor,
      ringWidth: getComputedStyle(element, '::after').borderLeftWidth,
      fill: getComputedStyle(element, '::before').backgroundColor,
      fillRadius: getComputedStyle(element, '::before').borderTopLeftRadius,
      ringRadius: getComputedStyle(element, '::after').borderTopLeftRadius,
      ringTop: getComputedStyle(element, '::after').top,
      ringBottom: getComputedStyle(element, '::after').bottom,
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
    }))
    expect(focusedStyle.outlineColor).toBe('rgba(0, 0, 0, 0)')
    expect(focusedStyle.ringContent).not.toBe('none')
    expect(focusedStyle.ringColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(focusedStyle.fill).toBe(hoverStyle.fill)
    expect(focusedStyle.fillRadius).toBe(hoverStyle.fillRadius)
    expect(focusedStyle.fillRadius).toBe(focusedStyle.ringRadius)
    await row.press('t')
    await expect(row).toHaveAttribute('data-hover-card-pinned')
    const pinnedStyle = await row.evaluate((element) => ({
      ringContent: getComputedStyle(element, '::after').content,
      ringColor: getComputedStyle(element, '::after').borderLeftColor,
      ringWidth: getComputedStyle(element, '::after').borderLeftWidth,
      ringRadius: getComputedStyle(element, '::after').borderTopLeftRadius,
      ringTop: getComputedStyle(element, '::after').top,
      ringBottom: getComputedStyle(element, '::after').bottom,
      fill: getComputedStyle(element, '::before').backgroundColor,
      fillRadius: getComputedStyle(element, '::before').borderTopLeftRadius,
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
    }))
    expect(pinnedStyle).toEqual({
      ringContent: focusedStyle.ringContent,
      ringColor: focusedStyle.ringColor,
      ringWidth: focusedStyle.ringWidth,
      ringRadius: focusedStyle.ringRadius,
      ringTop: focusedStyle.ringTop,
      ringBottom: focusedStyle.ringBottom,
      fill: focusedStyle.fill,
      fillRadius: focusedStyle.fillRadius,
      width: focusedStyle.width,
      height: focusedStyle.height,
    })
    expect(pinnedStyle.fillRadius).toBe(pinnedStyle.ringRadius)
  })

  test(`pinning a quest link keeps the focused ring and fill without moving layout at ${viewportWidth}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewportWidth, height: 900 })
    await page.goto('/resources/items/633')
    const link = page
      .locator('.resources-item-source-title .resources-hover-anchor')
      .filter({ hasText: 'The Key to the Mythal' })
    await expect(link).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    for (let tabIndex = 0; tabIndex < 80; tabIndex += 1) {
      if (await link.evaluate((element) => element === document.activeElement)) break
      await page.keyboard.press('Tab')
    }
    await expect(link).toBeFocused()
    type QuestLinkGeometry = {
      width: number
      height: number
      siblingLeft: number
      siblingTop: number
      ringContent: string
      ringRadius: string
      ringColor: string
      ringWidth: string
      ringTop: string
      ringBottom: string
      fill: string
    }
    const questLinkGeometry = (element: Element): QuestLinkGeometry => {
      const ring = element.parentElement as HTMLElement
      const sibling = ring.nextElementSibling as HTMLElement
      const bounds = element.getBoundingClientRect()
      const siblingBounds = sibling.getBoundingClientRect()
      return {
        width: bounds.width,
        height: bounds.height,
        siblingLeft: siblingBounds.left - bounds.left,
        siblingTop: siblingBounds.top - bounds.top,
        ringContent: getComputedStyle(ring, '::after').content,
        ringRadius: getComputedStyle(ring, '::after').borderTopLeftRadius,
        ringColor: getComputedStyle(ring, '::after').borderLeftColor,
        ringWidth: getComputedStyle(ring, '::after').borderLeftWidth,
        ringTop: getComputedStyle(ring, '::after').top,
        ringBottom: getComputedStyle(ring, '::after').bottom,
        fill: getComputedStyle(ring).backgroundColor,
      }
    }
    const settledQuestLinkGeometry = async (): Promise<QuestLinkGeometry> => {
      let settledGeometry = await link.evaluate(questLinkGeometry)
      await expect
        .poll(async () => {
          const previousFrameGeometry = await link.evaluate(questLinkGeometry)
          await page.evaluate(
            () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
          )
          settledGeometry = await link.evaluate(questLinkGeometry)
          return JSON.stringify(settledGeometry) === JSON.stringify(previousFrameGeometry)
        })
        .toBe(true)
      return settledGeometry
    }
    const focusedGeometry = await settledQuestLinkGeometry()
    expect(focusedGeometry.ringContent).not.toBe('none')
    await link.press('t')
    await expect(link).toHaveAttribute('data-hover-card-pinned')
    const pinnedCard = page.locator('.hover-card--pinned[data-hover-card]')
    await expect(pinnedCard).toBeVisible()
    await expect
      .poll(async () =>
        pinnedCard.evaluate((element) => {
          const bounds = element.getBoundingClientRect()
          const style = getComputedStyle(element)
          return (
            style.position === 'fixed' &&
            style.visibility === 'visible' &&
            Number.isFinite(Number.parseFloat(style.left)) &&
            Number.isFinite(Number.parseFloat(style.top)) &&
            bounds.width > 0 &&
            bounds.height > 0 &&
            bounds.left >= 0 &&
            bounds.top >= 0 &&
            bounds.right <= window.innerWidth &&
            bounds.bottom <= window.innerHeight
          )
        }),
      )
      .toBe(true)
    const pinnedGeometry = await settledQuestLinkGeometry()
    expect(pinnedGeometry).toEqual(focusedGeometry)
  })
}
