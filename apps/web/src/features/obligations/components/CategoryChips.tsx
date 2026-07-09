import { Badge } from '#/components/ui/badge'

interface Category {
  id: string
  code: string
  name: string
}

export function CategoryChips({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {categories.map((category) => (
        <Badge key={category.id} variant="outline">
          {category.code}
        </Badge>
      ))}
    </div>
  )
}
