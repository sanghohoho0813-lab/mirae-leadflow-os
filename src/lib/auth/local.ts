import { createHmac, timingSafeEqual } from "node:crypto";

export const LOCAL_COOKIE = "lf_local_session";

function secret() {
  return process.env.AUTH_SECRET || "local-dev-secret";
}

export function signLocalSession(userId: string): string {
  const mac = createHmac("sha256", secret()).update(userId).digest("hex");
  return `${userId}.${mac}`;
}

export function verifyLocalSession(value: string | undefined): string | null {
  if (!value) return null;
  const [userId, mac] = value.split(".");
  if (!userId || !mac) return null;
  const expected = createHmac("sha256", secret()).update(userId).digest("hex");
  if (expected.length !== mac.length) return null;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(mac)) ? userId : null;
}

/**
 * Local auth is a development/QA convenience. It is disabled in production
 * builds unless LOCAL_AUTH_UNSAFE_OK=1 is set explicitly (used only to run the
 * E2E suite against `next start`). Never set that variable on a real deployment.
 */
export function isLocalAuth(): boolean {
  if (process.env.AUTH_MODE !== "local") return false;
  return process.env.NODE_ENV !== "production" || process.env.LOCAL_AUTH_UNSAFE_OK === "1";
}
