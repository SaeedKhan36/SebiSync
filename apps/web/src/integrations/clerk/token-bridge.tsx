import { useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { registerClerkTokenGetter } from './token'

// Registers useAuth().getToken for the tRPC client (and any other non-React
// callers). Must render under ClerkProvider.
export function ClerkTokenBridge() {
  const { getToken, isLoaded } = useAuth()

  useEffect(() => {
    if (!isLoaded) return
    registerClerkTokenGetter(() => getToken())
  }, [getToken, isLoaded])

  return null
}
