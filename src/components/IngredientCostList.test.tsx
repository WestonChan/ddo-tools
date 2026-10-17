import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { IngredientCostList } from './IngredientCostList'
import vendor from '../test/fixtures/data-build-vendor-morten-edgewright.json'

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
