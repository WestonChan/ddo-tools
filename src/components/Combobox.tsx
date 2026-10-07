import { useEffect, useId, useRef, useState, type JSX, type ReactNode, type RefObject } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { AnchoredMenu } from './AnchoredMenu'
import { positionedCardBeside, useHoverCardControl } from './HoverCard'
import './Combobox.css'

export interface FilterOption {
  value: string
  key?: string
  label: string
  caption?: string
  children?: FilterOption[]
  isNested?: boolean
  parentValue?: string
  detailPath?: string
}

interface ComboboxCommonProps {
  label: string
  anchorRef: RefObject<HTMLElement | null>
  options: FilterOption[]
  searchPlaceholder: string
  onRequestClose: () => void
  renderOption?: (option: FilterOption) => ReactNode
  searchControl?: ReactNode
  extraControl?: ReactNode
  isLoading?: boolean
  errorContent?: ReactNode
  onSearchChange?: (searchQuery: string) => void
  shouldFilterLocally?: boolean
  shouldPreserveOptionOrder?: boolean
  optionCount?: number
  renderHoverCard?: (option: FilterOption) => ReactNode
  hoverKind?: string
}

type ComboboxProps = ComboboxCommonProps &
  (
    | { value: string; onChange: (value: string) => void; values?: never }
    | { values: string[]; onChange: (values: string[]) => void; value?: never }
  )

export function Combobox(props: ComboboxProps): JSX.Element {
  const {
    label,
    anchorRef,
    options,
    searchPlaceholder,
    onRequestClose,
    renderOption,
    searchControl,
    extraControl,
    isLoading = false,
    errorContent,
    onSearchChange,
    shouldFilterLocally = true,
    shouldPreserveOptionOrder = false,
    optionCount,
    renderHoverCard,
    hoverKind,
  } = props
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedOptions, setExpandedOptions] = useState<ReadonlyMap<string, boolean>>(
    () => new Map(),
  )
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [selectedAtOpen] = useState<ReadonlySet<string>>(
    () => new Set(props.values ?? (props.value ? [props.value] : [])),
  )
  const listId = useId()
  const searchRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<Array<HTMLDivElement | null>>([])
  const hadErrorContent = useRef(Boolean(errorContent))
  useEffect(() => {
    const hasErrorContent = Boolean(errorContent)
    const isRecovering = hadErrorContent.current && !hasErrorContent
    hadErrorContent.current = hasErrorContent
    if (!isRecovering) return
    const focusedElement = document.activeElement
    if (!focusedElement || focusedElement === document.body) searchRef.current?.focus()
  }, [errorContent])
  const hoveredOption = useRef<FilterOption | null>(null)
  const hover = useHoverCardControl({
    kind: hoverKind ?? 'option',
    delayMs: 120,
    placement: 'beside',
    render: () => hoveredOption.current && renderHoverCard?.(hoveredOption.current),
  })
  const isMultiple = props.values !== undefined
  const selectedValues: string[] = isMultiple ? props.values : props.value ? [props.value] : []
  const pinnedParentValues = new Set(
    options
      .filter(
        (option) =>
          selectedAtOpen.has(option.value) ||
          option.children?.some((child) => selectedAtOpen.has(child.value)),
      )
      .map((option) => option.value),
  )
  function isOptionExpanded(option: FilterOption): boolean {
    return (
      expandedOptions.get(option.value) ??
      Boolean(option.children?.some((child) => selectedValues.includes(child.value)))
    )
  }
  const matchingOptions = (() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase()
    const selectedOptions: FilterOption[] = []
    const unselectedOptions: FilterOption[] = []
    for (const option of options) {
      if (
        shouldFilterLocally &&
        !option.label.toLocaleLowerCase().includes(normalizedQuery) &&
        !option.children?.some((child) => child.label.toLocaleLowerCase().includes(normalizedQuery))
      )
        continue
      if (pinnedParentValues.has(option.value)) selectedOptions.push(option)
      else unselectedOptions.push(option)
    }
    const orderedOptions =
      shouldPreserveOptionOrder && searchQuery
        ? options.filter(
            (option) => selectedOptions.includes(option) || unselectedOptions.includes(option),
          )
        : [...selectedOptions, ...unselectedOptions]
    return orderedOptions.flatMap((option) => {
      if (!option.children?.length || !isOptionExpanded(option)) return [option]
      const children = option.children.filter(
        (child) =>
          !searchQuery ||
          child.label.toLocaleLowerCase().includes(normalizedQuery) ||
          option.label.toLocaleLowerCase().includes(normalizedQuery),
      )
      return [
        option,
        ...children.map((child) => ({ ...child, isNested: true, parentValue: option.value })),
      ]
    })
  })()
  const availableOptions = errorContent ? [] : matchingOptions
  const activeIndex = Math.min(highlightedIndex, Math.max(0, availableOptions.length - 1))
  const activeOption = availableOptions[activeIndex]
  const firstUnpinnedIndex = availableOptions.findIndex(
    (option) => !pinnedParentValues.has(option.parentValue ?? option.value),
  )
  const dividerIndex =
    shouldPreserveOptionOrder && searchQuery
      ? -1
      : firstUnpinnedIndex > 0
        ? firstUnpinnedIndex - 1
        : -1

  function highlightedLabel(optionLabel: string): ReactNode {
    const matchIndex = optionLabel
      .toLocaleLowerCase()
      .indexOf(searchQuery.trim().toLocaleLowerCase())
    if (!searchQuery.trim() || matchIndex < 0) return optionLabel
    return (
      <>
        {optionLabel.slice(0, matchIndex)}
        <mark className="combobox-match">
          {optionLabel.slice(matchIndex, matchIndex + searchQuery.trim().length)}
        </mark>
        {optionLabel.slice(matchIndex + searchQuery.trim().length)}
      </>
    )
  }

  function chooseOption(option: FilterOption): void {
    if (props.values !== undefined) {
      if (props.values.includes(option.value)) {
        props.onChange(props.values.filter((selected) => selected !== option.value))
      } else {
        const replacedValues = props.values.filter(
          (selected) =>
            selected !== option.parentValue &&
            !option.children?.some((child) => child.value === selected),
        )
        props.onChange([...replacedValues, option.value])
      }
    } else {
      props.onChange(option.value)
      onRequestClose()
    }
  }

  function moveHighlight(delta: number): void {
    if (!availableOptions.length) return
    const nextIndex = (activeIndex + delta + availableOptions.length) % availableOptions.length
    setHighlightedIndex(nextIndex)
    optionRefs.current[nextIndex]?.scrollIntoView?.({ block: 'nearest' })
  }

  function setOptionExpanded(option: FilterOption, isExpanded: boolean): void {
    setExpandedOptions((previous) => new Map(previous).set(option.value, isExpanded))
  }

  return (
    <AnchoredMenu
      id={`${listId}-menu`}
      anchorRef={anchorRef}
      placement="below"
      widthPx={268}
      label={`${label} picker`}
      className="combobox-menu"
      onClose={onRequestClose}
      onEscape={hover.dismiss}
    >
      <div className="combobox-search-wrap">
        <label className="search-well combobox-search">
          <Search size={13} aria-hidden />
          <input
            ref={searchRef}
            role="combobox"
            aria-label={label}
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={availableOptions.length ? `${listId}-${activeIndex}` : undefined}
            placeholder={searchPlaceholder}
            className="search-well-input"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              onSearchChange?.(event.target.value)
              setHighlightedIndex(0)
              hover.hide()
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Escape') hover.hide()
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault()
                moveHighlight(event.key === 'ArrowDown' ? 1 : -1)
              }
              if (event.key === 'Enter') {
                event.preventDefault()
                const option = availableOptions[activeIndex]
                if (option) chooseOption(option)
              }
              if (
                (event.key === 'ArrowRight' || event.key === 'ArrowLeft') &&
                activeOption?.children?.length
              ) {
                event.preventDefault()
                setOptionExpanded(activeOption, event.key === 'ArrowRight')
              }
            }}
          />
        </label>
        {searchControl}
      </div>
      <div className="combobox-options">
        <div
          id={listId}
          role="listbox"
          aria-label={label}
          aria-multiselectable={isMultiple || undefined}
        >
          {availableOptions.length ? (
            availableOptions.map((option, index) => {
              const isSelected = selectedValues.includes(option.value)
              return (
                <div
                  key={option.key ?? option.value}
                  className={`combobox-option-wrap${index === dividerIndex ? ' combobox-option-wrap--divider' : ''}`}
                >
                  <div
                    id={`${listId}-${index}`}
                    ref={(element) => {
                      optionRefs.current[index] = element
                    }}
                    role="option"
                    aria-selected={isSelected}
                    className={`combobox-option${index === activeIndex ? ' combobox-option--active' : ''}${option.isNested ? ' combobox-option--nested' : ''}`}
                    onMouseEnter={(event) => {
                      setHighlightedIndex(index)
                      if (!renderHoverCard || !option.detailPath) return
                      const menu = event.currentTarget.closest<HTMLElement>('.combobox-menu')
                      if (
                        !menu ||
                        !positionedCardBeside(
                          menu.getBoundingClientRect(),
                          300,
                          0,
                          window.innerWidth,
                          window.innerHeight,
                        )
                      ) {
                        hover.hide()
                        return
                      }
                      hoveredOption.current = option
                      hover.show(event.currentTarget, {
                        placementAnchor: menu,
                        openedBy: 'pointer',
                      })
                    }}
                    onMouseLeave={() => hover.hide()}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => chooseOption(option)}
                  >
                    <span
                      className={`combobox-check${isSelected ? ' combobox-check--selected' : ''}`}
                    >
                      {isSelected && <Check size={11} aria-hidden />}
                    </span>
                    <span className="combobox-option-label">
                      {renderOption ? renderOption(option) : highlightedLabel(option.label)}
                    </span>
                    {option.caption && (
                      <span
                        className={`combobox-option-caption${option.children?.length ? ' combobox-option-caption--expandable' : ''}`}
                        onClick={
                          option.children?.length
                            ? (event) => {
                                event.stopPropagation()
                                setOptionExpanded(option, !isOptionExpanded(option))
                              }
                            : undefined
                        }
                      >
                        {option.caption}
                        {option.children?.length ? (
                          <ChevronDown
                            size={11}
                            className={
                              isOptionExpanded(option) ? 'combobox-option-chevron--open' : ''
                            }
                            aria-hidden
                          />
                        ) : null}
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          ) : errorContent ? null : isLoading ? (
            <div className="combobox-empty" role="status">
              Loading options…
            </div>
          ) : (
            <div className="combobox-empty">No matches.</div>
          )}
        </div>
        {errorContent}
      </div>
      <div className="combobox-footer">
        <span>
          {availableOptions.filter((option) => !option.isNested).length.toLocaleString()} of{' '}
          {(optionCount ?? options.length).toLocaleString()} · {selectedValues.length} selected
        </span>
        {selectedValues.length > 0 && (
          <button
            type="button"
            onClick={() => {
              searchRef.current?.focus()
              if (props.values !== undefined) props.onChange([])
              else props.onChange('')
            }}
          >
            Clear
          </button>
        )}
      </div>
      {extraControl && <div className="combobox-extra">{extraControl}</div>}
    </AnchoredMenu>
  )
}
