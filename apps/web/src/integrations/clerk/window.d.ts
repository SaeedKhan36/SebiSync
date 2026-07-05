import type { useClerk } from '@clerk/clerk-react'

declare global {
  interface Window {
    Clerk?: ReturnType<typeof useClerk>
  }
}

export {}
