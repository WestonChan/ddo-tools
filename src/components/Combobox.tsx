import { useId, useMemo, useRef, useState, type JSX, type ReactNode, type RefObject } from 'react'
import { Check, Search } from 'lucide-react'
import { AnchoredMenu } from './AnchoredMenu'
import './Combobox.css'

export interface FilterOption {
  value: string
  label: string
  caption?: string
}

interface ComboboxCommonProps {
  label: string
  anchorRef: RefObject<HTMLElement | null>
  options: FilterOption[]
  searchPlaceholder: string
  onRequestClose: () => void
  renderOption?: (option: FilterOption) => ReactNode
  extraControl?: ReactNode
  isLoading?: boolean
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
    extraControl,
    isLoading = false,
  } = props
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const listId = useId()
  const optionRefs = useRef<Array<HTMLDivElement | null>>([])
  const matchingOptions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase()
    return options.filter((option) => option.label.toLocaleLowerCase().includes(normalizedQuery))
  }, [options, searchQuery])
  const isMultiple = props.values !== undefined
  const selectedValues: string[] = isMultiple ? props.values : props.value ? [props.value] : []
  const activeIndex = Math.min(highlightedIndex, Math.max(0, matchingOptions.length - 1))
  const footerText = searchQuery.trim()
    ? `${matchingOptions.length} of ${options.length}${selectedValues.length ? ` · ${selectedValues.length} selected` : ''}`
    : isMultiple && selectedValues.length
      ? `${selectedValues.length} selected · any match`
      : `${options.length} options`

  function chooseOption(option: FilterOption): void {
    if (props.values !== undefined) {
      props.onChange(
        props.values.includes(option.value)
          ? props.values.filter((selected) => selected !== option.value)
          : [...props.values, option.value],
      )
    } else {
      props.onChange(option.value)
      onRequestClose()
    }
  }

  function moveHighlight(delta: number): void {
    if (!matchingOptions.length) return
    const nextIndex = (activeIndex + delta + matchingOptions.length) % matchingOptions.length
    setHighlightedIndex(nextIndex)
    optionRefs.current[nextIndex]?.scrollIntoView?.({ block: 'nearest' })
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
    >
      <div className="combobox-search-wrap">
        <label className="search-well combobox-search">
          <Search size={13} aria-hidden />
          <input
            role="combobox"
            aria-label={label}
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={matchingOptions.length ? `${listId}-${activeIndex}` : undefined}
            placeholder={searchPlaceholder}
            className="search-well-input"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setHighlightedIndex(0)
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault()
                moveHighlight(event.key === 'ArrowDown' ? 1 : -1)
              }
              if (event.key === 'Enter') {
                event.preventDefault()
                const option = matchingOptions[activeIndex]
                if (option) chooseOption(option)
              }
            }}
          />
        </label>
      </div>
      <div
        id={listId}
        role="listbox"
        aria-label={label}
        aria-multiselectable={isMultiple || undefined}
        className="combobox-options"
      >
        {matchingOptions.length ? (
          matchingOptions.map((option, index) => {
            const isSelected = selectedValues.includes(option.value)
            return (
              <div
                key={option.value}
                id={`${listId}-${index}`}
                ref={(element) => {
                  optionRefs.current[index] = element
                }}
                role="option"
                aria-selected={isSelected}
                className={`combobox-option${index === activeIndex ? ' combobox-option--active' : ''}`}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseOption(option)}
              >
                <span className={`combobox-check${isSelected ? ' combobox-check--selected' : ''}`}>
                  {isSelected && <Check size={11} aria-hidden />}
                </span>
                <span className="combobox-option-label">
                  {renderOption ? renderOption(option) : option.label}
                </span>
                {option.caption && (
                  <span className="combobox-option-caption">{option.caption}</span>
                )}
              </div>
            )
          })
        ) : isLoading ? (
          <div className="combobox-empty" role="status">
            Loading options…
          </div>
        ) : (
          <div className="combobox-empty">No matches.</div>
        )}
      </div>
      {extraControl && <div className="combobox-extra">{extraControl}</div>}
      <div className="combobox-footer">
        <span className="num">{footerText}</span>
        <button
          type="button"
          onClick={() => (isMultiple ? props.onChange([]) : props.onChange(''))}
          aria-label={`Clear ${label}`}
        >
          Clear
        </button>
      </div>
    </AnchoredMenu>
  )
}
