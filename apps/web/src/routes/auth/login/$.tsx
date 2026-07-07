import { createFileRoute } from '@tanstack/react-router'
import { SignIn } from '@clerk/clerk-react'

// Splat/catch-all for Clerk's own sub-paths under /auth/login (e.g. the
// Google OAuth redirect target /auth/login/sso-callback). Clerk's <SignIn>
// component detects which sub-state it's in from the current URL itself —
// it just needs a route to actually be reachable at that path; without
// this, the OAuth redirect 404s since our router only matched the exact
// /auth/login segment.
export const Route = createFileRoute('/auth/login/$')({ component: LoginPage })

function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <SignIn
        routing="path"
        path="/auth/login"
        signUpUrl="/auth/register"
        forceRedirectUrl="/dashboard"
      />
    </div>
  )
}
