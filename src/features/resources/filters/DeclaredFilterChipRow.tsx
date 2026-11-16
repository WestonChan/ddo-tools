import { useMemo, useState, type JSX } from 'react'
import { hashKey, useQueries, type UseQueryOptions } from '@tanstack/react-query'
import { ApiErrorNotice } from '../../../components'
import { useDebouncedValue } from '../../../hooks'
import { FilterChipRow, type FilterChipRowProps } from './FilterChipRow'
import type { FilterDefinition, FilterValue } from './filterModel'
import type { DeclaredFilter } from './filterOptionSources'

type DeclaredFilterChipRowProps<Values extends { [Key in keyof Values]: FilterValue }> = Omit<
  FilterChipRowProps<Values>,
  'definitions' | 'onPickerOpen' | 'onPickerSearch' | 'loadingPickers' | 'pickerErrors'
> & { declarations: readonly DeclaredFilter<Values>[] }

export function DeclaredFilterChipRow<Values extends { [Key in keyof Values]: FilterValue }>({
  declarations,
  values,
  ...props
}: DeclaredFilterChipRowProps<Values>): JSX.Element {
  const [openedKeys, setOpenedKeys] = useState<ReadonlySet<string>>(() => new Set())
  const [searchQueryByKey, setSearchQueryByKey] = useState<Record<string, string>>({})
  const debouncedSearchQueryByKey = useDebouncedValue(searchQueryByKey, 150)
  const queryPlan = useMemo(() => {
    const requestsByHash = new Map<string, UseQueryOptions>()
    function registerQuery(options: UseQueryOptions, isEnabled: boolean): string {
      const hash = hashKey(options.queryKey)
      const previous = requestsByHash.get(hash)
      requestsByHash.set(hash, { ...options, enabled: isEnabled || previous?.enabled === true })
      return hash
    }
    const queriesByKey = new Map<string, { unsearchedHash: string; activeHash: string }>()
    for (const declaration of declarations) {
      if (!('optionSource' in declaration)) continue
      const source = declaration.optionSource
      const isOpened = openedKeys.has(declaration.key)
      const unsearchedHash = registerQuery(source.queryOptions(''), isOpened)
      const search =
        source.isServerSearched && searchQueryByKey[declaration.key]?.trim()
          ? (debouncedSearchQueryByKey[declaration.key]?.trim() ?? '')
          : ''
      const activeHash = search
        ? registerQuery(source.queryOptions(search), isOpened)
        : unsearchedHash
      queriesByKey.set(declaration.key, { unsearchedHash, activeHash })
    }
    return {
      queries: [...requestsByHash.values()],
      hashes: [...requestsByHash.keys()],
      queriesByKey,
    }
  }, [declarations, openedKeys, searchQueryByKey, debouncedSearchQueryByKey])
  const queryResults = useQueries({ queries: queryPlan.queries })
  const { definitions, loadingPickers, pickerErrors } = useMemo(() => {
    const resultsByHash = new Map(
      queryPlan.hashes.map((hash, index) => [hash, queryResults[index]]),
    )
    const loadingPickers = new Set<string>()
    const pickerErrors: Record<string, JSX.Element> = {}
    const definitions = declarations.map((declaration) => {
      if (!('optionSource' in declaration)) return declaration
      const { optionSource, ...definition } = declaration
      const queries = queryPlan.queriesByKey.get(declaration.key)!
      const activeResult = resultsByHash.get(queries.activeHash)!
      const unsearchedResult = resultsByHash.get(queries.unsearchedHash)!
      if (activeResult.isPending) loadingPickers.add(declaration.key)
      if (activeResult.error) {
        pickerErrors[declaration.key] = (
          <ApiErrorNotice
            error={activeResult.error}
            path={optionSource.path}
            heading={`Could not load ${declaration.label} options.`}
            isCompact
            onRetry={() => void activeResult.refetch()}
          />
        )
      }
      return {
        ...definition,
        ...optionSource.toOptionSet({
          shown: activeResult.data,
          unsearched: unsearchedResult.data,
          values,
        }),
        isServerSearched: optionSource.isServerSearched,
      }
    }) as FilterDefinition<Values>[]
    return { definitions, loadingPickers, pickerErrors }
  }, [declarations, queryPlan, queryResults, values])
  return (
    <FilterChipRow
      {...props}
      values={values}
      definitions={definitions}
      loadingPickers={loadingPickers}
      pickerErrors={pickerErrors}
      onPickerOpen={(key) => {
        setOpenedKeys((opened) => new Set([...opened, String(key)]))
        setSearchQueryByKey((searches) => ({ ...searches, [key]: '' }))
      }}
      onPickerSearch={(key, search) =>
        setSearchQueryByKey((searches) => ({ ...searches, [key]: search }))
      }
    />
  )
}
