/** Canonical 9 themes (Master v1.1 §18). CSS values live in globals.css. */
export interface ThemeDef {
  key: string;
  name: string;
  /** shell, primary, secondary, accent, highlight, soft */
  colors: [string, string, string, string, string, string];
}

export const DEFAULT_THEME = "navy";
export const THEME_STORAGE_KEY = "lf_theme";

export const THEMES: ThemeDef[] = [
  { key: "navy", name: "딥 네이비 블루", colors: ["#14284b", "#2563eb", "#1e40af", "#0e9f8f", "#e7c873", "#e8effc"] },
  { key: "navy-gold", name: "네이비 골드", colors: ["#111a2d", "#2847a7", "#a37a28", "#d0a84b", "#f0d995", "#efe8d7"] },
  { key: "emerald-gold", name: "에메랄드 골드", colors: ["#11332b", "#0e7663", "#2c9277", "#b4862a", "#e8ce88", "#e2f0ea"] },
  { key: "forest-sage", name: "포레스트 세이지", colors: ["#17352c", "#356e58", "#73977e", "#a58e4d", "#d9d2aa", "#e5ece5"] },
  { key: "deep-teal", name: "딥 틸", colors: ["#08323a", "#087a83", "#1597a3", "#d2704c", "#e9b59b", "#ddedef"] },
  { key: "onyx-gold", name: "오닉스 골드", colors: ["#15171c", "#343942", "#6a717c", "#b89032", "#e0c76f", "#e6e8ec"] },
  { key: "white-graphite", name: "클린 화이트 그래파이트", colors: ["#20272d", "#343e46", "#66727c", "#138a8a", "#d6a75f", "#f2f4f5"] },
  { key: "cocoa-taupe", name: "코코아 토프", colors: ["#302a28", "#66544b", "#8b7468", "#b77b55", "#dfc4a7", "#eee8e4"] },
  { key: "steel-platinum", name: "스틸 플래티넘", colors: ["#24303b", "#44647a", "#6d8899", "#4c9aaa", "#c9d6de", "#e7edf1"] },
];

export function applyTheme(key: string, animate = false) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add("theme-switching");
    window.setTimeout(() => root.classList.remove("theme-switching"), 420);
  }
  if (!key || key === DEFAULT_THEME) root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", key);
}

/** Inline script for <head>: applies the saved theme before first paint. */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t&&t!=="${DEFAULT_THEME}")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
