import { createFileRoute } from '@tanstack/react-router'
import { SignIn } from '@clerk/clerk-react'

export const Route = createFileRoute('/auth/login')({ component: LoginPage })

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
