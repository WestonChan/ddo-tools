import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { EnchantmentList } from './EnchantmentList'
import type { ItemBonus, ItemEffect } from '../../queries/items'

function bonus(overrides: Partial<ItemBonus> = {}): ItemBonus {
  return {
    bonus_id: 1,
    name: 'Charisma +5',
    description: null,
    bonus_type: 'Enhancement',
    stat_name: 'Charisma',
    value: 5,
    sort_order: 0,
    ...overrides,
  }
}

function effect(overrides: Partial<ItemEffect> = {}): ItemEffect {
  return {
    effect_id: 1,
    name: 'Bane',
    modifier: 'Evil Outsider',
    value: 4,
    sort_order: 0,
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
})

describe('EnchantmentList', () => {
  it('renders nothing when there are no bonuses or effects', () => {
    const { container } = render(<EnchantmentList bonuses={[]} effects={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('prefixes positive stat bonus values with +', () => {
    render(<EnchantmentList bonuses={[bonus({ value: 5 })]} effects={[]} />)
    expect(screen.getByText('+5')).toBeInTheDocument()
  })

  // Cursed gear in the real DB carries negative bonuses (Constitution -2,
  // Intelligence -3, saves -2). An unconditional "+" prefix renders these as
  // "+-2". 20 such bonuses span 54 items, so this is user-visible, not
  // theoretical.
  it('renders negative stat bonus values with a single minus sign', () => {
    render(<EnchantmentList bonuses={[bonus({ name: 'Constitution -2', value: -2 })]} effects={[]} />)
    expect(screen.getByText('-2')).toBeInTheDocument()
    expect(screen.queryByText('+-2')).toBeNull()
  })

  it('renders a zero-valued stat bonus without a sign', () => {
    render(<EnchantmentList bonuses={[bonus({ value: 0 })]} effects={[]} />)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.queryByText('+0')).toBeNull()
  })

  it('folds a positive effect value into the effect name with +', () => {
    render(<EnchantmentList bonuses={[]} effects={[effect({ value: 4 })]} />)
    expect(screen.getByText('Bane +4')).toBeInTheDocument()
  })

  // Latent today (no negative effect values in the shipped DB) but the same
  // formatting bug — guard it so it can't regress if the ETL starts emitting
  // negative effect magnitudes.
  it('renders a negative effect value with a single minus sign', () => {
    render(<EnchantmentList bonuses={[]} effects={[effect({ name: 'Curse', value: -3 })]} />)
    expect(screen.getByText('Curse -3')).toBeInTheDocument()
    expect(screen.queryByText('Curse +-3')).toBeNull()
  })

  it('renders bonuses before effects, each with its type chip', () => {
    render(
      <EnchantmentList
        bonuses={[bonus({ bonus_type: 'Insight' })]}
        effects={[effect({ modifier: 'Evil Outsider' })]}
      />,
    )
    expect(screen.getByText('Insight')).toBeInTheDocument()
    expect(screen.getByText('Evil Outsider')).toBeInTheDocument()
  })

  // The ETL now expands descriptions to prose, so the component renders what
  // it is given rather than stripping template syntax at render time. The
  // guarantee that no `{{` reaches here is enforced upstream: validation
  // assertion A3 in the pipeline, and etlRegression.test.ts against the
  // shipped database.
  it('renders an expanded description as its own sub-line', () => {
    render(
      <EnchantmentList
        bonuses={[bonus({
          name: 'Fire Resistance +30',
          stat_name: 'Fire Resistance',
          description: '+30 Enhancement bonus to Fire Resistance',
        })]}
        effects={[]}
      />,
    )
    expect(
      screen.getByText('+30 Enhancement bonus to Fire Resistance'),
    ).toBeInTheDocument()
  })

  it('omits the sub-line when there is no description', () => {
    const { container } = render(
      <EnchantmentList bonuses={[bonus({ description: null })]} effects={[]} />,
    )
    expect(container.querySelector('.resources-bonus-description')).toBeNull()
  })

  it('omits the sub-line when the description just repeats the name', () => {
    const { container } = render(
      <EnchantmentList
        bonuses={[bonus({ name: 'Charisma +5', description: 'Charisma +5' })]}
        effects={[]}
      />,
    )
    expect(container.querySelector('.resources-bonus-description')).toBeNull()
  })
})
