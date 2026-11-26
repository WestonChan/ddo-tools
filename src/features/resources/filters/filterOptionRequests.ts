import { fetchApiPage, WHOLE_LIST_PAGE_LIMIT, type ApiPage } from '../../../lib/api'
import type { FilterOptionRequest } from './filterOptionSources'

export function fetchFilterOptionPage<Row, RowsKey extends string>(
  request: FilterOptionRequest,
  rowsKey: RowsKey,
  { q, offset }: { q?: string; offset?: number } = {},
  validation?: Parameters<typeof fetchApiPage<Row, RowsKey>>[3],
): Promise<ApiPage<Row, 'rows'>> {
  return fetchApiPage<Row, RowsKey>(
    request.path,
    rowsKey,
    { ...request.parameters, q: q?.trim() || undefined, limit: WHOLE_LIST_PAGE_LIMIT, offset },
    validation,
  )
}
