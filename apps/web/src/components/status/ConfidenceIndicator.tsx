import { Badge } from '#/components/ui/badge'
import { confidenceBucket } from '#/components/status/statusColorMaps'

export function ConfidenceIndicator({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-muted-foreground text-sm">—</span>
  }
  const bucket = confidenceBucket(value)
  return (
    <Badge variant={bucket.variant} className={bucket.className}>
      {Math.round(value * 100)}%
    </Badge>
  )
}
