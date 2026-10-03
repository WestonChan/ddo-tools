import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { DetailHeader } from './DetailHeader'

afterEach(() => {
  cleanup()
})

describe('DetailHeader wiki link', () => {
  it('renders a wiki icon next to the title using the authoritative wikiUrl', () => {
    render(
      <DetailHeader
        name="Voice of the Master"
        wikiUrl="https://ddowiki.com/page/Item:Voice_of_the_Master"
        wikiPageName="Voice of the Master"
      />,
    )
    const link = screen.getByRole('link', { name: 'Open Voice of the Master on DDO Wiki' })
    expect(link).toHaveAttribute('href', 'https://ddowiki.com/page/Item:Voice_of_the_Master')
  })

  it('derives the wiki URL from wikiPageName when no wikiUrl is stored', () => {
    render(<DetailHeader name="Favor" wikiPageName="Favor" />)
    const link = screen.getByRole('link', { name: 'Open Favor on DDO Wiki' })
    expect(link).toHaveAttribute('href', 'https://ddowiki.com/page/Favor')
  })

  it('renders no wiki link when neither wikiUrl nor wikiPageName is provided', () => {
    render(<DetailHeader name="Mystery Item" />)
    expect(screen.queryByRole('link', { name: /DDO Wiki/ })).toBeNull()
  })
})

describe('DetailHeader linked wiki window chip', () => {
  it('keeps the Link wiki chip disabled until Phase 4g', () => {
    render(<DetailHeader name="Voice of the Master" wikiPageName="Voice of the Master" />)
    const chip = screen.getByRole('button', { name: 'Link wiki' })
    expect(chip).toBeDisabled()
    expect(chip.parentElement).toHaveAttribute(
      'data-tip',
      'Linked wiki window arrives with Phase 4g',
    )
    expect(
      screen.getByRole('link', { name: 'Open Voice of the Master on DDO Wiki' }).parentElement,
    ).toHaveAttribute('data-tip', 'Open in DDO Wiki (compare window)')
    expect(screen.getByRole('link', { name: /Report a mismatch/ }).parentElement).toHaveAttribute(
      'data-tip',
      'Report a mismatch',
    )
  })
})
