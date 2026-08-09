import type { StatusEntry } from './statusColorMaps'

// Mirrors the Prisma enum SupersessionKind. Hand-written rather than imported
// from @sebi/schemas for the same reason as ObligationFanOutStatus: it is a
// server-derived read value with no Zod mutation input to share.
export type SupersessionKind = 'NEW' | 'AMENDS' | 'UNCHANGED'

// AMENDS is the only kind whose confirmation retires a live requirement, so it
// is the only one carrying an alarm color — the reviewer's attention should
// land there first. NEW and UNCHANGED are additive or inert.
export const supersessionKindColorMap: Record<SupersessionKind, StatusEntry> = {
  AMENDS: {
    label: 'Amends',
    variant: 'outline',
    className: 'border-orange-500 text-orange-700 dark:text-orange-400',
  },
  NEW: {
    label: 'New requirement',
    variant: 'default',
    className: 'bg-[#15803d] hover:bg-[#15803d]/90',
  },
  UNCHANGED: { label: 'Carried forward', variant: 'secondary' },
}
