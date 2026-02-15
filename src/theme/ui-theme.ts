import { UiTheme } from "@/src/types";

export interface ThemeTokens {
  id: UiTheme;
  name: string;
  mapBase: string;
  safeArea: string;
  accent: string;
  topPillBg: string;
  topPillBorder: string;
  topPillText: string;
  iconCircleBg: string;
  iconCircleText: string;
  chatSheetBg: string;
  chatSheetBorder: string;
  chatHeaderText: string;
  chatHandle: string;
  sheetTitle: string;
  previewCardBg: string;
  previewCardBorder: string;
  previewText: string;
  previewSubtext: string;
  fabBg: string;
  fabText: string;
  askBarBg: string;
  askBarBorder: string;
  askBarInputBg: string;
  askBarInputText: string;
}

export const THEME_TOKENS: Record<UiTheme, ThemeTokens> = {
  classic: {
    id: "classic",
    name: "Classic Green",
    mapBase: "#7ec850",
    safeArea: "#7ec850",
    accent: "#22c55e",
    topPillBg: "rgba(255,255,255,0.93)",
    topPillBorder: "rgba(255,255,255,0.45)",
    topPillText: "#111827",
    iconCircleBg: "rgba(17,24,39,0.22)",
    iconCircleText: "#ffffff",
    chatSheetBg: "rgba(255,255,255,0.88)",
    chatSheetBorder: "rgba(255,255,255,0.6)",
    chatHeaderText: "#64748b",
    chatHandle: "#9ca3af",
    sheetTitle: "#0f172a",
    previewCardBg: "rgba(15,23,42,0.25)",
    previewCardBorder: "rgba(255,255,255,0.15)",
    previewText: "#f8fafc",
    previewSubtext: "#e2e8f0",
    fabBg: "#22c55e",
    fabText: "#ffffff",
    askBarBg: "rgba(255,255,255,0.94)",
    askBarBorder: "rgba(148,163,184,0.35)",
    askBarInputBg: "#f8fafc",
    askBarInputText: "#475569",
  },
  neo: {
    id: "neo",
    name: "Neon Glass",
    mapBase: "#090616",
    safeArea: "#090616",
    accent: "#22c55e",
    topPillBg: "rgba(31,30,47,0.86)",
    topPillBorder: "rgba(255,255,255,0.16)",
    topPillText: "rgba(248,250,252,0.94)",
    iconCircleBg: "rgba(38,37,57,0.78)",
    iconCircleText: "#f8fafc",
    chatSheetBg: "rgba(18,15,32,0.95)",
    chatSheetBorder: "rgba(255,255,255,0.1)",
    chatHeaderText: "rgba(148,163,184,0.94)",
    chatHandle: "rgba(148,163,184,0.72)",
    sheetTitle: "rgba(248,250,252,0.92)",
    previewCardBg: "rgba(15,23,42,0.45)",
    previewCardBorder: "rgba(255,255,255,0.16)",
    previewText: "#e2e8f0",
    previewSubtext: "#94a3b8",
    fabBg: "#22c55e",
    fabText: "#ffffff",
    askBarBg: "rgba(33,31,47,0.82)",
    askBarBorder: "rgba(255,255,255,0.15)",
    askBarInputBg: "rgba(16,15,27,0.9)",
    askBarInputText: "rgba(226,232,240,0.84)",
  },
};

export function getThemeTokens(theme: UiTheme) {
  return THEME_TOKENS[theme];
}
