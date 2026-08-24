import { describe, expect, it } from 'vitest'
import { bucketRows, type DataTableGroupBy } from './groupRows'

interface Obligation {
  id: string
  categories: string[]
}

// Mirrors how DataTable wraps rows: bucketRows only reads `original`.
function rows(...items: Obligation[]) {
  return items.map((original) => ({ id: original.id, original }))
}

function config(
  overrides: Partial<DataTableGroupBy<Obligation>> = {},
): DataTableGroupBy<Obligation> {
  return {
    getGroupKeys: (row) => row.categories,
    order: ['STOCKBROKER', 'DEPOSITORY', 'MII'],
    renderHeader: () => null,
    ...overrides,
  }
}

describe('bucketRows', () => {
  it('gathers rows of one category into a single contiguous group', () => {
    // Extraction emits obligations in source-document order, so the same
    // category arrives in several runs — the reason grouping exists.
    const groups = bucketRows(
      rows(
        { id: 'a', categories: ['STOCKBROKER'] },
        { id: 'b', categories: ['DEPOSITORY'] },
        { id: 'c', categories: ['STOCKBROKER'] },
        { id: 'd', categories: ['MII'] },
        { id: 'e', categories: ['STOCKBROKER'] },
      ),
      config(),
    )

    expect(groups.map(([key]) => key)).toEqual(['STOCKBROKER', 'DEPOSITORY', 'MII'])
    expect(groups[0][1].map((row) => row.id)).toEqual(['a', 'c', 'e'])
  })

  it('lists a multi-category row under every group it applies to', () => {
    const groups = bucketRows(
      rows(
        { id: 'single', categories: ['DEPOSITORY'] },
        { id: 'both', categories: ['DEPOSITORY', 'MII'] },
      ),
      config(),
    )

    const byKey = new Map(groups.map(([key, groupRows]) => [key, groupRows.map((r) => r.id)]))
    expect(byKey.get('DEPOSITORY')).toEqual(['single', 'both'])
    expect(byKey.get('MII')).toEqual(['both'])
    // Counts deliberately sum to more than the row count.
    expect(groups.reduce((total, [, groupRows]) => total + groupRows.length, 0)).toBe(3)
  })

  it('keeps rendered row keys unique when a row is fanned out', () => {
    const groups = bucketRows(
      rows({ id: 'both', categories: ['DEPOSITORY', 'MII'] }),
      config(),
    )

    // The group prefix is what stops the duplicated row instances from
    // colliding on their shared TanStack row id.
    const renderKeys = groups.flatMap(([key, groupRows]) =>
      groupRows.map((row) => `${key}:${row.id}`),
    )
    expect(new Set(renderKeys).size).toBe(renderKeys.length)
  })

  it('renders exactly one group when getGroupKeys is narrowed to a filter', () => {
    // What the obligations route does when ?categoryCode=DEPOSITORY is set:
    // without the intersection a DEPOSITORY + MII row would still spawn an
    // MII group, reading as if the filter had leaked.
    const groups = bucketRows(
      rows({ id: 'both', categories: ['DEPOSITORY', 'MII'] }),
      config({
        getGroupKeys: (row) => row.categories.filter((code) => code === 'DEPOSITORY'),
      }),
    )

    expect(groups.map(([key]) => key)).toEqual(['DEPOSITORY'])
  })

  it('orders unlisted keys alphabetically after the canonical ones', () => {
    const groups = bucketRows(
      rows(
        { id: 'a', categories: ['ZEBRA'] },
        { id: 'b', categories: ['ALPACA'] },
        { id: 'c', categories: ['MII'] },
      ),
      config(),
    )

    expect(groups.map(([key]) => key)).toEqual(['MII', 'ALPACA', 'ZEBRA'])
  })

  it('sorts the empty bucket last, behind even unlisted keys', () => {
    const groups = bucketRows(
      rows(
        { id: 'a', categories: [] },
        { id: 'b', categories: ['ZEBRA'] },
        { id: 'c', categories: ['STOCKBROKER'] },
      ),
      config({ emptyKey: 'UNCATEGORISED' }),
    )

    expect(groups.map(([key]) => key)).toEqual(['STOCKBROKER', 'ZEBRA', 'UNCATEGORISED'])
  })

  it('drops rows with no group when no emptyKey is configured', () => {
    const groups = bucketRows(
      rows({ id: 'a', categories: [] }, { id: 'b', categories: ['MII'] }),
      config(),
    )

    expect(groups.map(([key]) => key)).toEqual(['MII'])
  })

  it('omits groups whose rows were all filtered out upstream', () => {
    // Search filtering happens before bucketing, so an emptied group never
    // reaches the renderer as a bare header.
    const groups = bucketRows(rows({ id: 'a', categories: ['MII'] }), config())

    expect(groups.map(([key]) => key)).toEqual(['MII'])
  })
})
