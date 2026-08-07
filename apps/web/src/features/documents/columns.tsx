import type { ColumnDef } from '@tanstack/react-table'
import { ChevronRight, ExternalLink, FileText } from 'lucide-react'
import { StatusBadge } from '#/components/status/StatusBadge'
import { docStatusColorMap } from '#/components/status/statusColorMaps'
import { formatDate } from '#/lib/format'
import type { DocumentListItem } from '#/features/documents/hooks/useDocumentList'

// Statuses where the ingestion pipeline is still running. They get a pulsing
// dot so an in-flight document is distinguishable at a glance from a settled
// one — motion, not just color, since PARSING and PARSED share a hue family.
const IN_FLIGHT: ReadonlySet<DocumentListItem['status']> = new Set(['PARSING', 'EXTRACTING'])

export const documentColumns: ColumnDef<DocumentListItem>[] = [
  {
    id: 'title',
    header: 'Document',
    accessorFn: (row) => row.title,
    meta: { cellClassName: 'max-w-[26rem]' },
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground transition-colors group-hover/row:border-primary/30 group-hover/row:bg-primary/10 group-hover/row:text-primary"
        >
          <FileText className="size-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="truncate leading-snug font-medium">{row.original.title}</p>
          <p className="truncate font-mono text-[11px] leading-snug text-muted-foreground">
            {row.original.circularNumber}
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'issuedDate',
    header: 'Issued',
    meta: { cellClassName: 'whitespace-nowrap tabular-nums' },
    cell: ({ row }) => formatDate(row.original.issuedDate),
  },
  {
    id: 'createdAt',
    header: 'Ingested',
    // Secondary provenance — useful, but the first thing to go when the
    // viewport gets tight, so it drops out below lg rather than squeezing
    // the title column.
    meta: {
      headerClassName: 'hidden lg:table-cell',
      cellClassName: 'hidden whitespace-nowrap tabular-nums text-muted-foreground lg:table-cell',
    },
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    id: 'status',
    header: 'Status',
    meta: { cellClassName: 'whitespace-nowrap' },
    cell: ({ row }) => (
      <StatusBadge
        value={row.original.status}
        map={docStatusColorMap}
        leading={
          IN_FLIGHT.has(row.original.status) ? (
            <span aria-hidden className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-current" />
            </span>
          ) : undefined
        }
      />
    ),
  },
  {
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    meta: { headerClassName: 'w-20', cellClassName: 'w-20' },
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        {row.original.sourceUrl && (
          // Nested inside a click-to-open row, so the click must not also
          // navigate to the detail page behind the new tab.
          <a
            href={row.original.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(e) => e.stopPropagation()}
            title="Open source circular on sebi.gov.in"
            aria-label={`Open the source circular for ${row.original.title} in a new tab`}
            className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity outline-none hover:text-foreground focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 group-hover/row:opacity-100"
          >
            <ExternalLink className="size-4" />
          </a>
        )}
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground/40 transition-all group-hover/row:translate-x-0.5 group-hover/row:text-foreground"
        />
      </div>
    ),
  },
]
