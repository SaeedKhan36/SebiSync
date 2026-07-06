interface DataTableToolbarProps {
  children?: React.ReactNode
}

// Generic slot for filter controls (selects, search inputs) — per-domain
// code supplies the actual filter UI as children; this just provides
// consistent layout/spacing above the table.
export function DataTableToolbar({ children }: DataTableToolbarProps) {
  if (!children) return null
  return <div className="flex flex-wrap items-center gap-2">{children}</div>
}
