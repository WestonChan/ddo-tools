import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  fireEvent,
  render,
  screen,
  cleanup,
  within,
  type RenderResult,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HoverCardProvider } from '../../../../components'
import type { ApiItemDetail, ApiSetDetail, ApiWeaponStats } from '../../../../lib/api'
import capturedWeapon from '../../queries/fixtures/effects-item-3479.json'
import capturedRuneArm from '../../queries/fixtures/effects-item-924.json'
import capturedArmor from '../../queries/fixtures/effects-item-831.json'
import capturedShield from '../../queries/fixtures/effects-item-8203.json'
import capturedRing from '../../queries/fixtures/effects-item-487.json'
import capturedSet from '../../queries/fixtures/effects-set-93.json'
import capturedNecklace from '../../queries/fixtures/effects-item.json'
import capturedBracers from '../../queries/fixtures/effects-item-2430.json'
import { toItem } from '../../queries/items'
import { toSetDetail } from '../../queries/sets'
import { ItemDetailCard, ItemHoverCard } from './ItemDetailCard'
import type { Item, ItemSource, LootQuest } from '../../queries/items'

vi.mock('../../queries/useItems', () => ({
  useFittingAugmentsBySlotLabel: () => ({ data: [], isPending: false, error: null }),
  useEffectDetail: () => ({ data: { kind: 'effect', wiki_url: null, bonuses: [], damage: [] } }),
  useSet: () => ({ data: null, isPending: true, error: null, refetch: vi.fn() }),
}))

afterEach(() => {
  cleanup()
})

const plainItem: Item = {
  id: 42,
  name: 'Voice of the Master',
  equipmentSlot: 'Trinket',
  category: 'Trinket',
  type: null,
  minimumLevel: 5,
  enhancementBonus: null,
  material: null,
  requiredRace: null,
  description: null,
  dropLocation: null,
  setName: null,
  setId: null,
  canAcceptSentience: false,
  isMinorArtifact: false,
  wikiUrl: null,
  isLegacy: false,
  weaponStats: null,
  armorStats: null,
  augmentSlots: [],
  modifiers: [],
  effects: [],
  clickies: [],
  quests: [],
  questChains: [],
  sagas: [],
  adventurePackDrops: [],
  sourcesBeyondQuests: [],
}

function quest(overrides: Partial<LootQuest> = {}): LootQuest {
  return {
    id: 7,
    name: "Delera's Tomb",
    patron: null,
    pack: null,
    level: 8,
    epicLevel: null,
    isRaid: false,
    isRareLoot: false,
    isFreeToPlay: false,
    isEndReward: false,
    chests: [],
    ...overrides,
  }
}

function itemSource(overrides: Partial<ItemSource> = {}): ItemSource {
  return {
    kind: 'craftingSystem',
    id: 32,
    key: 'craftingSystem-32',
    name: 'Thunder-Forged',
    vendorLocation: null,
    cost: null,
    chest: null,
    characterLevel: null,
    isRareLoot: false,
    wikiUrl: 'https://ddowiki.com/page/Thunder-Forged',
    ...overrides,
  }
}

function packDrop(overrides: Partial<ItemSource> = {}): ItemSource {
  return itemSource({
    kind: 'adventurePack',
    id: 25,
    key: 'adventurePack-25',
    name: 'The Isle of Dread',
    chest: 'any legendary chest',
    wikiUrl: 'https://ddowiki.com/page/The_Isle_of_Dread',
    ...overrides,
  })
}

function renderItemDetailCard(item: Item): RenderResult {
  return render(<ItemDetailCard item={item} />)
}

function toCapturedItem(apiItem: unknown): Item {
  return toItem(apiItem as ApiItemDetail)
}

function weaponItem(weaponOverrides: Partial<ApiWeaponStats> = {}): Item {
  return toItem({
    ...(capturedWeapon as unknown as ApiItemDetail),
    weapon: {
      ...(capturedWeapon.weapon as ApiWeaponStats),
      ...weaponOverrides,
    },
  })
}

function detailStatText(container: HTMLElement): Array<string | null> {
  return Array.from(
    container.querySelectorAll('.detail-fact-grid__cell, .detail-extras__entry'),
  ).map((stat) => stat.textContent)
}

describe('ItemDetailCard details', () => {
  it('shows mapped weapon modifiers as hinted facts and keeps DR bypass visible outside extras', async () => {
    const item = weaponItem()
    const { container } = renderItemDetailCard(item)
    expect(item.weaponStats).toMatchObject({
      attackModifier: 'Strength',
      damageModifier: 'Strength',
    })
    expect(detailStatText(container).slice(0, 5)).toEqual([
      'Damage1.6[2d6]+5',
      'Crit range19–20',
      'Crit multiplier×2',
      'Attack modSTR',
      'Damage modSTR',
    ])
    expect(screen.getAllByText('STR', { selector: '[title="Strength"]' })).toHaveLength(2)
    const bypass = container.querySelector('.detail-dr-bypass')
    expect(bypass).toHaveTextContent('DR bypassChaotic, Evil, Good, Lawful, Magic, Slash')
    expect(container.querySelector('.detail-extras')).toBeNull()
    const toggle = screen.getByRole('button', { name: 'More details' })
    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Less details' })).toBeInTheDocument()
    expect(container.querySelector('.detail-extras')).not.toHaveTextContent('DR bypass')
    expect(container.querySelector('.detail-extras')).not.toHaveTextContent('Enhancement')
    expect(container.querySelector('.detail-fact-grid')).not.toHaveTextContent('Enhancement')
  })

  it('omits absent modifiers and shows distinct ability abbreviations with their full-name hints', () => {
    const { container, rerender } = renderItemDetailCard(
      weaponItem({ attack_modifier: null, damage_modifier: null }),
    )
    expect(detailStatText(container)).toEqual([
      'Damage1.6[2d6]+5',
      'Crit range19–20',
      'Crit multiplier×2',
    ])
    rerender(
      <ItemDetailCard
        item={weaponItem({ attack_modifier: 'Dexterity', damage_modifier: 'Intelligence' })}
      />,
    )
    expect(container.querySelector('[title="Dexterity"]')).toHaveTextContent('DEX')
    expect(container.querySelector('[title="Intelligence"]')).toHaveTextContent('INT')
  })

  it('keeps a weapon’s primary rows above one toggle and reveals its attributes and extras', async () => {
    const { container } = renderItemDetailCard(weaponItem())
    expect(detailStatText(container)).toEqual([
      'Damage1.6[2d6]+5',
      'Crit range19–20',
      'Crit multiplier×2',
      'Attack modSTR',
      'Damage modSTR',
    ])
    expect(container.querySelectorAll('.detail-fact-grid__cell')).toHaveLength(5)
    expect(container.querySelector('.detail-extras')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Weapon' })).toBeNull()
    expect(container.querySelector('.resources-kv-grid')).toBeNull()
    expect(screen.queryByText('Material')).toBeNull()
    const button = screen.getByRole('button', { name: 'More details' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button.parentElement?.previousElementSibling).toHaveClass('detail-dr-bypass')
    expect(
      container
        .querySelector('.resources-detail-description')!
        .compareDocumentPosition(container.querySelector('.detail-stats')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      container
        .querySelector('.detail-stats')!
        .compareDocumentPosition(container.querySelector('.resources-effect-ledger')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    await userEvent.click(button)
    expect(screen.getByRole('button', { name: 'Less details' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(detailStatText(container)).toEqual([
      'Damage1.6[2d6]+5',
      'Crit range19–20',
      'Crit multiplier×2',
      'Attack modSTR',
      'Damage modSTR',
      'TypeGreat Sword',
      'ProficiencyMartial',
      'HandednessTwo-handed',
      'MaterialSteel',
    ])
    expect(container.querySelector('.detail-extras')).not.toBeNull()
    expect(container.querySelectorAll('.detail-extras__entry')).toHaveLength(4)
    expect(button.parentElement?.nextElementSibling).toHaveClass('detail-extras')
    expect(container.querySelector('.detail-extras')).not.toHaveTextContent('Enhancement')
    expect(screen.getAllByText('Material')).toHaveLength(1)
    expect(screen.queryByText('Damage type')).toBeNull()
    const values = Array.from(
      container.querySelectorAll('.detail-fact-grid__value, .detail-extras__value'),
    )
    expect(values.slice(0, 3).every((value) => value.classList.contains('num'))).toBe(true)
    expect(values.slice(3).every((value) => !value.classList.contains('num'))).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'Less details' }))
    expect(screen.queryByText('Proficiency')).toBeNull()
    expect(detailStatText(container)).toHaveLength(5)
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps an armor’s bonuses visible and reveals its remaining stats', async () => {
    const { container } = renderItemDetailCard(toCapturedItem(capturedArmor))
    expect(container.querySelector('.resources-kv-grid')).toBeNull()
    expect(container.querySelector('.resources-stat-list')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Armor' })).toBeNull()
    expect(detailStatText(container)).toEqual(['Armor bonus16', 'Max Dex bonus1'])
    expect(container.querySelectorAll('.detail-fact-grid__cell')).toHaveLength(2)
    expect(screen.getByText('Gear slot')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'More details' }))
    expect(detailStatText(container)).toEqual([
      'Armor bonus16',
      'Max Dex bonus1',
      'Spell failure35%',
      'Check penalty-5',
      'MaterialMagesteel',
    ])
    expect(screen.queryByText('Shield bonus')).toBeNull()
    expect(screen.queryByText('Damage reduction')).toBeNull()
    expect(screen.getByText('Spell failure')).toHaveAttribute('title', 'Arcane spell failure')
    expect(screen.getByText('Check penalty')).toHaveAttribute('title', 'Armor check penalty')
    const values = Array.from(
      container.querySelectorAll('.detail-fact-grid__value, .detail-extras__value'),
    )
    expect(values.map((value) => value.classList.contains('num'))).toEqual([
      true,
      true,
      true,
      true,
      false,
    ])
    expect(screen.getByText('Obtained from')).toBeInTheDocument()
  })

  it('reveals damage reduction only when the API supplies it', async () => {
    const item = toCapturedItem({
      ...capturedArmor,
      armor: { ...capturedArmor.armor, damage_reduction: 5 },
    })
    const { container } = renderItemDetailCard(item)
    await userEvent.click(screen.getByRole('button', { name: 'More details' }))
    expect(detailStatText(container)).toContain('DR5')
    expect(screen.getByText('DR')).toHaveAttribute('title', 'Damage reduction')
  })

  it('keeps an unsplittable critical in one row and omits blank stats', async () => {
    const { container } = renderItemDetailCard(
      weaponItem({
        base_dice_count: null,
        base_dice_sides: null,
        critical_threat_range: null,
        critical_multiplier: null,
        damage: '  ',
        critical: 'special critical',
        dr_bypass: [],
      }),
    )
    expect(detailStatText(container)).toEqual([
      'Criticalspecial critical',
      'Attack modSTR',
      'Damage modSTR',
    ])
    await userEvent.click(screen.getByRole('button', { name: 'More details' }))
    expect(screen.queryByText('DR bypass')).toBeNull()
  })

  it('uses numeric dice, bonus and threat range in place of descriptive strings', () => {
    const { container } = renderItemDetailCard(
      weaponItem({
        base_dice_bonus: 5,
        damage_multiplier: 1.6,
        critical_threat_range: 6,
        critical: 'unparseable',
      }),
    )
    expect(detailStatText(container)).toEqual([
      'Damage1.6[2d6]+10',
      'Crit range15–20',
      'Crit multiplier×2',
      'Attack modSTR',
      'Damage modSTR',
    ])
  })

  it('adds the enhancement bonus to the dice and drops a unit multiplier', () => {
    const { container } = renderItemDetailCard(
      weaponItem({
        base_dice_bonus: 0,
        damage_multiplier: 1,
        critical_threat_range: 1,
        critical_multiplier: 4,
      }),
    )
    expect(detailStatText(container)).toEqual([
      'Damage2d6+5',
      'Crit range20',
      'Crit multiplier×4',
      'Attack modSTR',
      'Damage modSTR',
    ])
  })

  it('falls back to the critical string when numeric critical fields are null', () => {
    const { container } = renderItemDetailCard(
      weaponItem({
        base_dice_count: null,
        base_dice_sides: null,
        critical_threat_range: null,
        critical_multiplier: null,
        critical: '18-20/x3',
      }),
    )
    expect(detailStatText(container)).toEqual([
      'Crit range18–20',
      'Crit multiplier×3',
      'Attack modSTR',
      'Damage modSTR',
    ])
  })

  it('shows a rune arm’s extras after expanding without an empty primary grid', async () => {
    const item = toCapturedItem(capturedRuneArm)
    const { container, rerender } = renderItemDetailCard(item)
    expect(detailStatText(container)).toEqual([])
    expect(container.querySelector('.detail-fact-grid')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'More details' }))
    expect(detailStatText(container)).toEqual([
      'TypeRune Arm',
      'HandednessOff-hand',
      'MaterialForce',
    ])
    rerender(<></>)
    rerender(<ItemHoverCard item={item} />)
    expect(detailStatText(container)).toEqual([])
    expect(container.querySelector('.detail-fact-grid')).toBeNull()
    expect(screen.getByRole('button', { name: 'More details' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('shows only a toggle for a ring with an attribute row', async () => {
    const { container } = renderItemDetailCard(toCapturedItem(capturedRing))
    expect(container.querySelector('.detail-card__header .section-label')).toHaveTextContent(
      'Jewelry',
    )
    expect(detailStatText(container)).toEqual([])
    expect(container.querySelector('.detail-fact-grid')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'More details' }))
    expect(detailStatText(container)).toEqual(['MaterialSteel'])
  })

  it('shows a ring’s enhancement only in the effect table and keeps material in extras', async () => {
    const item = toCapturedItem({ ...capturedRing, enhancement_bonus: 2 })
    const { container } = renderItemDetailCard(item)
    expect(detailStatText(container)).toEqual([])
    expect(container.querySelectorAll('.detail-fact-grid__cell')).toHaveLength(0)
    expect(container.querySelector('.resources-effect-ledger .ledger-row')).toHaveTextContent(
      'Enhancement BonusEnhancement+2',
    )
    await userEvent.click(screen.getByRole('button', { name: 'More details' }))
    expect(detailStatText(container)).toEqual(['MaterialSteel'])
  })

  it('omits a zero enhancement from the effect table', () => {
    const item = toCapturedItem({ ...capturedRing, enhancement_bonus: 0 })
    const { container } = renderItemDetailCard(item)
    expect(detailStatText(container)).toEqual([])
    expect(screen.queryByRole('row', { name: /Enhancement Bonus/ })).toBeNull()
  })

  it('keeps every header fact in place when its socket opens and puts the ledger below the header', async () => {
    const { container } = renderItemDetailCard(toCapturedItem(capturedRing))
    const header = container.querySelector('.detail-card__header')!
    const facts = header.querySelector('.detail-card__facts')!
    const originalFacts = Array.from(facts.children) as HTMLElement[]
    const originalPositions = originalFacts.map((fact) => ({
      offsetTop: fact.offsetTop,
      offsetLeft: fact.offsetLeft,
    }))
    const factLabels = (): Array<string | null | undefined> =>
      Array.from(facts.children).map((fact) => fact.querySelector('.section-label')?.textContent)
    const originalLabels = factLabels()
    expect(originalLabels).toEqual(['ML', 'Gear slot', 'Raid', 'Rare', 'Augments'])
    expect(originalFacts.at(-1)?.querySelector('.augment-slot-symbol')).toHaveTextContent('Y')
    await userEvent.click(screen.getByRole('button', { name: 'Yellow slot' }))
    const ledger = container.querySelector('.resources-augment-candidates')!
    expect(ledger).not.toBeNull()
    expect(facts.contains(ledger)).toBe(false)
    expect(header.nextElementSibling).toBe(ledger)
    expect(factLabels()).toEqual(originalLabels)
    expect(Array.from(facts.children)).toEqual(originalFacts)
    expect(
      originalFacts.map((fact) => ({ offsetTop: fact.offsetTop, offsetLeft: fact.offsetLeft })),
    ).toEqual(originalPositions)
    expect(screen.getByText('Yellow socket · 0 augments')).toBeInTheDocument()
    expect(
      ledger.compareDocumentPosition(container.querySelector('.resources-detail-description')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Yellow slot' }))
    expect(container.querySelector('.resources-augment-candidates')).toBeNull()
    expect(screen.getByRole('button', { name: 'Yellow slot' })).toHaveFocus()
    expect(header.nextElementSibling).toHaveClass('detail-card__body')
    expect(
      originalFacts.map((fact) => ({ offsetTop: fact.offsetTop, offsetLeft: fact.offsetLeft })),
    ).toEqual(originalPositions)
  })

  it('returns focus to the socket word when Escape closes its ledger from a header', async () => {
    renderItemDetailCard(toItem(capturedRing as ApiItemDetail))
    const yellowSocket = screen.getByRole('button', { name: 'Yellow slot' })
    await userEvent.click(yellowSocket)
    const nameHeader = screen.getByRole('columnheader', { name: 'Name' })
    nameHeader.focus()

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('table', { name: /Augments that fit the Yellow slot/ })).toBeNull()
    expect(yellowSocket).toHaveFocus()
    expect(yellowSocket).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps the next Escape available to the detail after returning focus to a socket word', async () => {
    const escapeFlags: boolean[] = []
    render(
      <HoverCardProvider>
        <section
          data-detail-pane=""
          onKeyDown={(event) => {
            if (event.key === 'Escape') escapeFlags.push(event.defaultPrevented)
          }}
        >
          <ItemDetailCard item={toItem(capturedRing as ApiItemDetail)} />
        </section>
      </HoverCardProvider>,
    )
    const yellowSocket = screen.getByRole('button', { name: 'Yellow slot' })
    await userEvent.click(yellowSocket)
    const nameHeader = screen.getByRole('columnheader', { name: 'Name' })
    fireEvent.keyDown(yellowSocket, { key: 'Tab' })
    nameHeader.focus()
    expect(await screen.findByRole('tooltip')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).toBeNull()
    await userEvent.keyboard('{Escape}')
    expect(yellowSocket).toHaveFocus()
    await new Promise<void>((resolve) => setTimeout(resolve, 300))
    expect(screen.queryByRole('tooltip')).toBeNull()
    await userEvent.keyboard('{Escape}')
    expect(escapeFlags.at(-1)).toBe(false)
  })

  it('keeps every title fact in order and marks missing values consistently', () => {
    const { container, rerender } = renderItemDetailCard({
      ...plainItem,
      minimumLevel: null,
      equipmentSlot: '',
    })
    const header = container.querySelector('.detail-card__header')!
    const facts = Array.from(header.querySelectorAll('.detail-card__fact'))
    expect(facts.map((fact) => fact.querySelector('.section-label')?.textContent)).toEqual([
      'ML',
      'Gear slot',
      'Raid',
      'Rare',
      'Augments',
    ])
    expect(facts.map((fact) => fact.lastElementChild?.textContent)).toEqual(Array(5).fill('—'))
    expect(facts.every((fact) => fact.querySelector('.detail-card__fact-empty'))).toBe(true)
    expect(header.nextElementSibling).toHaveClass('detail-card__body')
    rerender(<ItemDetailCard item={plainItem} />)
    expect(facts.map((fact) => fact.lastElementChild?.textContent)).toEqual([
      '5',
      'Trinket',
      '—',
      '—',
      '—',
    ])
    rerender(
      <ItemDetailCard
        item={{ ...plainItem, minimumLevel: 0, equipmentSlot: '  ', setName: '  ' }}
      />,
    )
    expect(facts.map((fact) => fact.lastElementChild?.textContent)).toEqual([
      '0',
      '—',
      '—',
      '—',
      '—',
    ])
  })

  it('keeps hover card sockets last in the header facts', () => {
    const apiSlot = capturedRing.augment_slots[0]
    const item = toItem({
      ...capturedRing,
      augment_slots: [
        apiSlot,
        { ...apiSlot, sort_order: 1, label: 'sun', variant: 'sun' },
        { ...apiSlot, sort_order: 2, label: 'moon', variant: 'moon' },
        {
          ...apiSlot,
          sort_order: 3,
          family: 'dino',
          label: 'isle of dread: artifact scale (accessory)',
          variant: 'artifact scale (accessory)',
        },
      ],
    } as ApiItemDetail)
    const { container } = render(<ItemHoverCard item={item} />)
    const header = container.querySelector('.detail-card--hover .detail-card__header')!
    const facts = header.querySelector('.detail-card__facts')!
    expect(facts.lastElementChild?.querySelector('.section-label')).toHaveTextContent('Augments')
    expect(
      Array.from(facts.lastElementChild?.querySelectorAll('.augment-slot-symbol') ?? []).map(
        (symbol) => symbol.textContent,
      ),
    ).toEqual(['Y', 'S', 'M', 'D'])
    expect(header.nextElementSibling).toHaveClass('detail-card__body')
  })

  it('keeps the folded set band after hover enchantments across the five-row cap', async () => {
    const item = toCapturedItem({ ...capturedRing, enhancement_bonus: 2 })
    const setDetail = toSetDetail(capturedSet as ApiSetDetail)
    const { container, rerender } = render(
      <HoverCardProvider>
        <ItemHoverCard item={item} setDetail={setDetail} />
      </HoverCardProvider>,
    )
    const enchantments = container.querySelector('[data-section-key="enchantments"]')!
    expect(enchantments.querySelectorAll('.resources-hover-effect-row')).toHaveLength(5)
    const setBand = within(enchantments as HTMLElement).getByRole('row', {
      name: /Adherent of the Mists/,
    })
    expect(setBand).toHaveAttribute('aria-expanded', 'false')
    expect(setBand).toHaveTextContent('7 bonuses')
    expect(enchantments.querySelector('.ledger-header-row')).toBeNull()
    expect(enchantments.querySelector('.ledger-row--subheading')).toBeNull()
    expect(enchantments.querySelector('.detail-card__more')).toBeNull()
    await userEvent.click(setBand)
    expect(setBand).toHaveAttribute('aria-expanded', 'true')
    expect(enchantments.querySelector('.ledger-row--subheading')).toHaveTextContent('5 pieces')
    setBand.focus()
    await userEvent.keyboard(' ')
    expect(setBand).toHaveAttribute('aria-expanded', 'false')

    const sixRowItem = toCapturedItem({
      ...capturedRing,
      enhancement_bonus: 2,
      effects: [...capturedRing.effects, capturedWeapon.effects[0]],
    })
    rerender(
      <HoverCardProvider>
        <ItemHoverCard item={sixRowItem} setDetail={setDetail} />
      </HoverCardProvider>,
    )
    expect(enchantments.querySelectorAll('.resources-hover-effect-row')).toHaveLength(5)
    expect(setBand).toHaveAttribute('aria-expanded', 'false')
    expect(
      within(enchantments as HTMLElement).getByRole('button', { name: '+1 more' }),
    ).toBeVisible()
    await userEvent.click(
      within(enchantments as HTMLElement).getByRole('button', { name: '+1 more' }),
    )
    expect(enchantments.querySelectorAll('.resources-hover-effect-row')).toHaveLength(6)
    expect(setBand).toHaveAttribute('aria-expanded', 'false')

    rerender(
      <HoverCardProvider>
        <ItemHoverCard
          item={toCapturedItem({ ...capturedRing, enhancement_bonus: null, effects: [] })}
          setDetail={setDetail}
        />
      </HoverCardProvider>,
    )
    expect(enchantments.querySelectorAll('.resources-hover-effect-row')).toHaveLength(0)
    expect(setBand).toHaveAttribute('aria-expanded', 'false')
    expect(enchantments.querySelector('.detail-card__more')).toBeNull()
  })

  it('does not add the pane bonus-filter legend to the hover set band', () => {
    const item = toCapturedItem(capturedRing)
    const setDetail = toSetDetail(capturedSet as ApiSetDetail)
    const { container } = render(
      <ItemHoverCard
        item={item}
        setDetail={setDetail}
        matchingBonuses={['Positive Spell Power']}
      />,
    )
    expect(container.querySelector('.resources-effect-ledger .ledger-row--heading')).toBeVisible()
    expect(container.querySelector('.resources-effect-legend')).toBeNull()
  })

  it('shows shield primary rows and reserves the remaining shield stats for its toggle', async () => {
    const item = toCapturedItem(capturedShield)
    const { container, rerender } = renderItemDetailCard(item)
    expect(container.querySelector('.resources-detail-body')).not.toHaveClass(
      'resources-detail-body--weapon',
    )
    expect(detailStatText(container)).toEqual(['Shield bonus17', 'Max Dex bonus2'])
    expect(container.querySelectorAll('.detail-fact-grid__cell')).toHaveLength(2)
    expect(container.querySelector('.detail-dr-bypass')).toHaveTextContent(
      'DR bypassBludgeon, Magic',
    )
    expect(screen.queryByText('Damage')).toBeNull()
    expect(screen.queryByText('Crit range')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'More details' }))
    expect(detailStatText(container)).toEqual([
      'Shield bonus17',
      'Max Dex bonus2',
      'Spell failure50%',
      'Check penalty-9',
      'DR13',
      'MaterialSteel',
    ])
    rerender(<></>)
    rerender(<ItemHoverCard item={item} />)
    expect(detailStatText(container)).toEqual(['Shield bonus17', 'Max Dex bonus2'])
    expect(container.querySelector('.detail-dr-bypass')).toHaveTextContent(
      'DR bypassBludgeon, Magic',
    )
    expect(screen.getByRole('button', { name: 'More details' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(container.querySelector('.resources-detail-description')).toHaveTextContent(
      item.description!,
    )
  })

  it('shows armor primary cells and description while leaving extras collapsed in hover', () => {
    const { container } = render(<ItemHoverCard item={toCapturedItem(capturedArmor)} />)
    expect(detailStatText(container)).toEqual(['Armor bonus16', 'Max Dex bonus1'])
    expect(container.querySelector('.resources-detail-description')).toHaveTextContent(
      'Some beholders of Xoriat are fitted with resilient metal plates',
    )
    expect(screen.getByRole('button', { name: 'More details' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('shows no toggle when an item has no details to reveal', () => {
    const { container } = renderItemDetailCard(plainItem)
    expect(container.querySelector('.detail-stats')).toBeNull()
    expect(screen.queryByRole('button', { name: 'More details' })).toBeNull()
  })

  it('uses the fact grid for weapon stats and keeps effect rows in hover', () => {
    const { container, rerender } = render(<ItemHoverCard item={weaponItem()} />)
    expect(container.querySelector('.detail-stats .detail-fact-grid')).not.toBeNull()
    rerender(<ItemHoverCard item={toItem(capturedNecklace as ApiItemDetail)} />)
    const effectRow = container.querySelector('.resources-hover-effect-row .detail-value-row')
    expect(effectRow).toHaveClass('hover-card-row')
    expect(effectRow?.querySelector('.detail-value-row__label')).toHaveTextContent('Charisma')
    expect(effectRow?.querySelector('.detail-value-row__type')).toHaveTextContent('Enhancement')
    expect(effectRow?.querySelector('.detail-value-row__value')).toHaveTextContent('+8')
  })

  it('keeps each captured effect value in the item hover rows', () => {
    const { container } = render(<ItemHoverCard item={toItem(capturedBracers as ApiItemDetail)} />)
    const rows = [...container.querySelectorAll('.resources-hover-effect-row .detail-value-row')]
    expect(rows[0].querySelector('.detail-value-row__label')).toHaveTextContent('Dexterity')
    expect(rows[0].querySelector('.detail-value-row__value')).toHaveTextContent('+11')
    expect(rows[0].querySelector('.detail-value-row__type')).toHaveTextContent('Enhancement')
    expect(rows[1].querySelector('.detail-value-row__label')).toHaveTextContent('Riposte')
    expect(rows[1].querySelector('.detail-value-row__value')).toHaveTextContent('+5')
    expect(rows[1].querySelector('.detail-value-row__type')).toHaveTextContent('Insight')
  })

  it('shows an armor enhancement first among the item hover rows', () => {
    const { container } = render(<ItemHoverCard item={toCapturedItem(capturedArmor)} />)
    const firstRow = container.querySelector('.resources-hover-effect-row .detail-value-row')
    expect(firstRow?.querySelector('.detail-value-row__label')).toHaveTextContent(
      'Enhancement Bonus',
    )
    expect(firstRow?.querySelector('.detail-value-row__type')).toHaveTextContent('Enhancement')
    expect(firstRow?.querySelector('.detail-value-row__value')).toHaveTextContent('+5')
  })

  it('omits the enchantment enhancement row for zero or missing values', () => {
    const { rerender } = renderItemDetailCard(
      toCapturedItem({ ...capturedArmor, enhancement_bonus: 0 }),
    )
    expect(screen.queryByRole('row', { name: /Enhancement Bonus/ })).toBeNull()
    rerender(
      <ItemDetailCard item={toCapturedItem({ ...capturedArmor, enhancement_bonus: null })} />,
    )
    expect(screen.queryByRole('row', { name: /Enhancement Bonus/ })).toBeNull()
  })

  it('uses the same columns and ordering for pane and hover extras', async () => {
    const item = weaponItem()
    const pane = render(<ItemDetailCard item={item} />)
    await userEvent.click(screen.getByRole('button', { name: 'More details' }))
    expect(pane.container.querySelector('.detail-extras')).not.toBeNull()
    expect(detailStatText(pane.container).slice(5)).toEqual([
      'TypeGreat Sword',
      'ProficiencyMartial',
      'HandednessTwo-handed',
      'MaterialSteel',
    ])
    const paneExtraText = detailStatText(pane.container).slice(5)
    pane.unmount()
    const hover = render(<ItemHoverCard item={item} />)
    expect(hover.container.querySelectorAll('.detail-fact-grid__cell')).toHaveLength(5)
    await userEvent.click(screen.getByRole('button', { name: 'More details' }))
    expect(hover.container.querySelector('.detail-extras')).not.toBeNull()
    expect(detailStatText(hover.container).slice(5)).toEqual(paneExtraText)
  })

  it('keeps long values in their own column entry without dotted rules', async () => {
    const item = weaponItem({
      weapon_type: '1234567890123456789012',
      proficiency: '12345678901234567890123',
      dr_bypass: [],
    })
    const { container } = renderItemDetailCard(item)
    await userEvent.click(screen.getByRole('button', { name: 'More details' }))
    const entries = Array.from(container.querySelectorAll('.detail-extras__entry'))
    expect(entries).toHaveLength(4)
    expect(entries[0]).toHaveTextContent('Type1234567890123456789012')
    expect(entries[1]).toHaveTextContent('Proficiency12345678901234567890123')
    expect(entries.every((entry) => !entry.classList.contains('detail-extras__entry--wide'))).toBe(
      true,
    )
  })
})

describe('ItemDetailCard obtained-from layout', () => {
  it('places mapped quest details and raid and rare words in two columns without chips', () => {
    const apiItem = capturedNecklace as ApiItemDetail
    const { container } = renderItemDetailCard(
      toItem({
        ...apiItem,
        quests: apiItem.quests.map((lootQuest) => ({
          ...lootQuest,
          is_raid: true,
          is_rare: true,
        })),
      }),
    )
    const row = container.querySelector('.resources-item-source-row')!
    expect(
      row.querySelector('.resources-item-source-left .resources-item-source-name'),
    ).toHaveTextContent('Friends in Low Places')
    expect(row.querySelector('.resources-item-source-details')).toHaveTextContent(
      /End chest\s*·\s*Raid\s*·\s*Rare/,
    )
    expect(
      row.querySelector('.resources-item-source-right .resources-item-source-level'),
    ).toHaveTextContent('Level 16 / 26')
    expect(row.querySelector('.resources-item-source-level')).toHaveAttribute(
      'data-tip',
      'Heroic 16, epic 26',
    )
    expect(row.querySelector('.resources-item-source-location')).toHaveTextContent(
      'Shadowfell Conspiracy › Purple Dragon Knights',
    )
    expect(row.querySelector('.resources-chip')).toBeNull()
  })

  it('places mapped adventure-pack and chain descriptors beneath their names', () => {
    const { container } = renderItemDetailCard(toItem(capturedArmor as ApiItemDetail))
    const rows = Array.from(container.querySelectorAll('.resources-item-source-row'))
    const packRow = rows.find(
      (row) =>
        row.querySelector('.resources-item-source-title')?.textContent === 'Reign of Madness',
    )!
    const chainRow = rows.find(
      (row) =>
        row.querySelector('.resources-item-source-descriptor')?.textContent === 'Chain end reward',
    )!
    expect(
      packRow.querySelector('.resources-item-source-left .resources-item-source-details'),
    ).toHaveTextContent(/Anywhere in the pack\s*·\s*Opuloxx chest/)
    expect(packRow.querySelector('.resources-item-source-right')).toBeNull()
    expect(
      chainRow.querySelector('.resources-item-source-left .resources-item-source-details'),
    ).toHaveTextContent('Chain end reward')
    expect(chainRow.querySelector('.resources-item-source-right')).toBeNull()
    expect(container.querySelector('.resources-item-source-list .resources-chip')).toBeNull()
  })

  it('separates each pack descriptor and Rare with the same faint dot', () => {
    const apiItem = capturedArmor as ApiItemDetail
    const { container } = renderItemDetailCard(
      toItem({
        ...apiItem,
        adventure_packs: apiItem.adventure_packs.map((adventurePack) => ({
          ...adventurePack,
          is_rare: true,
        })),
      }),
    )
    const packRow = Array.from(container.querySelectorAll('.resources-item-source-row')).find(
      (row) =>
        row.querySelector('.resources-item-source-title')?.textContent === 'Reign of Madness',
    )!
    const details = packRow.querySelector('.resources-item-source-details')!
    expect(Array.from(details.children).map((part) => part.className)).toEqual([
      'resources-item-source-descriptor',
      'resources-item-source-separator',
      'resources-item-source-descriptor',
      'resources-item-source-separator',
      'resources-item-source-rare',
    ])
    expect(Array.from(details.children).map((part) => part.textContent)).toEqual([
      'Anywhere in the pack',
      '·',
      'Opuloxx chest',
      '·',
      'Rare',
    ])
  })

  it('shows an epic-only level and omits missing pack and patron details', () => {
    const apiItem = capturedNecklace as ApiItemDetail
    const { container } = renderItemDetailCard(
      toItem({
        ...apiItem,
        quests: apiItem.quests.map((lootQuest) => ({
          ...lootQuest,
          level: null,
          pack: null,
          patron: null,
        })),
      }),
    )
    expect(container.querySelector('.resources-item-source-level')).toHaveTextContent('Level 26')
    expect(container.querySelector('.resources-item-source-level')).not.toHaveAttribute('data-tip')
    expect(container.querySelector('.resources-item-source-location')).toBeNull()
  })

  it('omits the right column when both quest levels and location are absent', () => {
    const apiItem = capturedNecklace as ApiItemDetail
    const { container } = renderItemDetailCard(
      toItem({
        ...apiItem,
        quests: apiItem.quests.map((lootQuest) => ({
          ...lootQuest,
          level: null,
          epic_level: null,
          pack: null,
          patron: null,
        })),
      }),
    )
    expect(container.querySelector('.resources-item-source-right')).toBeNull()
  })
})

describe('ItemDetailCard drop locations', () => {
  it('shows a weapon’s primary rows with facts, effects, and drops for hover', () => {
    render(
      <ItemHoverCard
        item={{
          ...weaponItem({ critical_threat_range: 1, critical: '20/x2' }),
          quests: [quest()],
        }}
      />,
    )
    expect(
      screen.getByRole('heading', { name: 'Greatsword of the Fallen Age' }),
    ).toBeInTheDocument()
    expect(screen.getByText('ML')).toBeInTheDocument()
    expect(
      screen.getByText("Delera's Tomb", { selector: '.resources-hover-anchor' }),
    ).toBeInTheDocument()
    expect(
      Array.from(document.querySelectorAll('.detail-stats .detail-fact-grid__cell')).map(
        (cell) => cell.textContent,
      ),
    ).toEqual([
      'Damage1.6[2d6]+5',
      'Crit range20',
      'Crit multiplier×2',
      'Attack modSTR',
      'Damage modSTR',
    ])
    expect(screen.getByRole('button', { name: 'More details' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
  it('renders a wiki link icon next to each quest in Obtained from', () => {
    renderItemDetailCard({ ...plainItem, quests: [quest()] })
    const link = screen.getByRole('link', { name: "Open Delera's Tomb on DDO Wiki" })
    expect(link).toHaveAttribute('href', "https://ddowiki.com/page/Delera's_Tomb")
    expect(link.parentElement).toHaveAttribute('data-tip', 'Open on ddowiki')
  })

  it('marks a raid drop beneath the quest name', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      quests: [quest({ patron: 'The Free Agents', isRaid: true })],
    })
    expect(
      container.querySelector('.resources-item-source-details .resources-item-source-raid'),
    ).toHaveTextContent('Raid')
    expect(container.querySelector('.resources-item-source-level')).toHaveTextContent('Level 8')
    expect(container.querySelector('.resources-item-source-location')).toHaveTextContent(
      'The Free Agents',
    )
  })

  it('marks a rare drop after the raid word', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      quests: [quest({ isRaid: true, isRareLoot: true })],
    })
    expect(container.querySelector('.resources-item-source-details')).toHaveTextContent(
      /Raid\s*·\s*Rare/,
    )
    expect(container.querySelector('.resources-item-source-list .resources-chip')).toBeNull()
  })

  it('shows Rare only on the quests where the item is rare', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      quests: [
        quest({ id: 1, name: 'Tempest Spine', isRareLoot: true }),
        quest({ id: 2, name: 'The Pit' }),
      ],
    })
    const rows = container.querySelectorAll('.resources-item-source-row')
    expect(rows[0].querySelector('.resources-item-source-rare')).toHaveTextContent('Rare')
    expect(rows[1].querySelector('.resources-item-source-rare')).toBeNull()
  })

  it('labels an end reward beneath the name when there is no chest', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      quests: [quest({ isEndReward: true })],
    })
    expect(container.querySelector('.resources-item-source-details')).toHaveTextContent(
      /^End reward$/,
    )
    expect(container.querySelector('.resources-item-source-level')).toHaveTextContent('Level 8')
  })

  it('names the chest after the quest name in sentence case', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      quests: [quest({ chests: ["althea's chest"] })],
    })
    expect(
      container.querySelector('.resources-item-source-details .resources-item-source-chest'),
    ).toHaveTextContent("Althea's chest")
  })

  it('renders one row for a quest that is both a chest drop and the end reward', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = renderItemDetailCard({
      ...plainItem,
      quests: [quest({ chests: ['end chest'], isEndReward: true, isRareLoot: true })],
    })
    const rows = container.querySelectorAll('.resources-item-source-row')
    expect(rows).toHaveLength(1)
    expect(rows[0].querySelector('.resources-item-source-chest')).toHaveTextContent('End chest')
    expect(rows[0].querySelector('.resources-item-source-details')).toHaveTextContent(
      /End chest\s*·\s*End reward\s*·\s*Rare/,
    )
    expect(rows[0].querySelector('.resources-item-source-level')).toHaveTextContent('Level 8')
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('lists a quest chain end reward after the quest rows with Rare and a wiki link', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      quests: [quest()],
      questChains: [{ id: 3, name: 'The Lost Seekers', isRareLoot: true, wikiUrl: null }],
    })
    const rows = container.querySelectorAll('.resources-item-source-row')
    expect(rows).toHaveLength(2)
    expect(rows[1].querySelector('.resources-item-source-title')).toHaveTextContent(
      'The Lost Seekers',
    )
    expect(rows[1].querySelector('.resources-item-source-rare')).toHaveTextContent('Rare')
    expect(rows[1].querySelector('.resources-item-source-descriptor')).toHaveTextContent(
      'Chain end reward',
    )
    expect(
      screen.getByRole('link', { name: 'Open The Lost Seekers on DDO Wiki' }),
    ).toBeInTheDocument()
  })

  it('lists a saga reward per tier with the tier in sentence case', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      sagas: [
        {
          id: 1,
          name: 'Masterminds of Sharn',
          tier: 'epic',
          isRareLoot: false,
          wikiUrl: null,
        },
        { id: 1, name: 'Masterminds of Sharn', tier: 'legendary', isRareLoot: true, wikiUrl: null },
      ],
    })
    expect(screen.getByText('Obtained from')).toBeInTheDocument()
    const rows = container.querySelectorAll('.resources-item-source-row')
    expect(
      Array.from(rows).map((r) =>
        Array.from(r.querySelectorAll('.resources-item-source-descriptor')).map(
          (descriptor) => descriptor.textContent,
        ),
      ),
    ).toEqual([
      ['Saga reward', 'Epic'],
      ['Saga reward', 'Legendary'],
    ])
    expect(rows[0].querySelector('.resources-item-source-rare')).toBeNull()
    expect(rows[1].querySelector('.resources-item-source-rare')).toHaveTextContent('Rare')
    expect(
      screen.getAllByRole('link', { name: 'Open Masterminds of Sharn on DDO Wiki' }),
    ).toHaveLength(2)
  })

  it('lists a saga reward with no tier as Saga reward alone', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      sagas: [
        { id: 1, name: 'Masterminds of Sharn', tier: null, isRareLoot: false, wikiUrl: null },
      ],
    })
    expect(container.querySelector('.resources-item-source-descriptor')).toHaveTextContent(
      /^Saga reward$/,
    )
  })

  it('lists an adventure pack drop as Anywhere in the pack with the chest, Rare and wiki link', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      adventurePackDrops: [packDrop({ isRareLoot: true })],
    })
    expect(screen.getByText('Obtained from')).toBeInTheDocument()
    expect(container.querySelector('.resources-item-source-title')).toHaveTextContent(
      'The Isle of Dread',
    )
    expect(
      Array.from(container.querySelectorAll('.resources-item-source-descriptor')).map(
        (descriptor) => descriptor.textContent,
      ),
    ).toEqual(['Anywhere in the pack', 'Any legendary chest'])
    expect(container.querySelector('.resources-item-source-rare')).toHaveTextContent('Rare')
    expect(
      screen.getByRole('link', { name: 'Open The Isle of Dread on DDO Wiki' }),
    ).toHaveAttribute('href', 'https://ddowiki.com/page/The_Isle_of_Dread')
  })

  it('lists an adventure pack drop with no chest as Anywhere in the pack alone', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      adventurePackDrops: [packDrop({ chest: null })],
    })
    expect(container.querySelector('.resources-item-source-descriptor')).toHaveTextContent(
      /^Anywhere in the pack$/,
    )
  })

  it('links quest chain and saga rows to their wiki_url when the API gives one', () => {
    renderItemDetailCard({
      ...plainItem,
      questChains: [
        {
          id: 3,
          name: 'The Lost Seekers',
          isRareLoot: false,
          wikiUrl: 'https://ddowiki.com/page/The_Lost_Seekers_(chain)',
        },
      ],
      sagas: [
        {
          id: 1,
          name: 'Masterminds of Sharn',
          tier: 'epic',
          isRareLoot: false,
          wikiUrl: 'https://ddowiki.com/page/Masterminds_of_Sharn_(saga)',
        },
      ],
    })
    expect(screen.getByRole('link', { name: 'Open The Lost Seekers on DDO Wiki' })).toHaveAttribute(
      'href',
      'https://ddowiki.com/page/The_Lost_Seekers_(chain)',
    )
    expect(
      screen.getByRole('link', { name: 'Open Masterminds of Sharn on DDO Wiki' }),
    ).toHaveAttribute('href', 'https://ddowiki.com/page/Masterminds_of_Sharn_(saga)')
  })

  it('builds the quest chain and saga wiki links from the name when the API gives no wiki_url', () => {
    renderItemDetailCard({
      ...plainItem,
      questChains: [{ id: 3, name: 'The Lost Seekers', isRareLoot: false, wikiUrl: null }],
      sagas: [
        { id: 1, name: 'Masterminds of Sharn', tier: null, isRareLoot: false, wikiUrl: null },
      ],
    })
    expect(screen.getByRole('link', { name: 'Open The Lost Seekers on DDO Wiki' })).toHaveAttribute(
      'href',
      'https://ddowiki.com/page/The_Lost_Seekers',
    )
    expect(
      screen.getByRole('link', { name: 'Open Masterminds of Sharn on DDO Wiki' }),
    ).toHaveAttribute('href', 'https://ddowiki.com/page/Masterminds_of_Sharn')
  })

  it('shows no chest when the drop text names none', () => {
    const { container } = renderItemDetailCard({ ...plainItem, quests: [quest()] })
    expect(container.querySelector('.resources-item-source-chest')).toBeNull()
  })

  it('falls back to the free-text drop location when no quests are linked', () => {
    renderItemDetailCard({ ...plainItem, dropLocation: 'Vendor: House Kundarak' })
    expect(screen.getByText('Obtained from')).toBeInTheDocument()
    expect(screen.getByText('Vendor: House Kundarak')).toBeInTheDocument()
  })

  it('renders no Obtained from section when the item has no source at all', () => {
    renderItemDetailCard(plainItem)
    expect(screen.queryByText('Obtained from')).toBeNull()
    expect(screen.queryByText('Drops from')).toBeNull()
  })
})

describe('ItemDetailCard sources beyond quests', () => {
  function rowDescriptorText(container: HTMLElement): string[] {
    return Array.from(container.querySelectorAll('.resources-item-source-row')).map((row) =>
      Array.from(row.querySelectorAll('.resources-item-source-descriptor'))
        .map((descriptor) => descriptor.textContent)
        .join(' · '),
    )
  }

  it('lists a crafting system as Crafted at with a wiki link to its page', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      sourcesBeyondQuests: [itemSource()],
    })
    expect(screen.getByText('Obtained from')).toBeInTheDocument()
    expect(container.querySelector('.resources-item-source-title')).toHaveTextContent(
      'Thunder-Forged',
    )
    expect(rowDescriptorText(container)).toEqual(['Crafted at'])
    expect(screen.getByRole('link', { name: 'Open Thunder-Forged on DDO Wiki' })).toHaveAttribute(
      'href',
      'https://ddowiki.com/page/Thunder-Forged',
    )
  })

  it('lists a challenge pack as Challenge rewards with Rare', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      sourcesBeyondQuests: [
        itemSource({
          kind: 'challengePack',
          key: 'challengePack-62',
          name: 'Secrets of the Artificers',
          isRareLoot: true,
          wikiUrl: 'https://ddowiki.com/page/Secrets_of_the_Artificers',
        }),
      ],
    })
    expect(rowDescriptorText(container)).toEqual(['Challenge rewards'])
    expect(container.querySelector('.resources-item-source-rare')).toHaveTextContent('Rare')
  })

  it('lists a vendor as Sold by with its location and cost', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      sourcesBeyondQuests: [
        itemSource({
          kind: 'vendor',
          key: 'vendor-1',
          name: 'Morten Edgewright',
          vendorLocation: 'The Harbor',
          cost: '50 Tokens',
        }),
      ],
    })
    expect(rowDescriptorText(container)).toEqual(['Sold by · The Harbor · 50 Tokens'])
  })

  it('lists a vendor with no location or cost as Sold by alone', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      sourcesBeyondQuests: [itemSource({ kind: 'vendor', key: 'vendor-1', name: 'Morten' })],
    })
    expect(rowDescriptorText(container)).toEqual(['Sold by'])
  })

  it('lists an event as Event reward', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      sourcesBeyondQuests: [
        itemSource({ kind: 'event', key: 'event-4', name: 'The Night Revels' }),
      ],
    })
    expect(rowDescriptorText(container)).toEqual(['Event reward'])
  })

  it('names starter gear by its level and shows no wiki link when the API gives no page', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      sourcesBeyondQuests: [
        itemSource({
          kind: 'starter',
          key: 'starter-15',
          name: 'Starter gear at level 15',
          characterLevel: 15,
          wikiUrl: null,
        }),
      ],
    })
    expect(container.querySelector('.resources-item-source-title')).toHaveTextContent(
      'Starter gear at level 15',
    )
    expect(container.querySelector('.resources-item-source-row .wiki-link-icon')).toBeNull()
  })

  it('lists adventure pack drops after the quests and sources beyond quests after the chain and saga rows', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      quests: [quest()],
      adventurePackDrops: [packDrop()],
      questChains: [{ id: 3, name: 'The Lost Seekers', isRareLoot: false, wikiUrl: null }],
      sagas: [
        { id: 1, name: 'Masterminds of Sharn', tier: null, isRareLoot: false, wikiUrl: null },
      ],
      sourcesBeyondQuests: [itemSource()],
    })
    expect(
      Array.from(container.querySelectorAll('.resources-item-source-title')).map(
        (t) => t.textContent,
      ),
    ).toEqual([
      "Delera's Tomb",
      'The Isle of Dread',
      'The Lost Seekers',
      'Masterminds of Sharn',
      'Thunder-Forged',
    ])
  })

  it('shows the linked sources instead of the free-text drop location', () => {
    renderItemDetailCard({
      ...plainItem,
      dropLocation: 'Thunder-Forged, Crafted from various ingredients',
      sourcesBeyondQuests: [itemSource()],
    })
    expect(screen.queryByText('Thunder-Forged, Crafted from various ingredients')).toBeNull()
  })
})

describe('ItemDetailCard header attributes', () => {
  it('shows the signed enhancement in the table without a Set title fact', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      enhancementBonus: 5,
      setName: 'Adherent of the Mists',
    })
    expect(container.querySelector('.detail-fact-grid')).toBeNull()
    expect(container.querySelector('.resources-effect-ledger .ledger-row')).toHaveTextContent(
      'Enhancement BonusEnhancement+5',
    )
    expect(container.querySelector('.detail-card__header')).not.toHaveTextContent('Set')
    expect(screen.queryByRole('button', { name: 'More details' })).toBeNull()
  })

  it('lists clickies with their description', () => {
    renderItemDetailCard({
      ...plainItem,
      clickies: [{ name: 'Haste', description: 'Haste (3 charges)' }],
    })
    expect(screen.getByText('Clickies')).toBeInTheDocument()
    expect(screen.getByText('Haste (3 charges)')).toBeInTheDocument()
  })

  it('keeps the pane description and clickies in the hover variant', () => {
    const item = {
      ...plainItem,
      description: 'A useful trinket.',
      clickies: [{ name: 'Haste', description: 'Haste (3 charges)' }],
    }
    const { rerender } = renderItemDetailCard(item)
    expect(screen.getByText('A useful trinket.')).toBeInTheDocument()
    expect(screen.getByText('Haste (3 charges)')).toBeInTheDocument()
    rerender(<ItemHoverCard item={item} />)
    expect(screen.getByText('A useful trinket.')).toBeInTheDocument()
    expect(screen.getByText('Haste (3 charges)')).toBeInTheDocument()
  })

  it('reveals and collapses an overflowing hover description without losing its text', async () => {
    const scrollHeight = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(120)
    const clientHeight = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(48)
    const description = 'A long description that spans more than three lines in the hover card.'
    render(<ItemHoverCard item={{ ...plainItem, description }} />)
    const paragraph = screen.getByText(description)
    expect(paragraph).toHaveClass('resources-detail-description--brief')
    expect(paragraph).not.toHaveClass('resources-detail-description--expanded')
    expect(screen.getByRole('button', { name: 'Show more' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Show more' }))
    expect(paragraph).toHaveClass('resources-detail-description--expanded')
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Show less' }))
    expect(paragraph).not.toHaveClass('resources-detail-description--expanded')
    expect(screen.getByRole('button', { name: 'Show more' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(paragraph).toHaveTextContent(description)
    scrollHeight.mockRestore()
    clientHeight.mockRestore()
  })
})

describe('ItemDetailCard data source', () => {
  it('shows no Source row for an item the wiki supplied', () => {
    renderItemDetailCard({
      ...plainItem,
      wikiUrl: 'https://ddowiki.com/page/Item:Garbage_Can_Lid',
    })
    expect(screen.queryByText('Source')).toBeNull()
    expect(screen.queryByText('DDO Wiki (not yet in DDOBuilderV2)')).toBeNull()
  })
})

describe('ItemDetailCard legacy chip', () => {
  it('shows a Legacy chip next to the name of a legacy item', () => {
    const { container } = renderItemDetailCard({ ...plainItem, isLegacy: true })
    const chip = container.querySelector('.detail-card__header .resources-chip[data-kind="legacy"]')
    expect(chip).toHaveTextContent('Legacy')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/^Voice of the Master$/)
  })

  it('shows no Legacy chip on a current item', () => {
    const { container } = renderItemDetailCard(plainItem)
    expect(container.querySelector('.resources-chip[data-kind="legacy"]')).toBeNull()
  })
})

describe('ItemDetailCard action row', () => {
  it.each(['Add to compare', 'Compare in Gear', 'Add to farm list'])(
    'renders %s disabled',
    (label) => {
      renderItemDetailCard(plainItem)
      expect(screen.getByRole('button', { name: label })).toBeDisabled()
    },
  )

  it('explains when the actions arrive', () => {
    renderItemDetailCard(plainItem)
    expect(
      screen.getByText('Actions arrive with the Gear and Farm checklist phases.'),
    ).toBeInTheDocument()
  })
})
