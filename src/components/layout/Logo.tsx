export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect width="40" height="40" rx="11" style={{ fill: "var(--theme-primary)" }} />
      <path d="M9 28 L16 12 L20.5 21 L24 14 L31 28" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="31" cy="28" r="3" fill="#E7C873" />
    </svg>
  );
}
