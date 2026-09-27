"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

type Kind = "success" | "error" | "info";
interface Toast { id: number; kind: Kind; text: string }
const Ctx = createContext<(kind: Kind, text: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Kind, text: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, kind, text }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), kind === "error" ? 5000 : 3200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-8" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} role="status" className={`toast-in pointer-events-auto flex max-w-md items-center gap-2.5 rounded-2xl px-4 py-3 text-[16px] font-semibold shadow-2xl ${
            t.kind === "success" ? "bg-success text-white" : t.kind === "error" ? "bg-danger text-white" : "bg-ink text-white"
          }`}>
            {t.kind === "success" ? <CheckCircle2 size={20} /> : t.kind === "error" ? <AlertCircle size={20} /> : <Info size={20} />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
