import { createContext, useContext } from 'react'

// Column defs are shared across grouped and flat tables, so a cell renderer has
// no other way to learn which group it is currently being rendered under. Null
// outside a grouped table, which keeps flat tables rendering exactly as before.
const DataTableGroupContext = createContext<string | null>(null)

export const DataTableGroupProvider = DataTableGroupContext.Provider

export function useDataTableGroup() {
  return useContext(DataTableGroupContext)
}
