import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export const inputClass = "h-13 w-full rounded-xl border border-line-strong bg-white px-4 text-[17px] text-ink placeholder:text-ink-3 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-base";

export function Field({ label, required, hint, children, htmlFor }: { label: string; required?: boolean; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[16px] font-semibold text-ink">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {hint && <p className="text-[14px] text-ink-3">{hint}</p>}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} style={{ height: 52 }} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className ?? ""}`} style={{ height: 52 }} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} min-h-[96px] py-3 leading-relaxed ${props.className ?? ""}`} />;
}
