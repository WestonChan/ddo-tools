import type { JSX } from 'react'
import { HoverTooltip } from '../../../components'
import { RESOURCE_CATEGORIES, LABEL_BY_RESOURCE_CATEGORY, ENABLED_RESOURCE_CATEGORIES, type ResourceCategory } from '../resourceCategories'

interface CategoryTabsProps {
  activeCategory: ResourceCategory
  onSelect: (category: ResourceCategory) => void
}

export function CategoryTabs({ activeCategory, onSelect }: CategoryTabsProps): JSX.Element {
  return (
    <div role="tablist" aria-label="Resource categories" className="resources-tabs">
      {RESOURCE_CATEGORIES.map((category) => {
        const isEnabled = ENABLED_RESOURCE_CATEGORIES.has(category)
        const label = LABEL_BY_RESOURCE_CATEGORY[category]
        const tabButton = (
          <button
            key={category}
            role="tab"
            type="button"
            aria-selected={activeCategory === category}
            aria-disabled={!isEnabled || undefined}
            disabled={!isEnabled}
            onClick={isEnabled ? () => onSelect(category) : undefined}
            className={`resources-tab hoverable${activeCategory === category ? ' active' : ''}${!isEnabled ? ' disabled' : ''}`}
          >
            {label}
          </button>
        )
        return isEnabled ? (
          tabButton
        ) : (
          <HoverTooltip key={category} text="Coming soon">
            {tabButton}
          </HoverTooltip>
        )
      })}
    </div>
  )
}
