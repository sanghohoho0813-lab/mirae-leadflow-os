import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "md" | "lg" | "sm";

const base = "press inline-flex items-center justify-center gap-2 rounded-xl font-semibold select-none whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(17,24,39,0.10)] disabled:hover:translate-y-0 disabled:hover:shadow-none";
const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-strong",
  secondary: "bg-white text-ink border border-line-strong hover:bg-soft hover:border-primary/40",
  ghost: "bg-transparent text-ink-2 hover:bg-neutral-bg",
  danger: "bg-white text-danger border border-danger/40 hover:bg-danger-bg",
  success: "bg-success text-white hover:brightness-95",
};
const sizes: Record<Size, string> = {
  sm: "h-10 px-3.5 text-[15px]",
  md: "h-12 px-5 text-[17px]",
  lg: "h-14 px-6 text-[18px]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", className = "", children, ...rest }: ButtonProps) {
  return (
    <button className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

interface LinkButtonProps {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  prefetch?: boolean;
}

export function LinkButton({ href, variant = "primary", size = "md", className = "", children, prefetch = false }: LinkButtonProps) {
  return (
    <Link href={href} prefetch={prefetch} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}
