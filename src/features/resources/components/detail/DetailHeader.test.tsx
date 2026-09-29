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
        attributes={[]}
        wikiUrl="https://ddowiki.com/page/Item:Voice_of_the_Master"
        wikiPageName="Voice of the Master"
      />,
    )
    const link = screen.getByRole('link', { name: 'Open Voice of the Master on DDO Wiki' })
    expect(link).toHaveAttribute('href', 'https://ddowiki.com/page/Item:Voice_of_the_Master')
  })

  it('derives the wiki URL from wikiPageName when no wikiUrl is stored', () => {
    render(<DetailHeader name="Favor" attributes={[]} wikiPageName="Favor" />)
    const link = screen.getByRole('link', { name: 'Open Favor on DDO Wiki' })
    expect(link).toHaveAttribute('href', 'https://ddowiki.com/page/Favor')
  })

  it('renders no wiki link when neither wikiUrl nor wikiPageName is provided', () => {
    render(<DetailHeader name="Mystery Item" attributes={[]} />)
    expect(screen.queryByRole('link')).toBeNull()
  })
})
