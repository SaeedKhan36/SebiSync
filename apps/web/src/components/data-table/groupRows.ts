import type { ReactNode } from 'react'

export interface DataTableGroupBy<TData> {
  // Returns every group a row belongs to. Multiple keys ⇒ the row renders
  // once under each — this is why TanStack's own getGroupedRowModel is not
  // used: it buckets each row by a single value and cannot fan one out.
  getGroupKeys: (row: TData) => string[]
  // Canonical group order; keys not listed render after, alphabetically.
  order: string[]
  // Collapse state lives in DataTable, but the chevron and its aria-expanded
  // belong to the caller's header component, so it's passed back in rather
  // than exposed as a second prop.
  renderHeader: (
    key: string,
    count: number,
    state: { isCollapsed: boolean; toggle: () => void },
  ) => ReactNode
  // Bucket label for rows whose getGroupKeys returns [] (e.g. obligations
  // with no applicable categories). Rows are dropped when unset.
  emptyKey?: string
}

// Rows arrive already filtered and sorted, so bucketing preserves the sort
// order inside each group. Takes anything row-shaped rather than TanStack's
// Row because `original` is all it reads.
export function bucketRows<TRow extends { original: TData }, TData>(
  rows: TRow[],
  groupBy: DataTableGroupBy<TData>,
): Array<[string, TRow[]]> {
  const buckets = new Map<string, TRow[]>()
  for (const row of rows) {
    let keys = groupBy.getGroupKeys(row.original)
    if (keys.length === 0) keys = groupBy.emptyKey ? [groupBy.emptyKey] : []
    for (const key of keys) {
      const bucket = buckets.get(key)
      if (bucket) bucket.push(row)
      else buckets.set(key, [row])
    }
  }

  const rank = new Map(groupBy.order.map((key, index) => [key, index]))
  return [...buckets.entries()].sort(([a], [b]) => {
    if (a === groupBy.emptyKey) return 1
    if (b === groupBy.emptyKey) return -1
    const rankA = rank.get(a)
    const rankB = rank.get(b)
    if (rankA !== undefined && rankB !== undefined) return rankA - rankB
    if (rankA !== undefined) return -1
    if (rankB !== undefined) return 1
    return a.localeCompare(b)
  })
}
