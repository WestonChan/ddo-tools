import { expect, it } from 'vitest'
import { ingredientCostLabel } from './ingredientCost'

it.each([
  [1, 'Epic Ethereal Ingot', '1 × Epic Ethereal Ingot'],
  [40, 'Vistani Talisman', '40 × Vistani Talisman'],
  [20, 'Shred of Tapestry', '20 × Shred of Tapestry'],
])('formats %i of %s without changing the ingredient name', (quantity, ingredient, label) => {
  expect(ingredientCostLabel({ ingredient, quantity })).toBe(label)
})
