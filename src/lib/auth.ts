import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { SessionPayload } from "@/lib/types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nova-crm-dev-secret-change-me-please"
);
export const SESSION_COOKIE = "nova_crm_session";

// Re-exported for existing imports (`from "@/lib/auth"`) that reference these —
// the actual definitions live in lib/types.ts so client components can safely
// import them without pulling in next/headers.
export {
  PERMISSION_MODULES,
  tenantOf,
  canAccess,
  parsePermissions,
} from "@/lib/types";
export type { PermissionModule, Role, SessionPayload } from "@/lib/types";

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Server Component / Route Handler helper — reads the current session from cookies */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}
