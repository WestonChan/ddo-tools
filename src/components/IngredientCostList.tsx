import type { ReactNode } from 'react'
import { ingredientCostLabel, type IngredientCost } from '../lib/ingredientCost'
import './IngredientCostList.css'

export function IngredientCostList({ costs }: { costs: readonly IngredientCost[] }): ReactNode {
  return costs.map((cost, index) => (
    <span key={`${cost.ingredient}-${index}`} className="ingredient-cost-line">
      {ingredientCostLabel(cost)}
    </span>
  ))
}
