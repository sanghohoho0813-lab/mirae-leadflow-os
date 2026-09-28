"use client";

import "./globals.css";
import { RecoveryScreen } from "@/components/layout/RecoveryScreen";

/** Last-resort boundary (errors in the root layout itself). */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="ko">
      <body>
        <RecoveryScreen error={error} />
      </body>
    </html>
  );
}
