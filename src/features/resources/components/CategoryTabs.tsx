import { useRef, type JSX, type KeyboardEvent } from 'react'
import { HintAnchor } from '../../../components'
import { useRovingGroup } from '../../../hooks'
import {
  RESOURCE_CATEGORIES,
  LABEL_BY_RESOURCE_CATEGORY,
  ENABLED_RESOURCE_CATEGORIES,
  type ResourceCategory,
} from '../resourceCategories'

interface CategoryTabsProps {
  activeCategory: ResourceCategory
  onSelect: (category: ResourceCategory) => void
  panelId: string
}

export function CategoryTabs({
  activeCategory,
  onSelect,
  panelId,
}: CategoryTabsProps): JSX.Element {
  const tabButtonsByCategory = useRef(new Map<ResourceCategory, HTMLButtonElement>())
  const tabGroup = useRovingGroup({
    keys: RESOURCE_CATEGORIES.filter(
      (category) => ENABLED_RESOURCE_CATEGORIES.has(category) || category === activeCategory,
    ),
    preferredKey: activeCategory,
    direction: 'horizontal',
    isWrapping: true,
    focusItem: (category) => {
      tabButtonsByCategory.current.get(category)?.focus()
    },
  })

  function navigateTab(event: KeyboardEvent<HTMLButtonElement>, category: ResourceCategory): void {
    if (
      event.nativeEvent.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    )
      return
    if (tabGroup.moveFocus(category, event.key)) event.preventDefault()
  }

  return (
    <div role="tablist" aria-label="Resource categories" className="underline-tabs resources-tabs">
      {RESOURCE_CATEGORIES.map((category) => {
        const isEnabled = ENABLED_RESOURCE_CATEGORIES.has(category)
        const isFocusable = isEnabled || activeCategory === category
        const label = LABEL_BY_RESOURCE_CATEGORY[category]
        const tabButton = (
          <button
            key={category}
            ref={(button) => {
              if (button) tabButtonsByCategory.current.set(category, button)
              else tabButtonsByCategory.current.delete(category)
            }}
            id={`${panelId}-${category}-tab`}
            role="tab"
            type="button"
            tabIndex={tabGroup.tabStopKey === category ? 0 : -1}
            aria-selected={activeCategory === category}
            aria-controls={panelId}
            aria-disabled={!isEnabled || undefined}
            disabled={!isFocusable}
            onClick={isEnabled ? () => onSelect(category) : undefined}
            onFocus={
              isFocusable
                ? () => {
                    tabGroup.rememberFocus(category)
                    if (category !== activeCategory) onSelect(category)
                  }
                : undefined
            }
            onKeyDown={isFocusable ? (event) => navigateTab(event, category) : undefined}
            className={`underline-tab${activeCategory === category ? ' underline-tab--active' : ''}${isEnabled ? '' : ' resources-tab--disabled'}`}
          >
            {label}
          </button>
        )
        return isEnabled ? (
          tabButton
        ) : (
          <HintAnchor key={category} text="Coming soon">
            {tabButton}
          </HintAnchor>
        )
      })}
    </div>
  )
}
