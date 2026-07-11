interface DataTableToolbarProps {
  children?: React.ReactNode
}

// Generic slot for filter controls (selects, search inputs) — per-domain
// code supplies the actual filter UI as children; this just provides
// consistent layout/spacing above the table. Stacks vertically on narrow
// viewports, flows in a row from sm up.
export function DataTableToolbar({ children }: DataTableToolbarProps) {
  if (!children) return null
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {children}
    </div>
  )
}
