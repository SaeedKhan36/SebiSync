import { Badge } from '#/components/ui/badge'
import { useDataTableGroup } from '#/components/data-table/DataTableGroupContext'

interface Category {
  id: string
  code: string
  name: string
}

export function CategoryChips({ categories }: { categories: Category[] }) {
  const groupCode = useDataTableGroup()

  if (categories.length === 0) return <span className="text-muted-foreground text-xs">—</span>

  // Inside a category group, lead with that group's own code and mute the rest.
  // Cyber-resilience obligations bind all six categories, so an un-emphasised
  // list makes a grouped row look as though the grouping leaked; this way it
  // reads as "this group, and also applies to these".
  const ordered = groupCode
    ? [...categories].sort(
        (a, b) => Number(b.code === groupCode) - Number(a.code === groupCode),
      )
    : categories

  return (
    <div className="flex flex-wrap gap-1">
      {ordered.map((category) => (
        <Badge
          key={category.id}
          variant="outline"
          className={
            groupCode && category.code !== groupCode
              ? 'border-border/60 text-muted-foreground'
              : undefined
          }
        >
          {category.code}
        </Badge>
      ))}
    </div>
  )
}
