import { createFileRoute } from '@tanstack/react-router'
import { SignUp } from '@clerk/clerk-react'

export const Route = createFileRoute('/auth/register')({ component: RegisterPage })

function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <SignUp
        routing="path"
        path="/auth/register"
        signInUrl="/auth/login"
        forceRedirectUrl="/dashboard"
      />
    </div>
  )
}
