"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const text = `[리드플로우 가입 안내]\n1) ${typeof window !== "undefined" ? window.location.origin : ""}/signup 접속\n2) 이름·이메일로 계정 만들기\n3) 초대코드 입력: ${code}`;
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <code className="rounded-xl bg-white px-4 py-2.5 text-[1.625rem] font-extrabold tracking-[0.2em] text-primary" data-testid="invite-code">{code}</code>
      <Button variant="secondary" onClick={copy}>{copied ? <><Check size={18} /> 복사됨</> : <><Copy size={18} /> 안내문 복사</>}</Button>
      <p className="w-full text-[0.9375rem] text-ink-2">복사한 안내문을 단톡방에 그대로 올리면 됩니다.</p>
    </div>
  );
}
