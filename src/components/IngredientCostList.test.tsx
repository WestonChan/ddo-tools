import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { apiFixture } from '../test/apiFixture'
import { IngredientCostList } from './IngredientCostList'
import vendorResponse from '../test/fixtures/vendor-morten-edgewright.json'

const vendor = apiFixture(vendorResponse)

afterEach(cleanup)

it('renders every captured Dragon Keeper ingredient on a separate line in order', () => {
  const price = vendor.items.find((item) => item.name === 'The Dragon Keeper')!.price
  const { container } = render(<IngredientCostList costs={price} />)
  expect(Array.from(container.children, (line) => line.textContent)).toEqual([
    '1 × Ethereal Ingot',
    '1 × Arcane Ingot',
    '1 × Silver Ingot',
  ])
  expect(screen.getByText('1 × Silver Ingot')).toHaveClass('ingredient-cost-line')
})

it('renders no element for an empty cost list', () => {
  const { container } = render(<IngredientCostList costs={[]} />)
  expect(container).toBeEmptyDOMElement()
})
