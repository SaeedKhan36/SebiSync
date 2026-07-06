import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '#/components/ui/breadcrumb'

export interface PageHeaderCrumb {
  label: string
  to?: string
}

interface PageHeaderProps {
  title: string
  breadcrumbs?: PageHeaderCrumb[]
  action?: React.ReactNode
}

// Generic — no domain knowledge. Every route composes this at the top of
// its page content.
export function PageHeader({ title, breadcrumbs, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b pb-4">
      <div className="space-y-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, i) => (
                <div key={crumb.label} className="flex items-center gap-1.5">
                  <BreadcrumbItem>
                    {crumb.to ? (
                      <BreadcrumbLink href={crumb.to}>{crumb.label}</BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {i < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}
        <h1 className="text-2xl font-semibold">{title}</h1>
      </div>
      {action}
    </div>
  )
}
