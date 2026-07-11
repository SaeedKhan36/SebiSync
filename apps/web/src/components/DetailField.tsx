import { cn } from '#/lib/utils'

interface DetailFieldProps {
  label: string
  children: React.ReactNode
  className?: string
}

// The app-wide "label over value" primitive for detail pages — one place to
// keep the small-caps label treatment consistent across every panel.
export function DetailField({ label, children, className }: DetailFieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  )
}
