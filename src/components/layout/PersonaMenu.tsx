"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { titleOf } from "@/lib/labels";
import { usePersonaSwitch, type Persona } from "./DemoBar";

const DIVISION_ORDER = ["직할본부", "2본부", "3본부", "광주 상무본부"];
const TITLE_RANK: Record<string, number> = { 본부장: 0, 지점장: 1, 팀장: 2 };

/** 운영진 first, then each 본부: 본부장 › 지점장 › 팀장 › 컨설턴트. */
function groups(people: Persona[]): { title: string; people: Persona[] }[] {
  const staff = people.filter((p) => p.role === "OWNER" || p.role === "MANAGER" || p.role === "CALLER")
    .sort((a, b) => ["OWNER", "MANAGER", "CALLER"].indexOf(a.role) - ["OWNER", "MANAGER", "CALLER"].indexOf(b.role));
  const out = [{ title: "사업단 운영", people: staff }];
  const divs = [...new Set(people.map((p) => p.division).filter(Boolean) as string[])]
    .sort((a, b) => (DIVISION_ORDER.indexOf(a) + 99) % 99 - (DIVISION_ORDER.indexOf(b) + 99) % 99);
  for (const d of divs) {
    const list = people.filter((p) => p.division === d && (p.role === "LEADER" || p.role === "CONSULTANT"))
      .sort((a, b) => (TITLE_RANK[titleOf(a.role, a.title)] ?? 3) - (TITLE_RANK[titleOf(b.role, b.title)] ?? 3) || a.name.localeCompare(b.name, "ko"));
    if (list.length) out.push({ title: d, people: list });
  }
  return out.filter((g) => g.people.length);
}

/**
 * 사이드바 이름 누르기 → 누구 화면으로 볼지 고르기 (체험 모드). 단장·비서·콜팀장,
 * 본부별 본부장·지점장·팀장·컨설턴트. 위쪽 역할 막대와 같은 방식으로 바뀐다.
 */
export function PersonaMenu({ people, currentId, children, dark, testId }: {
  people: Persona[]; currentId: string; children: React.ReactNode; dark?: boolean; testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const { pick, target, pending } = usePersonaSwitch(currentId);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} data-testid={testId} aria-label="다른 사람 화면으로 바꾸기"
        className={`press flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition-base ${dark ? "hover:bg-white/[0.08]" : "hover:bg-white/10"}`}>
        {children}
        <ChevronsUpDown size={18} className="ml-auto shrink-0 opacity-60" />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="누구 화면으로 볼까요?" testId="persona-menu" wide>
        <div className="grid max-h-[65vh] gap-4 overflow-y-auto pr-1">
          {groups(people).map((g) => (
            <section key={g.title}>
              <h3 className="mb-1.5 text-[0.9375rem] font-bold text-ink-3">{g.title}</h3>
              <div className="grid grid-cols-2 gap-2">
                {g.people.map((p) => {
                  const active = p.id === (target ?? currentId);
                  const t = titleOf(p.role, p.title);
                  return (
                    <button key={p.id} type="button" disabled={pending && target === p.id} onClick={() => pick(p.id, () => setOpen(false))}
                      data-testid={`persona-menu-${p.id}`} aria-pressed={active}
                      className={`press flex min-h-[3.5rem] items-center gap-2 rounded-xl border-2 px-3 text-left ${active ? "border-primary bg-soft" : "border-line bg-white hover:border-primary/40"}`}>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className={`block text-[0.875rem] font-semibold ${active ? "text-primary" : "text-ink-3"}`}>{t}</span>
                        <span className="block truncate text-[1.0625rem] font-bold text-ink">{p.name.startsWith(t) ? p.name.slice(t.length).trim() || p.name : p.name}</span>
                      </span>
                      {active && <Check size={18} className="shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </Dialog>
    </>
  );
}
