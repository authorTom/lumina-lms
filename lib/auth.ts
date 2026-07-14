import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import crypto from "crypto";
import { getDb } from "./db";

const SESSION_COOKIE = "lms_session";
const SESSION_DAYS = 30;

// Resolved lazily so a missing secret fails at request time (not module load /
// build time), and never silently falls back to the dev secret in production.
function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable must be set in production.");
  }
  return "dev-only-secret-change-me-in-production";
}

export type Role = "student" | "instructor" | "admin";

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

// A short binding to the current password hash. Changing the password (self,
// admin reset, or admin set) rotates this, so previously issued tokens — and
// any hijacked session — stop validating.
function fingerprint(passwordHash: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(`pw:${passwordHash}`)
    .digest("base64url")
    .slice(0, 16);
}

export async function createSession(userId: number) {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const row = getDb()
    .prepare("SELECT password_hash FROM users WHERE id = ?")
    .get(userId) as { password_hash: string } | undefined;
  if (!row) throw new Error("Cannot create a session for a missing user.");
  const payload = `${userId}.${expires}.${fingerprint(row.password_hash)}`;
  const token = `${payload}.${sign(payload)}`;
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expires),
    path: "/",
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [userId, expires, fp, signature] = parts;
  const payload = `${userId}.${expires}.${fp}`;

  const expected = sign(payload);
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  if (Number(expires) < Date.now()) return null;

  const user = getDb()
    .prepare("SELECT id, name, email, role, password_hash FROM users WHERE id = ? AND disabled = 0")
    .get(Number(userId)) as (SessionUser & { password_hash: string }) | undefined;
  if (!user) return null;
  // Reject tokens issued against an old password (rotated by any password change).
  if (fingerprint(user.password_hash) !== fp) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
});

export async function requireUser(...roles: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles.length > 0 && !roles.includes(user.role)) redirect("/dashboard");
  return user;
}
