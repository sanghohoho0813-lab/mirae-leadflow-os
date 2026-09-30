import type { TrainingSummary } from "@/lib/types";
import { basicSummary } from "./basic";
import { extractText, isAudio, isImage, isPdf, type SourceFile } from "./extract";

export interface SummarizeInput {
  title: string;
  instructor: string | null;
  heldAt: Date;
  content: string | null;
  files: SourceFile[];
}

export interface SummarizeResult {
  summary: TrainingSummary;
  source: "AI" | "BASIC";
  /** Shown to the person who asked for the summary. */
  notes: string[];
}

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const MAX_TEXT = 180_000; // characters sent to the AI
const MAX_PDF = 20 * 1024 * 1024;
const MAX_IMAGE = 4.5 * 1024 * 1024;

const SYSTEM = `당신은 중소기업 경영컨설팅 사업단의 사내 교육을 정리하는 비서입니다.
읽는 사람은 40~60대 컨설턴트이고, 휴대폰으로 1분 안에 핵심을 파악해야 합니다.
규칙:
- 교육 자료와 녹취에 실제로 있는 내용만 근거로 씁니다. 자료에 없는 수치·지원 요건·기관명을 지어내지 않습니다.
- 쉬운 우리말, 짧은 문장. 영어 약어는 필요할 때만.
- 과장·공포 표현 금지.
- key_points와 one_line에서 가장 중요한 말(요건·숫자·결론)은 **두 별표**로 감싸 굵게 표시합니다. 항목당 1~2곳만.
반드시 아래 JSON 하나만 출력합니다(설명·코드블록 없이).
{"one_line":"교육 전체를 한 문장으로(60자 이내)",
 "key_points":["핵심 내용 3~6개, 각 70자 이내"],
 "easy":["key_points와 같은 순서·같은 개수로, 중학생도 알아듣게 풀어 쓴 설명 한두 문장(비유·예시 환영, 전문용어 없이)"],
 "action_items":["이번 주 현장에서 바로 할 일 2~5개, '~하기'로 끝냄"],
 "talk_tracks":["대표님께 그대로 쓸 수 있는 말 0~3개, 큰따옴표로 감쌈"],
 "keywords":["검색용 핵심 단어 3~6개"]}`;

function clip(s: string, n: number) { return s.length > n ? s.slice(0, n) + "\n…(이하 생략)" : s; }

function normalise(x: unknown): TrainingSummary | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const arr = (v: unknown, max: number) => (Array.isArray(v) ? v.map((s) => String(s).trim()).filter(Boolean).slice(0, max) : []);
  const one = typeof o.one_line === "string" ? o.one_line.trim() : "";
  const key = arr(o.key_points, 8);
  if (!one || key.length === 0) return null;
  const easy = arr(o.easy, 8);
  return { one_line: one, key_points: key, ...(easy.length ? { easy: key.map((_, i) => easy[i] ?? "") } : {}), action_items: arr(o.action_items, 6), talk_tracks: arr(o.talk_tracks, 4), keywords: arr(o.keywords, 8) };
}

function parseJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = t.indexOf("{"); const end = t.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(t.slice(start, end + 1)); } catch { return null; }
}

async function callClaude(input: SummarizeInput, texts: string[], notes: string[]): Promise<TrainingSummary | null> {
  const blocks: unknown[] = [];
  for (const f of input.files) {
    if (isPdf(f) && f.data.length <= MAX_PDF) {
      blocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: f.data.toString("base64") }, title: f.name });
    } else if (isImage(f) && f.data.length <= MAX_IMAGE && blocks.length < 12) {
      blocks.push({ type: "image", source: { type: "base64", media_type: f.mime, data: f.data.toString("base64") } });
    }
  }
  const header = `교육 제목: ${input.title}\n강사: ${input.instructor ?? "-"}\n날짜: ${input.heldAt.toISOString().slice(0, 10)}`;
  blocks.push({ type: "text", text: clip(`${header}\n\n${texts.join("\n\n---\n\n")}`, MAX_TEXT) });

  const base = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50_000);
  try {
    const res = await fetch(`${base}/v1/messages`, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: "user", content: blocks }],
      }),
    });
    if (!res.ok) {
      console.error("[ai] summarize failed", res.status, (await res.text()).slice(0, 300));
      notes.push("AI 연결에 실패해 기본 요약으로 정리했습니다. 잠시 후 [다시 정리]를 눌러 주세요.");
      return null;
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
    const parsed = normalise(parseJson(text));
    if (!parsed) notes.push("AI 답변을 읽지 못해 기본 요약으로 정리했습니다.");
    return parsed;
  } catch (e) {
    console.error("[ai] summarize error", e);
    notes.push("AI 응답이 늦어 기본 요약으로 정리했습니다. 잠시 후 [다시 정리]를 눌러 주세요.");
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function summarizeTrainingMaterial(input: SummarizeInput): Promise<SummarizeResult | { error: string }> {
  const notes: string[] = [];
  const texts: string[] = [];
  if (input.content?.trim()) texts.push(`[강의 메모·녹취]\n${input.content.trim()}`);
  let needsAi = false;
  for (const f of input.files) {
    const t = extractText(f);
    if (t?.trim()) texts.push(`[자료: ${f.name}]\n${t.trim()}`);
    else if (isPdf(f) || isImage(f)) needsAi = true;
    else if (isAudio(f)) notes.push(`녹음 파일(${f.name})은 소리를 글로 바꾸는 기능이 아직 없습니다. 클로바노트 등으로 받아 적은 글을 '강의 내용'에 붙여넣어 주세요.`);
    else notes.push(`${f.name}은(는) 내용을 읽을 수 없는 형식입니다. PDF나 PPTX로 올리면 함께 정리됩니다.`);
  }

  if (aiConfigured() && (texts.length || needsAi)) {
    const ai = await callClaude(input, texts, notes);
    if (ai) return { summary: ai, source: "AI", notes };
  } else if (needsAi && !aiConfigured()) {
    notes.push("PDF·사진 자료는 AI 연결 후 함께 정리됩니다. 지금은 붙여넣은 글과 PPT·워드 내용만 정리했습니다.");
  }

  const all = texts.join("\n");
  if (all.replace(/\s/g, "").length < 40) {
    return { error: "정리할 내용이 부족합니다. 강의 메모나 녹취 글을 붙여넣거나 PPTX·워드·텍스트 자료를 올려 주세요." };
  }
  return { summary: basicSummary(input.title, all), source: "BASIC", notes };
}
