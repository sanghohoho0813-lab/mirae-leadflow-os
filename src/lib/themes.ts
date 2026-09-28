/** The 9 screen themes. CSS values live in globals.css (`:root[data-theme=…]`). */
export interface ThemeDef {
  key: string;
  name: string;
  desc: string;
  /** shell, primary, secondary, accent, highlight, soft */
  colors: [string, string, string, string, string, string];
}

export const DEFAULT_THEME = "deep-teal";
export const THEME_STORAGE_KEY = "lf_theme";
export const MOTION_STORAGE_KEY = "lf_motion";
export const FONT_STORAGE_KEY = "lf_font";

export const FONT_SIZES = [
  { key: "normal", label: "보통", desc: "기본 크기" },
  { key: "large", label: "크게", desc: "약 12% 크게" },
  { key: "xlarge", label: "아주 크게", desc: "약 25% 크게" },
] as const;
export type FontSize = (typeof FONT_SIZES)[number]["key"];

export function isFontSize(v: string | null | undefined): v is FontSize {
  return v === "normal" || v === "large" || v === "xlarge";
}

export function applyFont(size: string) {
  if (size === "large" || size === "xlarge") document.documentElement.dataset.font = size;
  else delete document.documentElement.dataset.font;
}

export const THEMES: ThemeDef[] = [
  { key: "navy", name: "딥 네이비 블루", desc: "차분한 남색", colors: ["#0f1d3a", "#2456d6", "#1a86a6", "#17a585", "#e6c46c", "#dfe8f7"] },
  { key: "navy-gold", name: "네이비 골드", desc: "남색 + 금색 강조", colors: ["#141a33", "#2b40a0", "#a37a28", "#d0a84b", "#efd995", "#eee7d7"] },
  { key: "emerald-gold", name: "에메랄드 골드", desc: "짙은 초록 + 금색", colors: ["#11332b", "#0e7663", "#2c9277", "#b4862a", "#e8ce88", "#e2f0ea"] },
  { key: "forest-sage", name: "포레스트 세이지", desc: "숲색 · 부드러운 톤", colors: ["#17352c", "#356e58", "#73977e", "#a58e4d", "#d9d2aa", "#e5ece5"] },
  { key: "deep-teal", name: "딥 틸", desc: "기본값 · 브랜드 색", colors: ["#08323a", "#087a83", "#1597a3", "#d2704c", "#e9b59b", "#ddedef"] },
  { key: "onyx-gold", name: "오닉스 골드", desc: "무채색 + 금색", colors: ["#15171c", "#343942", "#6a717c", "#b89032", "#e0c76f", "#e6e8ec"] },
  { key: "burgundy-slate", name: "버건디 슬레이트", desc: "와인색 · 무게감", colors: ["#3b1824", "#7a2b47", "#687087", "#a8606f", "#e8b4a4", "#f1e4e6"] },
  { key: "plum-indigo", name: "플럼 인디고", desc: "보라 + 남보라", colors: ["#2a1c40", "#5a3d96", "#4a63a8", "#8e5ca8", "#c9b4e6", "#ebe5f3"] },
  { key: "steel-platinum", name: "스틸 플래티넘", desc: "강철빛 · 가장 옅음", colors: ["#24303b", "#44647a", "#6d8899", "#4c9aaa", "#c9d6de", "#e7edf1"] },
];

export function isThemeKey(key: string | null | undefined): key is string {
  return !!key && THEMES.some((t) => t.key === key);
}

export function applyTheme(key: string, animate = false) {
  const root = document.documentElement;
  if (animate && root.dataset.motion !== "reduce") {
    root.classList.add("theme-switching");
    window.setTimeout(() => root.classList.remove("theme-switching"), 420);
  }
  if (!isThemeKey(key) || key === DEFAULT_THEME) root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", key);
}

export function applyMotion(reduce: boolean) {
  if (reduce) document.documentElement.dataset.motion = "reduce";
  else delete document.documentElement.dataset.motion;
}

/** Inline script for <head>: applies saved theme, motion and font size before first paint. */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t&&t!=="${DEFAULT_THEME}"&&${JSON.stringify(THEMES.map((t) => t.key))}.indexOf(t)>=0)document.documentElement.setAttribute("data-theme",t);if(localStorage.getItem("${MOTION_STORAGE_KEY}")==="reduce")document.documentElement.setAttribute("data-motion","reduce");var f=localStorage.getItem("${FONT_STORAGE_KEY}");if(f==="large"||f==="xlarge")document.documentElement.setAttribute("data-font",f)}catch(e){}`;
