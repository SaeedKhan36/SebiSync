import { useSuspenseQuery } from '@tanstack/react-query'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@sebi/worker'
import type { DocStatus } from '@sebi/schemas'
import { useTRPC } from '#/integrations/trpc/react'

// Real wire type via inferRouterOutputs, not @sebi/schemas's DocumentDto —
// issuedDate/createdAt cross the wire as strings, no transformer.
export type DocumentListItem = inferRouterOutputs<AppRouter>['document']['list'][number]

export interface DocumentListFilters {
  status?: DocStatus
  search?: string
  cursor?: string
}

const PAGE_SIZE = 20

export function useDocumentList(filters: DocumentListFilters) {
  const trpc = useTRPC()
  return useSuspenseQuery(
    trpc.document.list.queryOptions({
      status: filters.status,
      search: filters.search,
      cursor: filters.cursor,
      limit: PAGE_SIZE,
    }),
  )
}

export { PAGE_SIZE as DOCUMENT_PAGE_SIZE }
