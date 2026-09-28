"use server";

import { headers } from "next/headers";

/**
 * Browser-side crashes land in the server log (Vercel → Logs) so a problem one
 * person sees on their own PC can be diagnosed without their screen.
 */
export async function reportClientError(info: { message: string; stack?: string; url: string; where: string }): Promise<void> {
  const h = await headers();
  console.error("[client-error]", JSON.stringify({
    where: info.where.slice(0, 40),
    message: info.message.slice(0, 500),
    stack: (info.stack ?? "").slice(0, 1500),
    url: info.url.slice(0, 300),
    ua: (h.get("user-agent") ?? "").slice(0, 200),
  }));
}
