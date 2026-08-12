// Shared Clerk session-token getter for non-React call sites (tRPC headers).
// Prefer a getter registered from useAuth() inside ClerkProvider; fall back to
// window.Clerk for the brief window before the bridge mounts.

type TokenGetter = () => Promise<string | null>

let tokenGetter: TokenGetter | null = null

export function registerClerkTokenGetter(getter: TokenGetter | null) {
  tokenGetter = getter
}

export async function getClerkAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null

  const start = Date.now()
  while (Date.now() - start < 4000) {
    if (tokenGetter) {
      try {
        const token = await tokenGetter()
        if (token) return token
      } catch {
        // Fall through to window.Clerk.
      }
    }

    const session = window.Clerk?.session
    if (session) {
      const token = await session.getToken()
      if (token) return token
    }

    // Clerk finished loading with no session — genuinely signed out.
    if (window.Clerk?.loaded && !window.Clerk.session) return null

    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  return null
}
