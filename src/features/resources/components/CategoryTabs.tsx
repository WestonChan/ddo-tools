import type { JSX } from 'react'
import { TooltipWrapper } from '../../../components'
import { CATEGORIES, CATEGORY_LABELS, ENABLED_CATEGORIES, type Category } from '../types'

interface CategoryTabsProps {
  active: Category
  onSelect: (category: Category) => void
}

export function CategoryTabs({ active, onSelect }: CategoryTabsProps): JSX.Element {
  return (
    <div role="tablist" aria-label="Resource categories" className="resources-tabs">
      {CATEGORIES.map((category) => {
        const enabled = ENABLED_CATEGORIES.has(category)
        const label = CATEGORY_LABELS[category]
        const button = (
          <button
            key={category}
            role="tab"
            type="button"
            aria-selected={active === category}
            aria-disabled={!enabled || undefined}
            disabled={!enabled}
            onClick={enabled ? () => onSelect(category) : undefined}
            className={`resources-tab hoverable${active === category ? ' active' : ''}${!enabled ? ' disabled' : ''}`}
          >
            {label}
          </button>
        )
        return enabled ? (
          button
        ) : (
          <TooltipWrapper key={category} text="Coming soon">
            {button}
          </TooltipWrapper>
        )
      })}
    </div>
  )
}
