import {
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { ChevronDown, X } from 'lucide-react'
import { AnchoredMenu, Combobox, type AnchoredMenuCloseReason } from '../../../components'
import {
  appliedFilterValues,
  clearedFilterChipValues,
  clearedFilterValues,
  commitNumericRange,
  filterChipHint,
  filterChipText,
  isFilterSet,
  type AnyFilterDefinition,
  type AppliedFilterValue,
  type FilterDefinition,
  type FilterValue,
  type NumericRange,
} from './filterModel'
import './FilterChipRow.css'

interface FilterChipRowProps<Values extends { [Key in keyof Values]: FilterValue }> {
  definitions: readonly FilterDefinition<Values>[]
  values: Values
  onChange: (values: Values) => void
  onClearAll: () => void
  extraControls?: Record<string, ReactNode>
  hasSearchTerm?: boolean
  focusFallbackRef?: RefObject<HTMLElement | null>
  onPickerOpen?: (key: keyof Values) => void
  loadingPickers?: ReadonlySet<string>
}

interface FilterChipProps {
  definition: AnyFilterDefinition
  value: FilterValue | undefined
  isOpen: boolean
  onToggle: () => void
  onClose: (reason?: AnchoredMenuCloseReason) => void
  onChange: (value: FilterValue) => void
  onClear: () => void
  extraControl?: ReactNode
  rangeCommitRef: RefObject<(() => void) | null>
  isLoading?: boolean
}

function RangePopover({
  anchorRef,
  definition,
  value,
  onChange,
  onClose,
  rangeCommitRef,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  definition: Extract<AnyFilterDefinition, { kind: 'range' }>
  value: NumericRange
  onChange: (value: NumericRange) => void
  onClose: (reason: AnchoredMenuCloseReason) => void
  rangeCommitRef: RefObject<(() => void) | null>
}): JSX.Element {
  const [minDraft, setMinDraft] = useState(value.min)
  const [maxDraft, setMaxDraft] = useState(value.max)
  const range = definition.range
  const { minimum, maximum } = range
  function commit(): void {
    const committedRange = commitNumericRange(minDraft, maxDraft, minimum, maximum)
    setMinDraft(committedRange.min)
    setMaxDraft(committedRange.max)
    onChange(committedRange)
  }
  useLayoutEffect(() => {
    rangeCommitRef.current = commit
    return () => {
      rangeCommitRef.current = null
    }
  })
  return (
    <AnchoredMenu
      id={definition.key + '-range-picker'}
      anchorRef={anchorRef}
      placement="below"
      widthPx={236}
      label={definition.label}
      onClose={onClose}
      className="filter-range-menu"
    >
      <div className="filter-range-fields">
        <label>
          <span>{range.minLabel}</span>
          <input
            type="number"
            min={range.minimum}
            max={range.maximum}
            value={minDraft}
            placeholder={range.minPlaceholder}
            onChange={(event) => setMinDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onClose('focus-leaving')
              }
            }}
          />
        </label>
        <span className="filter-range-separator">–</span>
        <label>
          <span>{range.maxLabel}</span>
          <input
            type="number"
            min={range.minimum}
            max={range.maximum}
            value={maxDraft}
            placeholder={range.maxPlaceholder}
            onChange={(event) => setMaxDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onClose('focus-leaving')
              }
            }}
          />
        </label>
      </div>
      <span className="filter-range-hint">{range.hint}</span>
    </AnchoredMenu>
  )
}

function FilterChip({
  definition,
  value,
  isOpen,
  onToggle,
  onClose,
  onChange,
  onClear,
  extraControl,
  rangeCommitRef,
  isLoading = false,
}: FilterChipProps): JSX.Element {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const isSelected = isFilterSet(definition, value)
  const isToggle = definition.kind === 'toggle'
  const chipText = filterChipText(definition, value)
  const badgeCount =
    definition.kind === 'multi' && Array.isArray(value)
      ? value.length
      : definition.kind === 'single' && isSelected
        ? 1
        : 0
  return (
    <div className="filter-chip-wrap">
      <button
        ref={anchorRef}
        type="button"
        className={
          'filter-chip' +
          (isSelected ? ' filter-chip--selected' : '') +
          (isOpen ? ' filter-chip--open' : '')
        }
        aria-haspopup={isToggle ? undefined : 'listbox'}
        aria-expanded={isToggle ? undefined : isOpen}
        aria-pressed={isToggle ? Boolean(value) : undefined}
        data-tip={filterChipHint(definition, value)}
        onClick={onToggle}
      >
        {isToggle ? (
          chipText
        ) : (
          <>
            <span className="filter-chip-content">
              <span className="filter-chip-sizer" aria-hidden>
                {definition.label}
              </span>
              <span className="filter-chip-text">{chipText}</span>
            </span>
            <span className="filter-chip-end" aria-hidden>
              {!isSelected && <ChevronDown size={12} />}
            </span>
          </>
        )}
      </button>
      {isSelected && !isToggle && (
        <button
          type="button"
          className="filter-chip-remove"
          aria-label={'Clear ' + definition.label}
          data-tip="Clear"
          onClick={onClear}
        >
          <X size={12} aria-hidden />
        </button>
      )}
      {badgeCount > 0 && (
        <span className="filter-chip-badge" aria-hidden>
          {badgeCount}
        </span>
      )}
      {isOpen && definition.kind === 'range' && (
        <RangePopover
          anchorRef={anchorRef}
          definition={definition}
          value={typeof value === 'object' && !Array.isArray(value) ? value : { min: '', max: '' }}
          onChange={onChange}
          onClose={onClose}
          rangeCommitRef={rangeCommitRef}
        />
      )}
      {isOpen && definition.kind === 'single' && (
        <Combobox
          label={definition.label}
          anchorRef={anchorRef}
          options={definition.options ?? []}
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
          searchPlaceholder={definition.searchPlaceholder ?? 'Search…'}
          onRequestClose={() => onClose()}
          extraControl={extraControl}
          isLoading={isLoading}
        />
      )}
      {isOpen && definition.kind === 'multi' && (
        <Combobox
          label={definition.label}
          anchorRef={anchorRef}
          options={definition.options ?? []}
          values={Array.isArray(value) ? value : []}
          onChange={onChange}
          searchPlaceholder={definition.searchPlaceholder ?? 'Search…'}
          onRequestClose={() => onClose()}
          extraControl={extraControl}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}

export function FilterChipRow<Values extends { [Key in keyof Values]: FilterValue }>({
  definitions,
  values,
  onChange,
  onClearAll,
  extraControls,
  hasSearchTerm = false,
  focusFallbackRef,
  onPickerOpen,
  loadingPickers,
}: FilterChipRowProps<Values>): JSX.Element {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [isAppliedOpen, setIsAppliedOpen] = useState(false)
  const rangeCommitRef = useRef<(() => void) | null>(null)
  const appliedValues = appliedFilterValues(definitions, values)
  const hasActiveFilters = appliedValues.length > 0 || hasSearchTerm
  const appliedGroups = definitions.reduce<
    {
      label: string
      entries: { definition: FilterDefinition<Values>; value: AppliedFilterValue }[]
    }[]
  >((grouped, definition) => {
    const entries = appliedValues.filter((entry) => entry.key === definition.key)
    if (!entries.length) return grouped
    const label = entries[0].groupLabel
    let group = grouped.find((candidate) => candidate.label === label)
    if (!group) {
      group = { label, entries: [] }
      grouped.push(group)
    }
    group.entries.push(...entries.map((value) => ({ definition, value })))
    return grouped
  }, [])
  const groups = definitions.reduce<FilterDefinition<Values>[][]>((grouped, definition) => {
    const lastGroup = grouped[grouped.length - 1]
    if (lastGroup && lastGroup[0].group === definition.group) lastGroup.push(definition)
    else grouped.push([definition])
    return grouped
  }, [])

  function clearAll(): void {
    setOpenKey(null)
    setIsAppliedOpen(false)
    onClearAll()
    queueMicrotask(() => focusFallbackRef?.current?.focus())
  }

  function commitOpenRange(): void {
    if (definitions.find((definition) => definition.key === openKey)?.kind === 'range') {
      rangeCommitRef.current?.()
    }
  }

  function removeAppliedValue(
    event: MouseEvent<HTMLButtonElement>,
    definition: FilterDefinition<Values>,
    value: string | boolean | null,
  ): void {
    const buttons = Array.from(
      event.currentTarget
        .closest('.filter-applied-values')
        ?.querySelectorAll<HTMLButtonElement>('.filter-applied-value') ?? [],
    )
    const index = buttons.indexOf(event.currentTarget)
    const nextButton = buttons[index + 1] ?? buttons[index - 1]
    onChange(clearedFilterValues(values, definition, value))
    queueMicrotask(() => {
      if (nextButton?.isConnected) nextButton.focus()
      else focusFallbackRef?.current?.focus()
    })
  }

  return (
    <>
      <div className="filter-chip-row">
        {groups.map((group, index) => (
          <div className="filter-chip-group" key={group[0].group ?? index}>
            {group.map((definition) => (
              <FilterChip
                key={definition.key}
                definition={definition}
                value={values[definition.key]}
                isOpen={openKey === definition.key}
                onToggle={() => {
                  commitOpenRange()
                  if (definition.kind === 'toggle') {
                    onChange({ ...values, [definition.key]: !values[definition.key] })
                    setOpenKey(null)
                  } else {
                    if (openKey !== definition.key) onPickerOpen?.(definition.key)
                    setOpenKey(openKey === definition.key ? null : definition.key)
                  }
                }}
                onClose={(reason) => {
                  if (definition.kind === 'range' && reason !== 'escape') {
                    rangeCommitRef.current?.()
                  }
                  setOpenKey(null)
                }}
                onChange={(value) => onChange({ ...values, [definition.key]: value })}
                onClear={() => {
                  onChange(clearedFilterChipValues(values, definition))
                  setOpenKey(null)
                }}
                extraControl={extraControls?.[definition.key]}
                rangeCommitRef={rangeCommitRef}
                isLoading={loadingPickers?.has(String(definition.key))}
              />
            ))}
          </div>
        ))}
        {hasActiveFilters && (
          <button type="button" className="filter-chip-clear-all" onClick={clearAll}>
            Clear filters
          </button>
        )}
      </div>
      {appliedValues.length > 0 && (
        <div className="filter-applied-toggle-row">
          <button
            type="button"
            className="filter-applied-toggle"
            onClick={() => setIsAppliedOpen(!isAppliedOpen)}
          >
            {isAppliedOpen ? 'Hide applied' : 'Show applied · ' + appliedValues.length}
            <ChevronDown
              size={12}
              className={isAppliedOpen ? 'filter-applied-chevron--open' : ''}
              aria-hidden
            />
          </button>
        </div>
      )}
      {isAppliedOpen && appliedValues.length > 0 && (
        <div className="filter-applied-values" role="region" aria-label="Applied filters">
          {appliedGroups.map((group) => (
            <div className="filter-applied-group" key={group.label}>
              <span className="filter-applied-label">{group.label}</span>
              {group.entries.map(({ definition, value: entry }) => (
                <button
                  type="button"
                  key={definition.key + String(entry.value)}
                  className="filter-applied-value"
                  aria-label={'Remove ' + definition.label + ': ' + entry.text}
                  onClick={(event) => removeAppliedValue(event, definition, entry.value)}
                >
                  {entry.text}
                  <span className="filter-applied-value-remove" data-tip="Remove" aria-hidden>
                    <X size={11} />
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
