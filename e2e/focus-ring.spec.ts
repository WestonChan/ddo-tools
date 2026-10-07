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
const clearanceMeasurementTolerance = 0.1

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

function auditFocusedRing(clearanceMeasurementTolerance: number): {
  stop: string
  stopPath: string
  issues: string[]
  opticalExclusion: string | null
  horizontalExclusion: string | null
  hasOpticalAudit: boolean
  hasVerticalCenteringCheck: boolean
  hasHorizontalCenteringCheck: boolean
  focusedInkGaps: { left: number; top: number; right: number; bottom: number } | null
} {
  const focusedElement = document.activeElement as HTMLElement
  if (focusedElement === document.body) {
    return {
      stop: 'document.body',
      stopPath: 'body',
      issues: [],
      opticalExclusion: 'document body has no text stop',
      horizontalExclusion: 'document body has no text stop',
      hasOpticalAudit: false,
      hasVerticalCenteringCheck: false,
      hasHorizontalCenteringCheck: false,
      focusedInkGaps: null,
    }
  }
  const stopPath: number[] = []
  for (let element = focusedElement; element.parentElement; element = element.parentElement) {
    stopPath.unshift(Array.from(element.parentElement.children).indexOf(element))
  }
  const issues: string[] = []
  let opticalExclusion: string | null = null
  let horizontalExclusion: string | null = null
  let hasOpticalAudit = false
  let hasVerticalCenteringCheck = false
  let hasHorizontalCenteringCheck = false
  let focusedInkGaps: { left: number; top: number; right: number; bottom: number } | null = null
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
      : ((focusedElement.closest('.search-well') as HTMLElement | null) ?? focusedElement)
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
    '.focus-ring-proxy, .search-well, a[href], button, input, select, textarea, [tabindex]',
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
    const drawnRadii = [
      cornerStyle.borderTopLeftRadius,
      cornerStyle.borderTopRightRadius,
      cornerStyle.borderBottomRightRadius,
      cornerStyle.borderBottomLeftRadius,
    ].map((radius) => {
      const elementRadius = Number.parseFloat(radius)
      return isNativeVisible
        ? Math.max(0, elementRadius + Number.parseFloat(targetStyle.outlineOffset))
        : elementRadius
    })
    if (
      drawnRadii.some(
        (radius) =>
          !Number.isFinite(radius) ||
          !scaleRadii.some((scaleRadius) => Math.abs(radius - scaleRadius) < 0.5),
      )
    ) {
      issues.push(
        `off-scale ring corner (${drawnRadii.map((radius) => radius.toFixed(1)).join('/')}px)`,
      )
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
    const minimumNeighbourClearance = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--focus-ring-neighbour-clearance',
      ),
    )
    if (!Number.isFinite(minimumNeighbourClearance)) {
      issues.push('missing neighbouring text clearance token')
    }
    const canvasContext = document.createElement('canvas').getContext('2d')!
    const inkBoundsForText = (
      textNode: Text,
      start: number,
      end: number,
      isOwnText: boolean,
    ): DOMRect[] => {
      const textElement = textNode.parentElement
      if (!textElement) return []
      const textStyle = getComputedStyle(textElement)
      if (
        textStyle.display === 'none' ||
        textStyle.visibility !== 'visible' ||
        Number.parseFloat(textStyle.opacity) === 0
      ) {
        return []
      }
      const textRange = document.createRange()
      textRange.setStart(textNode, start)
      textRange.setEnd(textNode, end)
      const lineBoundsList = Array.from(textRange.getClientRects())
      if (
        !isOwnText &&
        lineBoundsList.every(
          (lineBounds) =>
            lineBounds.right < ringOuter.left - minimumNeighbourClearance - 20 ||
            lineBounds.left > ringOuter.right + minimumNeighbourClearance + 20 ||
            lineBounds.bottom < ringOuter.top - minimumNeighbourClearance - 20 ||
            lineBounds.top > ringOuter.bottom + minimumNeighbourClearance + 20,
        )
      ) {
        return []
      }
      const text = textNode.data.slice(start, end)
      canvasContext.font = `${textStyle.fontStyle} ${textStyle.fontVariant} ${textStyle.fontWeight} ${textStyle.fontSize} ${textStyle.fontFamily}`
      canvasContext.letterSpacing = textStyle.letterSpacing
      const metrics = canvasContext.measureText(text)
      return lineBoundsList.flatMap((lineBounds) => {
        const fontHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
        const baseline =
          lineBounds.top + (lineBounds.height - fontHeight) / 2 + metrics.fontBoundingBoxAscent
        const inkBounds = {
          left:
            lineBoundsList.length === 1
              ? lineBounds.left - metrics.actualBoundingBoxLeft
              : lineBounds.left,
          top: baseline - metrics.actualBoundingBoxAscent,
          right:
            lineBoundsList.length === 1
              ? lineBounds.left + metrics.actualBoundingBoxRight
              : lineBounds.right,
          bottom: baseline + Math.max(0, metrics.actualBoundingBoxDescent),
        }
        inkBounds.left = Math.max(inkBounds.left, 0)
        inkBounds.top = Math.max(inkBounds.top, 0)
        inkBounds.right = Math.min(inkBounds.right, window.innerWidth)
        inkBounds.bottom = Math.min(inkBounds.bottom, window.innerHeight)
        for (
          let ancestor: Element | null = textElement;
          ancestor;
          ancestor = ancestor.parentElement
        ) {
          const ancestorStyle = getComputedStyle(ancestor)
          if (
            ancestorStyle.display === 'none' ||
            ancestorStyle.visibility !== 'visible' ||
            Number.parseFloat(ancestorStyle.opacity) === 0
          ) {
            return []
          }
          const ancestorBounds = ancestor.getBoundingClientRect()
          if (
            ancestorStyle.display !== 'inline' &&
            /(hidden|clip|auto|scroll)/.test(ancestorStyle.overflowX)
          ) {
            inkBounds.left = Math.max(inkBounds.left, ancestorBounds.left + ancestor.clientLeft)
            inkBounds.right = Math.min(
              inkBounds.right,
              ancestorBounds.left + ancestor.clientLeft + ancestor.clientWidth,
            )
          }
          if (
            ancestorStyle.display !== 'inline' &&
            /(hidden|clip|auto|scroll)/.test(ancestorStyle.overflowY)
          ) {
            inkBounds.top = Math.max(inkBounds.top, ancestorBounds.top + ancestor.clientTop)
            inkBounds.bottom = Math.min(
              inkBounds.bottom,
              ancestorBounds.top + ancestor.clientTop + ancestor.clientHeight,
            )
          }
        }
        return inkBounds.left < inkBounds.right && inkBounds.top < inkBounds.bottom
          ? [
              new DOMRect(
                inkBounds.left,
                inkBounds.top,
                inkBounds.right - inkBounds.left,
                inkBounds.bottom - inkBounds.top,
              ),
            ]
          : []
      })
    }
    const nearbyInk: { bounds: DOMRect; text: string }[] = []
    const focusedInkBounds: DOMRect[] = []
    const allTextNodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (allTextNodes.nextNode()) {
      const textNode = allTextNodes.currentNode as Text
      const textElement = textNode.parentElement
      if (!textElement || textElement.closest('script, style, .sr-only')) continue
      const isFocusedText = focusedElement.contains(textNode)
      const isSameControlText =
        isFocusedText || (ringTarget.contains(focusedElement) && ringTarget.contains(textNode))
      for (const word of textNode.data.matchAll(/\S+/g)) {
        const wordStart = word.index
        const wordInkBounds = inkBoundsForText(
          textNode,
          wordStart,
          wordStart + word[0].length,
          isSameControlText,
        )
        if (isFocusedText) {
          focusedInkBounds.push(...wordInkBounds)
        } else if (!isSameControlText) {
          nearbyInk.push(...wordInkBounds.map((bounds) => ({ bounds, text: word[0] })))
        }
      }
    }
    if (Number.isFinite(minimumNeighbourClearance)) {
      for (const { bounds: inkBounds, text } of nearbyInk) {
        const horizontalDistance = Math.max(
          ringOuter.left - inkBounds.right,
          inkBounds.left - ringOuter.right,
          0,
        )
        const verticalDistance = Math.max(
          ringOuter.top - inkBounds.bottom,
          inkBounds.top - ringOuter.bottom,
          0,
        )
        const isInsideRing =
          inkBounds.left >= ringInner.left &&
          inkBounds.right <= ringInner.right &&
          inkBounds.top >= ringInner.top &&
          inkBounds.bottom <= ringInner.bottom
        const distanceFromRing = isInsideRing
          ? Math.min(
              inkBounds.left - ringInner.left,
              ringInner.right - inkBounds.right,
              inkBounds.top - ringInner.top,
              ringInner.bottom - inkBounds.bottom,
            )
          : Math.hypot(horizontalDistance, verticalDistance)
        if (distanceFromRing < minimumNeighbourClearance - clearanceMeasurementTolerance) {
          issues.push(`too close to neighbouring text "${text}" (${distanceFromRing.toFixed(1)}px)`)
          break
        }
      }
    }
    if (focusedElement.matches('input, select, textarea, [contenteditable="true"]')) {
      opticalExclusion = 'native editable text has no DOM text ink'
    } else if (focusedElement.matches('.app-content')) {
      opticalExclusion = 'scroll region ring surrounds the entire page'
    } else if (focusedInkBounds.length === 0) {
      opticalExclusion = 'control has no visible text ink'
    } else if (
      Math.max(...focusedInkBounds.map((inkBounds) => inkBounds.top)) -
        Math.min(...focusedInkBounds.map((inkBounds) => inkBounds.top)) >
      (Number.parseFloat(getComputedStyle(focusedElement).lineHeight) ||
        Number.parseFloat(getComputedStyle(focusedElement).fontSize) * 1.2) *
        0.6
    ) {
      opticalExclusion = 'text occupies multiple baselines'
    } else {
      hasOpticalAudit = true
      const textInk = {
        left: Math.min(...focusedInkBounds.map((inkBounds) => inkBounds.left)),
        top: Math.min(...focusedInkBounds.map((inkBounds) => inkBounds.top)),
        right: Math.max(...focusedInkBounds.map((inkBounds) => inkBounds.right)),
        bottom: Math.max(...focusedInkBounds.map((inkBounds) => inkBounds.bottom)),
      }
      const topGap = textInk.top - ringInner.top
      const bottomGap = ringInner.bottom - textInk.bottom
      const leftGap = textInk.left - ringInner.left
      const rightGap = ringInner.right - textInk.right
      focusedInkGaps = { left: leftGap, top: topGap, right: rightGap, bottom: bottomGap }
      const verticalImbalance = Math.abs(topGap - bottomGap)
      const focusedStyle = getComputedStyle(focusedElement)
      const isFlexOrGrid = /flex|grid/.test(focusedStyle.display)
      const isContentCentred = isFlexOrGrid
        ? focusedStyle.justifyContent === 'center'
        : focusedStyle.textAlign === 'center'
      hasVerticalCenteringCheck = topGap <= 8 && bottomGap <= 8
      hasHorizontalCenteringCheck = isContentCentred && leftGap <= 8 && rightGap <= 8
      const hasLeadingGraphic =
        isFlexOrGrid &&
        !isContentCentred &&
        focusedElement.firstElementChild !== null &&
        focusedElement.firstElementChild.textContent?.trim() === ''
      if (hasVerticalCenteringCheck && verticalImbalance > 1) {
        issues.push(
          `text ink off centre vertically (above ${topGap.toFixed(1)}px, below ${bottomGap.toFixed(1)}px)`,
        )
      }
      if (hasHorizontalCenteringCheck && Math.abs(leftGap - rightGap) > 1) {
        issues.push(
          `text ink off centre horizontally (left ${leftGap.toFixed(1)}px, right ${rightGap.toFixed(1)}px)`,
        )
      } else if (hasLeadingGraphic) {
        horizontalExclusion = 'leading graphic precedes text in a left-aligned control'
      } else if (!isContentCentred && leftGap < minimumClearance - clearanceMeasurementTolerance) {
        issues.push(
          `text ink left clearance ${leftGap.toFixed(1)}px (minimum ${minimumClearance.toFixed(1)}px)`,
        )
      }
    }
    const occludedEdgeWidth =
      pseudoStyle.boxShadow === 'none' || !Number.isFinite(minimumClearance)
        ? 0
        : ringWidth + minimumClearance
    for (const inkBounds of focusedInkBounds) {
      const visibleInkBounds = {
        left: Math.max(inkBounds.left, ringOuter.left + occludedEdgeWidth),
        top: Math.max(inkBounds.top, ringOuter.top + occludedEdgeWidth),
        right: Math.min(inkBounds.right, ringOuter.right - occludedEdgeWidth),
        bottom: Math.min(inkBounds.bottom, ringOuter.bottom - occludedEdgeWidth),
      }
      if (
        visibleInkBounds.left >= visibleInkBounds.right ||
        visibleInkBounds.top >= visibleInkBounds.bottom
      ) {
        continue
      }
      const clearances = {
        left: visibleInkBounds.left - ringInner.left,
        top: visibleInkBounds.top - ringInner.top,
        right: ringInner.right - visibleInkBounds.right,
        bottom: ringInner.bottom - visibleInkBounds.bottom,
      }
      const [closestSide, closestClearance] = Object.entries(clearances).reduce((closest, side) =>
        side[1] < closest[1] ? side : closest,
      )
      if (closestClearance < minimumClearance - clearanceMeasurementTolerance) {
        issues.push(`too close to text (${closestSide} ${closestClearance.toFixed(1)}px)`)
        break
      }
    }
  }
  const stop = `${focusedElement.tagName}.${focusedElement.className} ${focusedElement.textContent?.trim().slice(0, 35)}`
  return {
    stop,
    stopPath: stopPath.join('.'),
    issues: [...new Set(issues)],
    opticalExclusion,
    horizontalExclusion,
    hasOpticalAudit,
    hasVerticalCenteringCheck,
    hasHorizontalCenteringCheck,
    focusedInkGaps,
  }
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
        chest: capturedRing.quests[0].chest,
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
      const verticalCenteringStops = new Set<string>()
      const horizontalCenteringStops = new Set<string>()
      let opticallyAuditedStops = 0
      let firstStop = ''
      let didWrap = false
      for (let tabIndex = 0; tabIndex < 250; tabIndex += 1) {
        await page.evaluate(captureRestGeometry)
        await page.keyboard.press('Tab')
        const focusedRing = await page.evaluate(auditFocusedRing, clearanceMeasurementTolerance)
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
        if (focusedRing.hasOpticalAudit) opticallyAuditedStops += 1
        if (focusedRing.hasVerticalCenteringCheck) verticalCenteringStops.add(focusedRing.stop)
        if (focusedRing.hasHorizontalCenteringCheck) horizontalCenteringStops.add(focusedRing.stop)
        if (focusedRing.issues.length) {
          ringFailures.push(`${focusedRing.stop}: ${focusedRing.issues.join(', ')}`)
        }
      }
      expect(didWrap).toBe(true)
      expect(visitedStops.size).toBeGreaterThan(5)
      expect(opticallyAuditedStops).toBeGreaterThan(0)
      console.info(
        `${viewportWidth}px ${route} ink centring stops: ${JSON.stringify({ vertical: [...verticalCenteringStops].sort(), horizontal: [...horizontalCenteringStops].sort() })}`,
      )
      expect(ringFailures).toEqual([])
    })
  }
}

test('source title ring clears the chest line and centres on its lettering', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/resources/items/633')
  const sourceRow = page.locator('.resources-item-source-row').filter({
    hasText: 'The Key to the Mythal',
  })
  await expect(sourceRow.getByText('End chest')).toBeVisible()
  const sourceLink = sourceRow.locator('.resources-hover-anchor')
  await page.evaluate(() => document.fonts.ready)
  for (let tabIndex = 0; tabIndex < 100; tabIndex += 1) {
    if (await sourceLink.evaluate((element) => element === document.activeElement)) break
    await page.keyboard.press('Tab')
  }
  await expect(sourceLink).toBeFocused()
  const focusedRing = await page.evaluate(auditFocusedRing, clearanceMeasurementTolerance)
  expect(focusedRing.hasOpticalAudit).toBe(true)
  const inkGaps = focusedRing.focusedInkGaps
  expect(inkGaps).not.toBeNull()
  if (inkGaps) expect(Math.abs(inkGaps.top - inkGaps.bottom)).toBeLessThanOrEqual(1)
  expect(focusedRing.focusedInkGaps?.right).toBeGreaterThanOrEqual(
    4 - clearanceMeasurementTolerance,
  )
  const ringToWikiIcon = await sourceRow.evaluate((row) => {
    const title = row.querySelector<HTMLElement>('.resources-item-source-title')!
    const ring = getComputedStyle(title, '::after')
    const wikiGlyph = row.querySelector<SVGElement>('.wiki-link-icon svg')!
    return (
      wikiGlyph.getBoundingClientRect().left -
      (title.getBoundingClientRect().right - Number.parseFloat(ring.right))
    )
  })
  expect(ringToWikiIcon).toBeGreaterThanOrEqual(3 - clearanceMeasurementTolerance)
  expect.soft(focusedRing.issues.filter((issue) => issue.includes('neighbouring text'))).toEqual([])
  expect.soft(focusedRing.issues.filter((issue) => issue.startsWith('text ink'))).toEqual([])
  expect
    .soft(focusedRing.issues.filter((issue) => issue.startsWith('too close to text')))
    .toEqual([])
})

test('brief Drops from link ring clears its descriptor and centres on its lettering', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/resources/items')
  const itemRow = page.locator('.ledger-row').first()
  await expect(itemRow).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await itemRow.hover()
  await expect(page.locator('.hover-card[data-hover-card]')).toBeVisible()
  await itemRow.press('t')
  const pinnedCard = page.locator('.hover-card--pinned[data-hover-card]')
  await expect(pinnedCard).toBeVisible()
  const sourceLink = pinnedCard
    .locator('.resources-item-source-brief-row .resources-hover-anchor')
    .filter({ hasText: 'The Key to the Mythal' })
  await expect(sourceLink).toBeVisible()
  for (let tabIndex = 0; tabIndex < 60; tabIndex += 1) {
    if (await sourceLink.evaluate((element) => element === document.activeElement)) break
    await page.keyboard.press('Tab')
  }
  await expect(sourceLink).toBeFocused()
  const focusedRing = await page.evaluate(auditFocusedRing, clearanceMeasurementTolerance)
  expect(focusedRing.hasOpticalAudit).toBe(true)
  const inkGaps = focusedRing.focusedInkGaps
  expect(inkGaps).not.toBeNull()
  if (inkGaps) expect(Math.abs(inkGaps.top - inkGaps.bottom)).toBeLessThanOrEqual(1)
  expect.soft(focusedRing.issues.filter((issue) => issue.includes('neighbouring text'))).toEqual([])
  expect.soft(focusedRing.issues.filter((issue) => issue.startsWith('text ink'))).toEqual([])
  expect
    .soft(focusedRing.issues.filter((issue) => issue.startsWith('too close to text')))
    .toEqual([])
})

test('stat pin ring keeps a scale corner and clears its glyph and neighboring text', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/build-plan')
  await expect(page.getByRole('complementary', { name: 'Stats', exact: true })).toBeVisible()
  const pin = page.locator('.stats-panel-pin').first()
  for (let tabIndex = 0; tabIndex < 250; tabIndex += 1) {
    if (await pin.evaluate((element) => element === document.activeElement)) break
    await page.evaluate(captureRestGeometry)
    await page.keyboard.press('Tab')
  }
  await expect(pin).toBeFocused()
  const focusedRing = await page.evaluate(auditFocusedRing, clearanceMeasurementTolerance)
  expect(focusedRing.issues.filter((issue) => issue.includes('ring corner'))).toEqual([])
  expect(focusedRing.issues.filter((issue) => issue.includes('neighbouring text'))).toEqual([])
  const glyphClearance = await pin.evaluate((button) => {
    const pseudo = getComputedStyle(button, '::after')
    if (pseudo.content === 'none') return null
    const buttonBounds = button.getBoundingClientRect()
    const glyphBounds = button.querySelector('svg')!.getBoundingClientRect()
    const ringInner = {
      left:
        buttonBounds.left +
        Number.parseFloat(pseudo.left) +
        Number.parseFloat(pseudo.borderLeftWidth),
      top:
        buttonBounds.top + Number.parseFloat(pseudo.top) + Number.parseFloat(pseudo.borderTopWidth),
      right:
        buttonBounds.right -
        Number.parseFloat(pseudo.right) -
        Number.parseFloat(pseudo.borderRightWidth),
      bottom:
        buttonBounds.bottom -
        Number.parseFloat(pseudo.bottom) -
        Number.parseFloat(pseudo.borderBottomWidth),
    }
    return Math.min(
      glyphBounds.left - ringInner.left,
      glyphBounds.top - ringInner.top,
      ringInner.right - glyphBounds.right,
      ringInner.bottom - glyphBounds.bottom,
    )
  })
  expect(glyphClearance).not.toBeNull()
  expect(glyphClearance).toBeGreaterThanOrEqual(4 - clearanceMeasurementTolerance)
  const unpinnedPin = page.locator('.stats-panel-pin:not(.stats-panel-pin--pinned)').first()
  const unpinnedNameGap = await unpinnedPin.evaluate((button) => {
    const name = button.parentElement!.querySelector('.stats-panel-stat-name')!
    return name.getBoundingClientRect().left - button.getBoundingClientRect().right
  })
  expect(unpinnedNameGap).toBeCloseTo(4, 1)
  await unpinnedPin.click()
  const pinnedPin = page.locator('.stats-panel-pin--pinned').first()
  await expect(pinnedPin).toBeVisible()
  const pinnedNameGap = await pinnedPin.evaluate((button) => {
    const name = button.parentElement!.querySelector('.stats-panel-stat-name')!
    return name.getBoundingClientRect().left - button.getBoundingClientRect().right
  })
  expect(pinnedNameGap).toBeCloseTo(4, 1)
})

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
