import { AlertTriangle, SearchX } from 'lucide-react'
import { Link, type ErrorComponentProps } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'

// Wired as the router's defaultErrorComponent — catches any thrown loader
// error (findUniqueOrThrow on a bad id, a FORBIDDEN cross-org access, etc.)
// that would otherwise fall through to TanStack Router's bare default.
export function ErrorBoundaryFallback({ error, reset }: ErrorComponentProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="bg-destructive/10 flex size-16 items-center justify-center rounded-full">
        <AlertTriangle className="text-destructive size-8" />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-semibold">Something went wrong</p>
        <p className="text-muted-foreground max-w-md text-sm">{error.message}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
        <Button asChild>
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  )
}

// Wired as the router's defaultNotFoundComponent — for URLs that don't
// match any route.
export function NotFoundFallback() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="bg-muted flex size-16 items-center justify-center rounded-full">
        <SearchX className="text-muted-foreground size-8" />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-semibold">Page not found</p>
        <p className="text-muted-foreground max-w-md text-sm">
          The page you're looking for doesn't exist or may have moved.
        </p>
      </div>
      <Button asChild>
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  )
}
