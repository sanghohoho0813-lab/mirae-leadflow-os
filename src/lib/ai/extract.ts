import { unzipSync, strFromU8 } from "fflate";

export interface SourceFile { name: string; mime: string; data: Buffer }

const ext = (name: string) => name.toLowerCase().split(".").pop() ?? "";

export function isPdf(f: SourceFile) { return f.mime === "application/pdf" || ext(f.name) === "pdf"; }
export function isImage(f: SourceFile) { return /^image\/(png|jpe?g|gif|webp)$/.test(f.mime); }
export function isAudio(f: SourceFile) { return f.mime.startsWith("audio/") || ["mp3", "m4a", "wav", "aac", "ogg", "amr"].includes(ext(f.name)); }

function xmlText(xml: string, tag: string): string {
  const out: string[] = [];
  // Paragraph breaks keep bullet points apart.
  for (const para of xml.split(/<\/(?:a|w):p>/)) {
    const parts = [...para.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]*)</${tag}>`, "g"))].map((m) => m[1]);
    const line = parts.join("").trim();
    if (line) out.push(line);
  }
  return out.join("\n").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

/**
 * Plain text we can read ourselves: txt/md/csv, PowerPoint (.pptx), Word (.docx).
 * Returns null for formats that need the AI (PDF, images) or can't be read (audio, .hwp, .ppt).
 */
export function extractText(f: SourceFile): string | null {
  const e = ext(f.name);
  try {
    if (f.mime.startsWith("text/") || ["txt", "md", "csv"].includes(e)) return f.data.toString("utf8");
    if (e === "pptx") {
      const files = unzipSync(new Uint8Array(f.data), { filter: (x) => /^ppt\/(slides\/slide|notesSlides\/notesSlide)\d+\.xml$/.test(x.name) });
      const slides = Object.keys(files)
        .filter((k) => k.startsWith("ppt/slides/"))
        .sort((a, b) => Number(a.match(/(\d+)\.xml$/)![1]) - Number(b.match(/(\d+)\.xml$/)![1]));
      return slides.map((k, i) => {
        const n = k.match(/(\d+)\.xml$/)![1];
        const notes = files[`ppt/notesSlides/notesSlide${n}.xml`];
        const body = xmlText(strFromU8(files[k]), "a:t");
        const note = notes ? xmlText(strFromU8(notes), "a:t") : "";
        return `[슬라이드 ${i + 1}]\n${body}${note ? `\n(발표 메모) ${note}` : ""}`;
      }).join("\n\n");
    }
    if (e === "docx") {
      const files = unzipSync(new Uint8Array(f.data), { filter: (x) => x.name === "word/document.xml" });
      const doc = files["word/document.xml"];
      return doc ? xmlText(strFromU8(doc), "w:t") : null;
    }
  } catch {
    return null;
  }
  return null;
}
