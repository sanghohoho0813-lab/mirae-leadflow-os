import { Fragment } from "react";

/**
 * 요약 글 안의 **굵게** 표시를 형광펜 굵은 글씨로 보여 준다 (그 밖의 서식은 없음).
 * AI 요약과 손으로 쓴 요약이 같은 규칙을 쓴다.
 */
export function Rich({ text }: { text: string }) {
  const parts = text.split("**");
  return <>{parts.map((p, i) => (i % 2 === 1 && i < parts.length - 1 ? <b key={i} className="hl">{p}</b> : <Fragment key={i}>{p}</Fragment>))}</>;
}

/** 카드·복사용: **표시**를 뺀 글. */
export function plain(text: string): string {
  return text.replaceAll("**", "");
}
