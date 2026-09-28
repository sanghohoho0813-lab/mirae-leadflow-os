"use client";

import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { PersonaDialog, type Persona } from "./DemoTools";

/** 사이드바 이름 누르기 → 사용자 변경하기 (체험 모드). */
export function PersonaMenu({ people, currentId, children, testId }: {
  people: Persona[]; currentId: string; children: React.ReactNode; testId?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} data-testid={testId} aria-label="사용자 변경하기"
        className="press flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition-base hover:bg-white/[0.08]">
        {children}
        <ChevronsUpDown size={18} className="ml-auto shrink-0 opacity-60" />
      </button>
      <PersonaDialog people={people} currentId={currentId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
