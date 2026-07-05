import { createClerkClient, type ClerkClient } from "@clerk/backend";

// Lazily constructed — this module is statically reachable from server.ts
// (server -> trpc/router -> trpc/context -> lib/auth), which ESM executes
// before server.ts's own dotenv.config() calls run. Reading process.env at
// call time (not module load time) avoids capturing empty keys.
let clerkClient: ClerkClient | undefined;
function getClerkClient(): ClerkClient {
  if (!clerkClient) {
    clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY ?? "",
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? "",
    });
  }
  return clerkClient;
}

export interface AuthResult {
  userId: string;
  orgId: string | null;
}

// Verifies the Clerk session token on the incoming request (Authorization:
// Bearer <token> for API clients, or the __session cookie for browser
// requests) and returns the authenticated user/org, or null if not signed in.
export async function authenticateRequest(request: Request): Promise<AuthResult | null> {
  const requestState = await getClerkClient().authenticateRequest(request);
  if (!requestState.isSignedIn) {
    return null;
  }
  const auth = requestState.toAuth();
  if (!auth.userId) {
    return null;
  }
  return { userId: auth.userId, orgId: auth.orgId ?? null };
}
