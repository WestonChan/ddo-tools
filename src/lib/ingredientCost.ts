export interface IngredientCost {
  ingredient: string
  quantity: number
}

export function ingredientCostLabel(cost: IngredientCost): string {
  return `${cost.quantity} × ${cost.ingredient}`
}
