import { useOrganization } from '@clerk/clerk-react'

// Server-side checks remain the real enforcement; this only controls what's shown.
export function useIsOrgAdmin() {
  const { membership } = useOrganization()
  return membership?.role === 'org:admin'
}
