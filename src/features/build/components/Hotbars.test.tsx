import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithRouter } from '../../../test/renderWithRouter'
import { HOTBAR_SLOT_COUNT } from '../hotbars'
import { PLACEHOLDER_ABILITIES } from '../data/placeholderAbilities'
import { Hotbars } from './Hotbars'
import { HoverCardProvider } from '../../../components'

const ABILITY_NAMES_BY_ID = new Map(
  PLACEHOLDER_ABILITIES.map((ability) => [ability.id, ability.name]),
)
const EMPTY_SLOTS = (count: number): null[] => Array<null>(count).fill(null)

function abilityNames(abilityIds: readonly string[]): string[] {
  return abilityIds.map((abilityId) => ABILITY_NAMES_BY_ID.get(abilityId)!)
}

async function renderHotbars(): Promise<ReturnType<typeof renderWithRouter>> {
  const rendered = renderWithRouter(
    <HoverCardProvider>
      <Hotbars />
    </HoverCardProvider>,
    '/overview',
  )
  await screen.findByRole('region', { name: 'Hotbars' })
  return rendered
}

function hotbarsRegion(): HTMLElement {
  return screen.getByRole('region', { name: 'Hotbars' })
}

function poolsRegion(): HTMLElement {
  return screen.getByRole('region', { name: 'Ability pools' })
}

function hotbar(label: string): HTMLElement {
  return within(hotbarsRegion()).getByRole('group', { name: label })
}

function hotbarLabels(): string[] {
  return within(hotbarsRegion())
    .getAllByRole('textbox', { name: 'Bar name' })
    .map((input) => (input as HTMLInputElement).value)
}

function slottedAbilityNames(label: string): (string | null)[] {
  return within(hotbar(label))
    .getAllByRole('listitem')
    .map(
      (slot) =>
        within(slot)
          .queryByRole('button')
          ?.getAttribute('aria-label')
          ?.replace(/^Slot \d+: /, '') ?? null,
    )
}

function slotButton(label: string, slotNumber: number): HTMLElement {
  return within(hotbar(label)).getByRole('button', {
    name: (accessibleName) => accessibleName.startsWith(`Slot ${slotNumber}: `),
  })
}

function poolGroup(groupName: string): HTMLElement {
  return within(poolsRegion()).getByRole('group', {
    name: `${groupName} — drag onto a slot`,
  })
}

function layOutElementsInDocumentOrder(): void {
  function rectInDocumentOrder(element: Element): DOMRect {
    const top = [...document.body.querySelectorAll('*')].indexOf(element) * 4
    return DOMRect.fromRect({ x: 0, y: Math.max(top, 0), width: 280, height: 4 })
  }
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const draggedElement = document.querySelector('[aria-pressed="true"]')
    const isInDragOverlay = this.closest('.hotbars-drag-overlay') !== null
    return rectInDocumentOrder(isInDragOverlay && draggedElement ? draggedElement : this)
  })
}

const BAR_ROW_HEIGHT_PX = 60
const TRAY_LEFT_PX = 100
const TRAY_PADDING_PX = 4
const SLOT_SIZE_PX = 40
const SLOT_GAP_PX = 4
const SLOT_PITCH_PX = SLOT_SIZE_PX + SLOT_GAP_PX

function barRowIndexOf(element: Element): number {
  const barRow = element.closest('.hotbar-row')
  return barRow ? [...document.querySelectorAll('.hotbar-row')].indexOf(barRow) : -1
}

function slotLeftPx(slotIndex: number): number {
  return TRAY_LEFT_PX + TRAY_PADDING_PX + slotIndex * SLOT_PITCH_PX
}

function hotbarGeometryRectOf(element: Element): DOMRect {
  const barRowIndex = barRowIndexOf(element)
  const barTop = barRowIndex * BAR_ROW_HEIGHT_PX
  const slot = element.closest('.hotbar-slot')
  if (slot && barRowIndex >= 0) {
    const slotIndex = [...slot.parentElement!.children].indexOf(slot)
    return DOMRect.fromRect({
      x: slotLeftPx(slotIndex),
      y: barTop + TRAY_PADDING_PX,
      width: SLOT_SIZE_PX,
      height: SLOT_SIZE_PX,
    })
  }
  if (element.matches('.hotbar-slots')) {
    return DOMRect.fromRect({
      x: TRAY_LEFT_PX,
      y: barTop,
      width: HOTBAR_SLOT_COUNT * SLOT_PITCH_PX + TRAY_PADDING_PX,
      height: SLOT_SIZE_PX + 2 * TRAY_PADDING_PX,
    })
  }
  if (element.matches('.hotbars-bars')) {
    const barRowCount = document.querySelectorAll('.hotbar-row').length
    return DOMRect.fromRect({ x: 0, y: 0, width: 600, height: barRowCount * BAR_ROW_HEIGHT_PX })
  }
  const bandTop = 1000 + [...document.body.querySelectorAll('*')].indexOf(element) * 4
  return DOMRect.fromRect({ x: 0, y: bandTop, width: 280, height: 4 })
}

function layOutHotbarGeometry(): void {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const draggedElement = document.querySelector('[aria-pressed="true"]')
    const isInDragOverlay = this.closest('.hotbars-drag-overlay') !== null
    return hotbarGeometryRectOf(isInDragOverlay && draggedElement ? draggedElement : this)
  })
}

function dragWithPointer(dragHandle: HTMLElement, release: { x: number; y: number }): void {
  const start = dragHandle.getBoundingClientRect()
  const startPoint = { clientX: start.x + start.width / 2, clientY: start.y + start.height / 2 }
  fireEvent.pointerDown(dragHandle, { ...startPoint, isPrimary: true, button: 0 })
  act(() => {
    fireEvent.pointerMove(document, { ...startPoint, clientX: startPoint.clientX + 10 })
  })
  act(() => {
    fireEvent.pointerMove(document, { clientX: release.x, clientY: release.y })
  })
  act(() => {
    fireEvent.pointerUp(document, { clientX: release.x, clientY: release.y })
  })
}

describe('Hotbars', () => {
  it('renders the default Nukes and SLAs bars with ten slots each, showing each ability’s code', async () => {
    await renderHotbars()
    expect(hotbarLabels()).toEqual(['Nukes', 'SLAs'])
    expect(slottedAbilityNames('Nukes')).toEqual([
      ...abilityNames(['dbf', 'ms', 'cl', 'pr', 'dis', 'wl']),
      ...EMPTY_SLOTS(4),
    ])
    expect(slottedAbilityNames('SLAs')).toEqual([
      ...abilityNames(['fb', 'sr', 'eb', 'db']),
      ...EMPTY_SLOTS(6),
    ])
    for (const code of ['DBF', 'MS', 'CL', 'PR', 'DIS', 'WL']) {
      expect(within(hotbar('Nukes')).getByText(code)).toBeInTheDocument()
    }
  })

  it('renames a bar and keeps its slots', async () => {
    await renderHotbars()
    const labelInput = within(hotbar('Nukes')).getByRole('textbox', { name: 'Bar name' })
    await userEvent.clear(labelInput)
    await userEvent.type(labelInput, 'Burst')

    expect(hotbarLabels()).toEqual(['Burst', 'SLAs'])
    expect(slottedAbilityNames('Burst').slice(0, 2)).toEqual(abilityNames(['dbf', 'ms']))
  })

  it('adds empty bars named by position and removes bars down to the last one', async () => {
    await renderHotbars()
    await userEvent.click(screen.getByRole('button', { name: 'Add hotbar' }))

    expect(hotbarLabels()).toEqual(['Nukes', 'SLAs', 'Bar 3'])
    expect(slottedAbilityNames('Bar 3')).toEqual(EMPTY_SLOTS(HOTBAR_SLOT_COUNT))

    const removeNukes = within(hotbar('Nukes')).getByRole('button', { name: 'Remove Nukes bar' })
    expect(removeNukes).toHaveAttribute('title', 'Remove bar')
    await userEvent.click(removeNukes)
    await userEvent.click(within(hotbar('Bar 3')).getByRole('button', { name: 'Remove Bar 3 bar' }))

    expect(hotbarLabels()).toEqual(['SLAs'])
    expect(
      within(hotbarsRegion()).queryByRole('button', { name: /^Remove .* bar$/ }),
    ).not.toBeInTheDocument()
  })

  describe('dragging with the keyboard', () => {
    beforeEach(layOutElementsInDocumentOrder)
    afterEach(() => vi.restoreAllMocks())

    async function dragWithKeyboard(dragHandle: HTMLElement, arrowKeys: string): Promise<void> {
      act(() => dragHandle.focus())
      await userEvent.keyboard(' ')
      await userEvent.keyboard(arrowKeys)
      await userEvent.keyboard(' ')
    }

    it('places a pool ability in the empty slot it is dropped on', async () => {
      await renderHotbars()
      await dragWithKeyboard(
        within(poolGroup('Spells')).getByRole('button', { name: 'Delayed Blast Fireball' }),
        '{ArrowUp}',
      )

      expect(slottedAbilityNames('SLAs')).toEqual([
        ...abilityNames(['fb', 'sr', 'eb', 'db']),
        ...EMPTY_SLOTS(4),
        'Delayed Blast Fireball',
        null,
      ])
      expect(
        within(poolGroup('Spells')).getByRole('button', { name: 'Delayed Blast Fireball' }),
      ).toBeInTheDocument()
    })

    it('moves a slotted ability to another slot, leaving its old slot empty and focusing the new one, without opening Damage calc', async () => {
      const { router } = await renderHotbars()
      await dragWithKeyboard(slotButton('Nukes', 6), '{ArrowDown}')

      expect(router.state.location.pathname).toBe('/overview')
      expect(slottedAbilityNames('Nukes')).toEqual([
        ...abilityNames(['dbf', 'ms', 'cl', 'pr', 'dis']),
        null,
        'Wail of the Banshee',
        ...EMPTY_SLOTS(3),
      ])
      await waitFor(() => expect(slotButton('Nukes', 7)).toHaveFocus())
    })
  })

  describe('dragging with the pointer', () => {
    beforeEach(layOutHotbarGeometry)
    afterEach(() => vi.restoreAllMocks())

    it('lands an ability released in the gap between two slots in the nearer slot of that bar', async () => {
      await renderHotbars()
      const slasBarTop = BAR_ROW_HEIGHT_PX
      const gapBetweenSlotsThreeAndFour = slotLeftPx(3) - SLOT_GAP_PX / 2 - 1

      dragWithPointer(slotButton('Nukes', 6), {
        x: gapBetweenSlotsThreeAndFour,
        y: slasBarTop + BAR_ROW_HEIGHT_PX / 2,
      })

      expect(slottedAbilityNames('SLAs').slice(0, 4)).toEqual([
        ...abilityNames(['fb', 'sr']),
        'Wail of the Banshee',
        ...abilityNames(['db']),
      ])
      expect(slottedAbilityNames('Nukes')[5]).toBeNull()
    })

    it('keeps a slotted ability in its slot when it is released on the bars away from every tray', async () => {
      await renderHotbars()
      dragWithPointer(slotButton('Nukes', 6), { x: TRAY_LEFT_PX / 2, y: BAR_ROW_HEIGHT_PX / 2 })

      expect(slottedAbilityNames('Nukes')[5]).toBe('Wail of the Banshee')
    })
  })

  it('shows the ability’s stat block while a filled slot is hovered or focused, and opens Damage calc on click', async () => {
    const { router } = await renderHotbars()
    const polarRay = slotButton('Nukes', 4)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.hover(polarRay)
    const statBlock = await screen.findByRole('dialog')
    expect(polarRay).toHaveAccessibleDescription(/Polar Ray Type Spell Cooldown 2s/)
    expect(polarRay).toHaveAccessibleDescription(/Cost 45 SP/)
    expect(within(statBlock).getByText('Polar Ray')).toBeInTheDocument()
    for (const [rowLabel, rowValue] of [
      ['Type', 'Spell'],
      ['Cooldown', '2s'],
      ['Save', 'no save'],
      ['Damage', '22d6+366 cold'],
      ['Cost', '45 SP'],
    ]) {
      expect(within(statBlock).getByText(rowLabel).nextElementSibling).toHaveTextContent(rowValue)
    }
    expect(statBlock).toHaveTextContent('Click → full breakdown in Damage calc')

    await userEvent.unhover(polarRay)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    act(() => slotButton('Nukes', 1).focus())
    expect(
      within(await screen.findByRole('dialog')).getByText('Delayed Blast Fireball'),
    ).toBeVisible()

    await userEvent.click(polarRay)
    expect(router.state.location.pathname).toBe('/damage-calc')
  })

  it('keeps an unpinned stat block on Escape until hover ends', async () => {
    await renderHotbars()
    const polarRay = slotButton('Nukes', 4)
    await userEvent.hover(polarRay)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await userEvent.unhover(polarRay)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('dismisses a focused slot card on Escape and reopens it when focus returns', async () => {
    await renderHotbars()
    const polarRay = slotButton('Nukes', 4)
    act(() => polarRay.focus())
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(polarRay).toHaveFocus()
    await new Promise((resolve) => window.setTimeout(resolve, 300))
    expect(screen.queryByRole('dialog')).toBeNull()

    act(() => slotButton('Nukes', 5).focus())
    act(() => polarRay.focus())
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('keeps a filled slot when a touch long-press opens the context menu', async () => {
    await renderHotbars()
    fireEvent.pointerDown(slotButton('Nukes', 1), { pointerType: 'touch', isPrimary: true })
    fireEvent.contextMenu(slotButton('Nukes', 1))

    expect(slottedAbilityNames('Nukes')[0]).toBe('Delayed Blast Fireball')
  })

  it('clears a filled slot on right-click or the Delete key', async () => {
    await renderHotbars()
    fireEvent.pointerDown(slotButton('Nukes', 1), { pointerType: 'mouse', button: 2 })
    fireEvent.contextMenu(slotButton('Nukes', 1))
    act(() => slotButton('Nukes', 2).focus())
    await userEvent.keyboard('{Delete}')

    expect(slottedAbilityNames('Nukes').slice(0, 3)).toEqual([null, null, 'Chain Lightning'])
  })

  it('adds an item from the clicky picker to the Item clickies pool with the swap note, and removes it again', async () => {
    await renderHotbars()
    const addItemToggle = within(poolGroup('Item clickies')).getByRole('button', {
      name: 'Add item…',
    })
    expect(addItemToggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(addItemToggle)
    expect(addItemToggle).toHaveAttribute('aria-expanded', 'true')

    const picker = screen.getByRole('region', { name: 'Item clicky picker' })
    expect(picker).toHaveTextContent(
      'Added items appear under Item clickies and can be dragged onto a bar.',
    )
    await userEvent.click(
      within(picker).getByRole('button', { name: 'Add Legendary Cloak of the Mists' }),
    )

    const addedChip = within(poolGroup('Item clickies')).getByRole('button', {
      name: 'Legendary Cloak of the Mists',
    })
    expect(addedChip).toHaveTextContent('Cloak · added — swap to use')
    const addedRow = within(picker).getByRole('row', { name: /Legendary Cloak of the Mists/ })
    expect(within(addedRow).getByRole('img', { name: 'Added' })).toBeInTheDocument()
    expect(picker).toHaveTextContent('1 added under Item clickies — drag them onto a bar.')

    await userEvent.click(
      within(picker).getByRole('button', { name: 'Remove Legendary Cloak of the Mists' }),
    )
    expect(
      within(poolGroup('Item clickies')).queryByRole('button', {
        name: 'Legendary Cloak of the Mists',
      }),
    ).not.toBeInTheDocument()
    expect(within(addedRow).queryByRole('img', { name: 'Added' })).not.toBeInTheDocument()

    await userEvent.click(within(picker).getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('region', { name: 'Item clicky picker' })).not.toBeInTheDocument()
    expect(addItemToggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('hides items you do not own when Content you own is on', async () => {
    await renderHotbars()
    await userEvent.click(
      within(poolGroup('Item clickies')).getByRole('button', { name: 'Add item…' }),
    )
    const picker = screen.getByRole('region', { name: 'Item clicky picker' })
    expect(within(picker).getByRole('row', { name: /Jibbers Blade/ })).toBeInTheDocument()
    expect(picker).toHaveTextContent('7 of 1,206')

    const ownedToggle = within(picker).getByRole('button', { name: 'Content you own' })
    expect(ownedToggle).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(ownedToggle)

    expect(ownedToggle).toHaveAttribute('aria-pressed', 'true')
    expect(within(picker).queryByRole('row', { name: /Jibbers Blade/ })).not.toBeInTheDocument()
    expect(
      within(picker).queryByRole('row', { name: /Shroud of the Abbot/ }),
    ).not.toBeInTheDocument()
    expect(within(picker).getByRole('row', { name: /Cloak of Night/ })).toBeInTheDocument()
    expect(picker).toHaveTextContent('5 of 1,206')
    expect(picker).toHaveTextContent('↓ 1,201 more')
  })
})
