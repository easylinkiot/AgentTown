import { AppLanguage } from "@/src/types";

export function tx(language: AppLanguage, zh: string, en: string) {
  return language === "zh" ? zh : en;
}
