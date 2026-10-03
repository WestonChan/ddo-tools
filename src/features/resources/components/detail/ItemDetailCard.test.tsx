import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, type RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ApiItemDetail, ApiWeaponStats } from '../../../../lib/api'
import capturedWeapon from '../../queries/fixtures/item3479.json'
import capturedRuneArm from '../../queries/fixtures/item924.json'
import capturedArmor from '../../queries/fixtures/item831.json'
import capturedShield from '../../queries/fixtures/item8203.json'
import capturedRing from '../../queries/fixtures/item487.json'
import capturedNecklace from '../../queries/fixtures/item7631.json'
import { toItem } from '../../queries/items'
import { ItemDetailCard } from './ItemDetailCard'
import type { Item, ItemSource, LootQuest } from '../../queries/items'

vi.mock('../../queries/useItems', () => ({
  useFittingAugmentsBySlotLabel: () => ({ data: [], isPending: false, error: null }),
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
  bonuses: [],
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

function weaponItem(weaponOverrides: Partial<ApiWeaponStats> = {}): Item {
  return toItem({
    ...(capturedWeapon as ApiItemDetail),
    weapon: {
      ...(capturedWeapon.weapon as ApiWeaponStats),
      ...weaponOverrides,
    },
  })
}

function detailRowText(container: HTMLElement): Array<string | null> {
  return Array.from(container.querySelectorAll('.resources-item-details .detail-value-row')).map(
    (row) => row.textContent,
  )
}

describe('ItemDetailCard details', () => {
  it('keeps a weapon’s primary rows above one toggle and reveals its attributes and extras', async () => {
    const { container } = renderItemDetailCard(weaponItem())
    expect(detailRowText(container)).toEqual([
      'Damage1.6[2d6]+5',
      'Crit range19–20',
      'Crit multiplier×2',
    ])
    expect(screen.queryByRole('heading', { name: 'Weapon' })).toBeNull()
    expect(container.querySelector('.resources-kv-grid')).toBeNull()
    expect(screen.queryByText('Material')).toBeNull()
    const button = screen.getByRole('button', { name: 'More weapon details' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button.parentElement?.previousElementSibling).toHaveTextContent('Crit multiplier×2')
    expect(
      container
        .querySelector('.resources-detail-description')!
        .compareDocumentPosition(container.querySelector('.resources-item-details')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      container
        .querySelector('.resources-item-details')!
        .compareDocumentPosition(container.querySelector('.resources-enchantment-ledger')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    await userEvent.click(button)
    expect(screen.getByRole('button', { name: 'Less' })).toHaveAttribute('aria-expanded', 'true')
    expect(detailRowText(container)).toEqual([
      'Damage1.6[2d6]+5',
      'Crit range19–20',
      'Crit multiplier×2',
      'Enhancement+5',
      'TypeGreat Sword',
      'ProficiencyMartial',
      'HandednessTwo-handed',
      'MaterialSteel',
      'Damage reduction bypassesChaotic, Evil, Good, Lawful, Magic, Slash',
    ])
    expect(screen.getAllByText('Material')).toHaveLength(1)
    expect(screen.queryByText('Damage type')).toBeNull()
    const values = Array.from(
      container.querySelectorAll('.resources-item-details .detail-value-row__value'),
    )
    expect(values.slice(0, 4).every((value) => value.classList.contains('num'))).toBe(true)
    expect(values.slice(4).every((value) => !value.classList.contains('num'))).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'Less' }))
    expect(screen.queryByText('Proficiency')).toBeNull()
    expect(detailRowText(container)).toHaveLength(3)
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps an armor’s bonuses visible and reveals its remaining stats', async () => {
    const { container } = renderItemDetailCard(toItem(capturedArmor as ApiItemDetail))
    expect(container.querySelector('.resources-kv-grid')).toBeNull()
    expect(container.querySelector('.resources-stat-list')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Armor' })).toBeNull()
    expect(detailRowText(container)).toEqual(['Armor bonus16', 'Max Dex bonus1'])
    expect(screen.getByText('Gear slot')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'More armor details' }))
    expect(detailRowText(container)).toEqual([
      'Armor bonus16',
      'Max Dex bonus1',
      'Enhancement+5',
      'Arcane spell failure35%',
      'Armor check penalty-5',
      'MaterialMagesteel',
    ])
    expect(screen.queryByText('Shield bonus')).toBeNull()
    expect(screen.queryByText('Damage reduction')).toBeNull()
    const values = Array.from(
      container.querySelectorAll('.resources-item-details .detail-value-row__value'),
    )
    expect(values.map((value) => value.classList.contains('num'))).toEqual([
      true,
      true,
      true,
      true,
      true,
      false,
    ])
    expect(screen.getByText('Obtained from')).toBeInTheDocument()
  })

  it('reveals damage reduction only when the API supplies it', async () => {
    const item = toItem({
      ...(capturedArmor as ApiItemDetail),
      armor: { ...capturedArmor.armor, damage_reduction: 5 },
    })
    const { container } = renderItemDetailCard(item)
    await userEvent.click(screen.getByRole('button', { name: 'More armor details' }))
    expect(detailRowText(container)).toContain('Damage reduction5')
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
    expect(detailRowText(container)).toEqual(['Criticalspecial critical'])
    await userEvent.click(screen.getByRole('button', { name: 'More weapon details' }))
    expect(screen.queryByText('Damage reduction bypasses')).toBeNull()
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
    expect(detailRowText(container)).toEqual([
      'Damage1.6[2d6]+10',
      'Crit range15–20',
      'Crit multiplier×2',
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
    expect(detailRowText(container)).toEqual(['Damage2d6+5', 'Crit range20', 'Crit multiplier×4'])
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
    expect(detailRowText(container)).toEqual(['Crit range18–20', 'Crit multiplier×3'])
  })

  it('shows a rune arm’s extra rows only after expanding and no rows in hover', async () => {
    const item = toItem(capturedRuneArm as ApiItemDetail)
    const { container, rerender } = renderItemDetailCard(item)
    expect(detailRowText(container)).toEqual([])
    await userEvent.click(screen.getByRole('button', { name: 'More weapon details' }))
    expect(detailRowText(container)).toEqual([
      'TypeRune Arm',
      'HandednessOff-hand',
      'MaterialForce',
    ])
    rerender(<ItemDetailCard item={item} variant="hover" />)
    expect(detailRowText(container)).toEqual([])
    expect(screen.queryByRole('button', { name: 'More weapon details' })).toBeNull()
  })

  it('shows only a toggle for a ring with an attribute row', async () => {
    const { container } = renderItemDetailCard(toItem(capturedRing as ApiItemDetail))
    expect(container.querySelector('.detail-card__header .section-label')).toHaveTextContent(
      'Jewelry',
    )
    expect(detailRowText(container)).toEqual([])
    await userEvent.click(screen.getByRole('button', { name: 'More details' }))
    expect(detailRowText(container)).toEqual(['MaterialSteel'])
  })

  it('reveals enhancement and material together when a ring has both', async () => {
    const item = toItem({ ...(capturedRing as ApiItemDetail), enhancement_bonus: 2 })
    const { container } = renderItemDetailCard(item)
    await userEvent.click(screen.getByRole('button', { name: 'More details' }))
    expect(detailRowText(container)).toEqual(['Enhancement+2', 'MaterialSteel'])
  })

  it('keeps every header fact in place when its socket opens and puts the ledger below the header', async () => {
    const { container } = renderItemDetailCard(toItem(capturedRing as ApiItemDetail))
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
    expect(originalLabels).toEqual(['ML', 'Gear slot', 'Raid', 'Rare', 'Set', 'Augments'])
    expect(originalFacts.at(-1)?.querySelector('.resources-augment-gem')).not.toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /Yellow/ }))
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
    await userEvent.click(screen.getByRole('button', { name: /Yellow/ }))
    expect(container.querySelector('.resources-augment-candidates')).toBeNull()
    expect(header.nextElementSibling).toHaveClass('detail-card__body')
    expect(
      originalFacts.map((fact) => ({ offsetTop: fact.offsetTop, offsetLeft: fact.offsetLeft })),
    ).toEqual(originalPositions)
  })

  it('omits the Augments fact for items without sockets', () => {
    const { container } = renderItemDetailCard(plainItem)
    const header = container.querySelector('.detail-card__header')!
    expect(header.querySelector('.detail-card__facts')).not.toBeNull()
    expect(header.nextElementSibling).toHaveClass('detail-card__body')
    expect(screen.queryByText('Augments')).toBeNull()
  })

  it('keeps hover card sockets last in the header facts', () => {
    const { container } = render(
      <ItemDetailCard item={toItem(capturedRing as ApiItemDetail)} variant="hover" />,
    )
    const header = container.querySelector('.detail-card--hover .detail-card__header')!
    const facts = header.querySelector('.detail-card__facts')!
    expect(facts.lastElementChild?.querySelector('.section-label')).toHaveTextContent('Augments')
    expect(facts.lastElementChild?.querySelector('.resources-augment-gem')).not.toBeNull()
    expect(header.nextElementSibling).toHaveClass('detail-card__body')
  })

  it('shows shield primary rows and reserves the remaining shield stats for its toggle', async () => {
    const item = toItem(capturedShield as ApiItemDetail)
    const { container, rerender } = renderItemDetailCard(item)
    expect(container.querySelector('.resources-detail-body')).not.toHaveClass(
      'resources-detail-body--weapon',
    )
    expect(detailRowText(container)).toEqual(['Shield bonus17', 'Max Dex bonus2'])
    expect(screen.queryByText('Damage')).toBeNull()
    expect(screen.queryByText('Crit range')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'More shield details' }))
    expect(detailRowText(container)).toEqual([
      'Shield bonus17',
      'Max Dex bonus2',
      'Enhancement+5',
      'Arcane spell failure50%',
      'Armor check penalty-9',
      'Damage reduction13',
      'MaterialSteel',
    ])
    rerender(<ItemDetailCard item={item} variant="hover" />)
    expect(detailRowText(container)).toEqual(['Shield bonus17', 'Max Dex bonus2'])
    expect(screen.queryByRole('button', { name: 'More shield details' })).toBeNull()
    expect(container.querySelector('.resources-detail-description')).toBeNull()
  })

  it('shows armor primary rows without description or a toggle in hover', () => {
    const { container } = render(
      <ItemDetailCard item={toItem(capturedArmor as ApiItemDetail)} variant="hover" />,
    )
    expect(detailRowText(container)).toEqual(['Armor bonus16', 'Max Dex bonus1'])
    expect(container.querySelector('.resources-detail-description')).toBeNull()
    expect(screen.queryByRole('button', { name: 'More armor details' })).toBeNull()
  })

  it('shows no toggle when an item has no details to reveal', () => {
    const { container } = renderItemDetailCard(plainItem)
    expect(container.querySelector('.resources-item-details')).toBeNull()
    expect(screen.queryByRole('button', { name: 'More details' })).toBeNull()
  })

  it('gives weapon values and enchantment values the same hover row rhythm', () => {
    const { container, rerender } = render(<ItemDetailCard item={weaponItem()} variant="hover" />)
    expect(container.querySelector('.resources-item-details .detail-value-row')).toHaveClass(
      'hover-card-row',
    )
    rerender(<ItemDetailCard item={toItem(capturedNecklace as ApiItemDetail)} variant="hover" />)
    expect(
      container.querySelector('.resources-hover-enchantment-row .detail-value-row'),
    ).toHaveClass('hover-card-row')
  })
})

describe('ItemDetailCard drop locations', () => {
  it('shows a weapon’s primary rows with facts, enchantments, and drops for hover', () => {
    render(
      <ItemDetailCard
        item={{
          ...weaponItem({ critical_threat_range: 1, critical: '20/x2' }),
          quests: [quest()],
        }}
        variant="hover"
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
      Array.from(document.querySelectorAll('.resources-item-details .detail-value-row')).map(
        (row) => row.textContent,
      ),
    ).toEqual(['Damage1.6[2d6]+5', 'Crit range20', 'Crit multiplier×2'])
    expect(screen.queryByRole('button', { name: 'More details' })).toBeNull()
  })
  it('renders a wiki link icon next to each quest in Obtained from', () => {
    renderItemDetailCard({ ...plainItem, quests: [quest()] })
    const link = screen.getByRole('link', { name: "Open Delera's Tomb on DDO Wiki" })
    expect(link).toHaveAttribute('href', "https://ddowiki.com/page/Delera's_Tomb")
  })

  it('marks a raid drop location with a chip on the quest name, not in the meta line', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      quests: [quest({ patron: 'The Free Agents', isRaid: true })],
    })
    const chip = container.querySelector('.resources-quest-name .resources-chip[data-kind="raid"]')
    expect(chip).toHaveTextContent('Raid')
    expect(container.querySelector('.resources-quest-meta')).toHaveTextContent(
      'The Free Agents · Level 8',
    )
  })

  it('marks a rare drop location with a chip on the quest name after the raid chip', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      quests: [quest({ isRaid: true, isRareLoot: true })],
    })
    const kinds = Array.from(
      container.querySelectorAll('.resources-quest-name .resources-chip'),
    ).map((c) => c.getAttribute('data-kind'))
    expect(kinds).toEqual(['raid', 'rare'])
    expect(container.querySelector('.resources-quest-meta .resources-chip')).toBeNull()
  })

  it('shows the Rare chip only on the quests where the item is rare', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      quests: [
        quest({ id: 1, name: 'Tempest Spine', isRareLoot: true }),
        quest({ id: 2, name: 'The Pit' }),
      ],
    })
    const rows = container.querySelectorAll('.resources-quest-row')
    expect(rows[0].querySelector('.resources-chip[data-kind="rare"]')).toHaveTextContent('Rare')
    expect(rows[1].querySelector('.resources-chip')).toBeNull()
  })

  it('labels end rewards in the meta line', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      quests: [quest({ isEndReward: true })],
    })
    expect(container.querySelector('.resources-chip')).toBeNull()
    expect(container.querySelector('.resources-quest-meta')).toHaveTextContent(
      'Level 8 · End reward',
    )
  })

  it('names the chest after the quest name in sentence case', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      quests: [quest({ chests: ["althea's chest"] })],
    })
    expect(
      container.querySelector('.resources-quest-name .resources-quest-chest'),
    ).toHaveTextContent("Althea's chest")
  })

  it('renders one row for a quest that is both a chest drop and the end reward', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = renderItemDetailCard({
      ...plainItem,
      quests: [quest({ chests: ['end chest'], isEndReward: true, isRareLoot: true })],
    })
    const rows = container.querySelectorAll('.resources-quest-row')
    expect(rows).toHaveLength(1)
    expect(rows[0].querySelector('.resources-quest-chest')).toHaveTextContent('End chest')
    expect(rows[0].querySelector('.resources-quest-meta')).toHaveTextContent('Level 8 · End reward')
    expect(rows[0].querySelectorAll('.resources-chip[data-kind="rare"]')).toHaveLength(1)
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('lists a quest chain end reward after the quest rows with a Rare chip and wiki link', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      quests: [quest()],
      questChains: [{ id: 3, name: 'The Lost Seekers', isRareLoot: true, wikiUrl: null }],
    })
    const rows = container.querySelectorAll('.resources-quest-row')
    expect(rows).toHaveLength(2)
    expect(rows[1].querySelector('.resources-quest-title')).toHaveTextContent('The Lost Seekers')
    expect(rows[1].querySelector('.resources-chip[data-kind="rare"]')).toHaveTextContent('Rare')
    expect(rows[1].querySelector('.resources-quest-meta')).toHaveTextContent('Chain end reward')
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
    const rows = container.querySelectorAll('.resources-quest-row')
    expect(
      Array.from(rows).map((r) => r.querySelector('.resources-quest-meta')?.textContent),
    ).toEqual(['Saga reward · Epic', 'Saga reward · Legendary'])
    expect(rows[0].querySelector('.resources-chip')).toBeNull()
    expect(rows[1].querySelector('.resources-chip[data-kind="rare"]')).toHaveTextContent('Rare')
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
    expect(container.querySelector('.resources-quest-meta')).toHaveTextContent(/^Saga reward$/)
  })

  it('lists an adventure pack drop as Anywhere in the pack with the chest, Rare chip and wiki link', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      adventurePackDrops: [packDrop({ isRareLoot: true })],
    })
    expect(screen.getByText('Obtained from')).toBeInTheDocument()
    expect(container.querySelector('.resources-quest-title')).toHaveTextContent('The Isle of Dread')
    expect(container.querySelector('.resources-quest-meta')).toHaveTextContent(
      /^Anywhere in the pack · Any legendary chest$/,
    )
    expect(container.querySelector('.resources-chip[data-kind="rare"]')).toHaveTextContent('Rare')
    expect(
      screen.getByRole('link', { name: 'Open The Isle of Dread on DDO Wiki' }),
    ).toHaveAttribute('href', 'https://ddowiki.com/page/The_Isle_of_Dread')
  })

  it('lists an adventure pack drop with no chest as Anywhere in the pack alone', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      adventurePackDrops: [packDrop({ chest: null })],
    })
    expect(container.querySelector('.resources-quest-meta')).toHaveTextContent(
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
    expect(container.querySelector('.resources-quest-chest')).toBeNull()
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
  function rowMeta(container: HTMLElement): string[] {
    return Array.from(container.querySelectorAll('.resources-quest-row')).map(
      (r) => r.querySelector('.resources-quest-meta')?.textContent ?? '',
    )
  }

  it('lists a crafting system as Crafted at with a wiki link to its page', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      sourcesBeyondQuests: [itemSource()],
    })
    expect(screen.getByText('Obtained from')).toBeInTheDocument()
    expect(container.querySelector('.resources-quest-title')).toHaveTextContent('Thunder-Forged')
    expect(rowMeta(container)).toEqual(['Crafted at'])
    expect(screen.getByRole('link', { name: 'Open Thunder-Forged on DDO Wiki' })).toHaveAttribute(
      'href',
      'https://ddowiki.com/page/Thunder-Forged',
    )
  })

  it('lists a challenge pack as Challenge rewards with its Rare chip', () => {
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
    expect(rowMeta(container)).toEqual(['Challenge rewards'])
    expect(container.querySelector('.resources-chip[data-kind="rare"]')).toHaveTextContent('Rare')
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
    expect(rowMeta(container)).toEqual(['Sold by · The Harbor · 50 Tokens'])
  })

  it('lists a vendor with no location or cost as Sold by alone', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      sourcesBeyondQuests: [itemSource({ kind: 'vendor', key: 'vendor-1', name: 'Morten' })],
    })
    expect(rowMeta(container)).toEqual(['Sold by'])
  })

  it('lists an event as Event reward', () => {
    const { container } = renderItemDetailCard({
      ...plainItem,
      sourcesBeyondQuests: [
        itemSource({ kind: 'event', key: 'event-4', name: 'The Night Revels' }),
      ],
    })
    expect(rowMeta(container)).toEqual(['Event reward'])
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
    expect(container.querySelector('.resources-quest-title')).toHaveTextContent(
      'Starter gear at level 15',
    )
    expect(container.querySelector('.resources-quest-row .wiki-link-icon')).toBeNull()
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
      Array.from(container.querySelectorAll('.resources-quest-title')).map((t) => t.textContent),
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
  it('reveals the enhancement bonus signed and keeps the set name in the facts', async () => {
    renderItemDetailCard({ ...plainItem, enhancementBonus: 5, setName: 'Adherent of the Mists' })
    expect(screen.queryByText('Enhancement')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'More details' }))
    expect(screen.getByText('Enhancement')).toBeInTheDocument()
    expect(screen.getByText('+5')).toBeInTheDocument()
    expect(screen.getByText('Adherent of the Mists')).toBeInTheDocument()
  })

  it('lists clickies with their description', () => {
    renderItemDetailCard({
      ...plainItem,
      clickies: [{ name: 'Haste', description: 'Haste (3 charges)' }],
    })
    expect(screen.getByText('Clickies')).toBeInTheDocument()
    expect(screen.getByText('Haste (3 charges)')).toBeInTheDocument()
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
