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
    askBarBg: "transparent",
    askBarBorder: "transparent",
    askBarInputBg: "transparent",
    askBarInputText: "transparent",
  },
  neo: {
    id: "neo",
    name: "Neon Glass",
    mapBase: "#06080f",
    safeArea: "#020307",
    accent: "#22c55e",
    topPillBg: "rgba(18,22,34,0.78)",
    topPillBorder: "rgba(255,255,255,0.15)",
    topPillText: "#f8fafc",
    iconCircleBg: "rgba(255,255,255,0.1)",
    iconCircleText: "#f8fafc",
    chatSheetBg: "rgba(20,22,30,0.9)",
    chatSheetBorder: "rgba(255,255,255,0.13)",
    chatHeaderText: "rgba(226,232,240,0.8)",
    chatHandle: "rgba(255,255,255,0.35)",
    sheetTitle: "#f8fafc",
    previewCardBg: "rgba(15,23,42,0.45)",
    previewCardBorder: "rgba(255,255,255,0.16)",
    previewText: "#e2e8f0",
    previewSubtext: "#94a3b8",
    fabBg: "#22c55e",
    fabText: "#ffffff",
    askBarBg: "rgba(20,22,30,0.78)",
    askBarBorder: "rgba(255,255,255,0.15)",
    askBarInputBg: "rgba(2,6,23,0.6)",
    askBarInputText: "rgba(226,232,240,0.8)",
  },
};

export function getThemeTokens(theme: UiTheme) {
  return THEME_TOKENS[theme];
}

