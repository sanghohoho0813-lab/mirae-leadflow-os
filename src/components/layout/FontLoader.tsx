"use client";

import { useEffect } from "react";

const HREF = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

/**
 * Loads the brand font without blocking first paint or hydration. If the CDN
 * is unreachable the app simply keeps the system Korean font stack.
 */
export function FontLoader() {
  useEffect(() => {
    if (document.querySelector(`link[href="${HREF}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = HREF;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
    document.body.dataset.hydrated = "1";
  }, []);
  return null;
}
