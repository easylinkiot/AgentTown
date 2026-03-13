import { MiniApp } from "@/src/types";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export function extractMiniAppRuntimeContent(outputData?: Record<string, unknown> | null): Record<string, unknown> {
  const next = asRecord(outputData);
  const explicitContent = asRecord(next.content);
  const merged: Record<string, unknown> = Object.keys(explicitContent).length > 0 ? { ...explicitContent } : {};
  const contentKeys = ["items", "card", "panels", "widgets", "design", "game", "blocks", "theme", "heroImage"];

  for (const key of contentKeys) {
    if (key in next) {
      merged[key] = next[key];
    }
  }

  return merged;
}

export function mergeMiniAppRuntimeContent(app: MiniApp, outputData?: Record<string, unknown> | null): Record<string, unknown> {
  return {
    ...asRecord(app.content),
    ...extractMiniAppRuntimeContent(outputData),
  };
}

export function getMiniAppRuntimeType(app: MiniApp, outputData?: Record<string, unknown> | null) {
  const next = asRecord(outputData);
  if (typeof next.uiType === "string" && next.uiType.trim()) {
    return next.uiType.trim();
  }
  return app.type;
}
