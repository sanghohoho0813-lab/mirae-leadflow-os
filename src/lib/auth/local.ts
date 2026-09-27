import { createHmac, timingSafeEqual } from "node:crypto";
import { DEMO_COOKIE } from "./mode";

export { isDemoMode } from "./mode";
export const LOCAL_COOKIE = DEMO_COOKIE;

export const LOCAL_COOKIE_OPTIONS = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 30 };

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
