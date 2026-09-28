"use client";

import { RecoveryScreen } from "@/components/layout/RecoveryScreen";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RecoveryScreen error={error} reset={reset} />;
}
