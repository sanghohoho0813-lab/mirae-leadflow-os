"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "./Toast";

/** Clipboard API, with a textarea fallback for in-app browsers (e.g. KakaoTalk). */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export function CopyButton({ text, label, done = "복사했습니다", className = "", icon, testId }: {
  text: string; label: string; done?: string; className?: string; icon?: ReactNode; testId?: string;
}) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={async () => {
        if (await copyText(text)) {
          setCopied(true);
          toast("success", done);
          setTimeout(() => setCopied(false), 1800);
        } else {
          toast("error", "복사하지 못했습니다. 길게 눌러 직접 복사해 주세요.");
        }
      }}
      className={`press inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-[15px] font-semibold transition-base ${
        copied ? "border-success/40 bg-success-bg text-success" : "border-line-strong bg-white text-ink hover:border-primary/50 hover:bg-soft"
      } ${className}`}
    >
      {copied ? <Check size={17} /> : icon ?? <Copy size={17} />}
      {copied ? "복사됨" : label}
    </button>
  );
}
