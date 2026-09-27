"use client";

import { Check } from "lucide-react";

export interface ChoiceOption<T extends string> { value: T; label: string; hint?: string }

/** Large tappable single-choice chips (44px+ targets, text always visible). */
export function ChoiceGroup<T extends string>({ name, options, value, onChange, columns = 3, testId }: {
  name: string; options: ChoiceOption<T>[]; value: T | null; onChange: (v: T) => void; columns?: 2 | 3 | 4; testId?: string;
}) {
  const cols = columns === 2 ? "grid-cols-2" : columns === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3";
  return (
    <div role="radiogroup" aria-label={name} className={`grid gap-2 ${cols}`} data-testid={testId}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`flex min-h-[52px] items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2 text-[16px] font-semibold transition-base active:scale-[0.98] ${
              active ? "border-primary bg-soft text-primary" : "border-line bg-white text-ink hover:border-primary/40"
            }`}
          >
            {active && <Check size={18} />}
            <span className="text-center leading-tight">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Multi-select tag chips. */
export function TagPicker({ options, value, onChange, name }: { options: string[]; value: string[]; onChange: (v: string[]) => void; name: string }) {
  const toggle = (t: string) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((t) => {
        const active = value.includes(t);
        return (
          <button
            key={t}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(t)}
            className={`min-h-[44px] rounded-xl border-2 px-3.5 text-[15px] font-medium transition-base ${active ? "border-primary bg-soft text-primary" : "border-line bg-white text-ink-2 hover:border-primary/40"}`}
          >
            {active ? "✓ " : ""}{t}
          </button>
        );
      })}
      {value.map((t) => <input key={t} type="hidden" name={name} value={t} />)}
    </div>
  );
}
