import type { TrainingSummary } from "@/lib/types";

// A small, dependency-free summarizer used when no AI key is configured.
// It picks the sentences that carry the most repeated words, pulls out
// "해야 할 일" sentences, quoted lines, and frequent terms. Rough, but it works
// offline and is always labelled "기본 요약" in the UI.

const STOP = new Set(["그리고", "그런데", "그래서", "하지만", "우리가", "우리는", "대표님", "대표님들", "대표님께", "오늘은", "이번", "정말", "사실", "많이", "그게", "이게", "저는", "제가", "여러분", "것이", "것은", "있습니다", "합니다", "입니다", "됩니다", "있는", "하는", "없는", "때문에", "경우가", "경우", "그러면", "이렇게", "그렇게", "먼저", "다음", "하나", "가지", "무조건", "반드시", "꼭"]);
const PARTICLE = /(으로|에서|에게|께서|부터|까지|처럼|보다|이라|이나|라고|하고|와|과|은|는|이|가|을|를|의|에|도|로|만)$/;

function sentences(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split(/\n+|(?<=[.!?。])\s+|(?<=[다요죠])\.\s*/)
    .map((s) => s.replace(/^[\s\-•·*□■▶▷→\d.)]+/, "").trim())
    .filter((s) => s.length >= 8 && s.length <= 220);
}

function words(s: string): string[] {
  return (s.match(/[가-힣A-Za-z0-9·]{2,}/g) ?? [])
    .map((w) => w.replace(PARTICLE, ""))
    .filter((w) => w.length >= 2 && !STOP.has(w) && !/^\d+$/.test(w));
}

function trim(s: string, n: number) {
  const t = s.replace(/\s+/g, " ").trim().replace(/[.。]$/, "");
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

export function basicSummary(title: string, text: string): TrainingSummary {
  const list = sentences(text);
  const freq = new Map<string, number>();
  for (const s of list) for (const w of new Set(words(s))) freq.set(w, (freq.get(w) ?? 0) + 1);
  const titleWords = new Set(words(title));

  const scored = list.map((s, i) => {
    const ws = words(s);
    const score = ws.reduce((a, w) => a + (freq.get(w) ?? 0) + (titleWords.has(w) ? 2 : 0), 0) / Math.sqrt(ws.length + 1)
      + (i < 3 ? 1.5 : 0)
      + (/(핵심|중요|반드시|꼭|주의|포인트|결론)/.test(s) ? 2 : 0);
    return { s, i, score };
  });

  const isAction = (s: string) => /(하세요|해야|해 주세요|하십시오|챙기|확인하|남기|보내|받으|준비하|체크|잡고|기록)/.test(s);
  const isTalk = (s: string) => /["“”'‘’]/.test(s) && s.length <= 120;

  const top = [...scored].sort((a, b) => b.score - a.score);
  const keyPoints = top.filter((x) => !isTalk(x.s)).slice(0, 5).sort((a, b) => a.i - b.i).map((x) => trim(x.s, 90));
  const actions = scored.filter((x) => isAction(x.s) && !keyPoints.includes(trim(x.s, 90))).sort((a, b) => b.score - a.score).slice(0, 4).map((x) => trim(x.s, 80));
  const talks = scored.filter((x) => isTalk(x.s)).slice(0, 3).map((x) => trim(x.s, 110));
  const keywords = [...freq.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w);

  return {
    one_line: keyPoints[0] ? trim(keyPoints[0], 70) : trim(title, 70),
    key_points: keyPoints.length ? keyPoints : [trim(title, 90)],
    action_items: actions,
    talk_tracks: talks,
    keywords,
  };
}
