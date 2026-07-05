import { createTRPCContext } from '@trpc/tanstack-react-query'
import type { AppRouter } from '@sebi/worker'

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()
