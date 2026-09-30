/** 체험용 예시 DB 표시 — 실제 DB와 헷갈리지 않도록 빨간색으로 크게. */
export function SampleTag({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span data-testid="lead-sample-tag"
      className={`inline-flex shrink-0 items-center rounded-md bg-red-600 font-extrabold tracking-wide text-white ${size === "lg" ? "px-2.5 py-1 text-[0.9375rem]" : "px-1.5 py-0.5 text-[0.8125rem]"}`}>
      예시
    </span>
  );
}
