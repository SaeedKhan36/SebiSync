import { createClerkClient, type ClerkClient } from "@clerk/backend";

// Lazily constructed — this module is statically reachable from server.ts
// (server -> trpc/router -> trpc/context -> lib/auth), which ESM executes
// before server.ts's own dotenv.config() calls run. Reading process.env at
// call time (not module load time) avoids capturing empty keys.
let clerkClient: ClerkClient | undefined;
export function getClerkClient(): ClerkClient {
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
  orgRole: string | null;
}

// Verifies the Clerk session token on the incoming request (Authorization:
// Bearer <token> for API clients, or the __session cookie for browser
// requests) and returns the authenticated user/org, or null if not signed in.
//
// authorizedParties must match the frontend origin(s) in the JWT `azp` claim.
// Without it, cross-origin Bearer tokens from apps/web still verify — but once
// Clerk includes azp (it does for browser sessions), an explicit allowlist is
// the secure default and avoids subtle reject-all behaviour if Clerk tightens
// defaults. Reuse WEB_ORIGIN so CORS and JWT party checks stay in sync.
function authorizedParties(): string[] | undefined {
  const parties = (process.env.WEB_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return parties.length > 0 ? parties : undefined;
}

export async function authenticateRequest(request: Request): Promise<AuthResult | null> {
  const secretConfigured = Boolean(process.env.CLERK_SECRET_KEY);
  const hasAuthorization = Boolean(request.headers.get("authorization"));
  const parties = authorizedParties();

  const requestState = await getClerkClient().authenticateRequest(request, {
    ...(parties ? { authorizedParties: parties } : {}),
  });

  if (!requestState.isSignedIn) {
    // Only log when a Bearer token was present but still rejected — missing
    // Authorization on anonymous probes is expected and too noisy otherwise.
    if (hasAuthorization) {
      console.warn("[auth] unsigned", {
        reason: requestState.reason,
        message: requestState.message,
        status: requestState.status,
        secretConfigured,
        authorizedParties: parties ?? [],
      });
    }
    return null;
  }
  const auth = requestState.toAuth();
  if (!auth.userId) {
    return null;
  }
  return { userId: auth.userId, orgId: auth.orgId ?? null, orgRole: auth.orgRole ?? null };
}
