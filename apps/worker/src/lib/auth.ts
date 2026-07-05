import { createClerkClient } from "@clerk/backend";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY ?? "" });

export interface AuthResult {
  userId: string;
  orgId: string | null;
}

// Verifies the Clerk session token on the incoming request (Authorization:
// Bearer <token> for API clients, or the __session cookie for browser
// requests) and returns the authenticated user/org, or null if not signed in.
export async function authenticateRequest(request: Request): Promise<AuthResult | null> {
  const requestState = await clerkClient.authenticateRequest(request);
  if (!requestState.isSignedIn) {
    return null;
  }
  const auth = requestState.toAuth();
  if (!auth.userId) {
    return null;
  }
  return { userId: auth.userId, orgId: auth.orgId ?? null };
}
