import { MiniApp } from "@/src/types";

export type MiniAppUIType = "news_feed" | "flashcard" | "price_tracker" | "dashboard" | "generic";

export type NewsFeedItem = {
  id: string;
  title: string;
  source: string;
  time: string;
  summary: string;
  tag?: string;
  heat: number;
  insight: string;
};

export type FlashcardData = {
  word: string;
  pronunciation: string;
  definition: string;
  synonyms: string[];
  antonyms: string[];
  example: string;
  memoryTip: string;
  collocations: string[];
  quiz: string;
};

export type PriceTrackerItem = {
  id: string;
  product: string;
  price: number;
  originalPrice: number;
  trend: "up" | "down" | "stable";
  retailer: string;
  discountPct: number;
  note: string;
};

export type DashboardPanel = {
  id: string;
  label: string;
  value: number;
  delta: string;
  trend: "up" | "down" | "stable";
};

export type GenericBlock = {
  id: string;
  kind: "title" | "paragraph" | "list" | "stats" | "chips" | "json";
  text?: string;
  items?: Record<string, unknown>[];
  value?: Record<string, unknown>;
};

export type MiniAppViewModel = {
  uiType: MiniAppUIType;
  icon: string;
  color: string;
  description: string;
  heroImage: string;
  newsItems: NewsFeedItem[];
  flashcard: FlashcardData;
  priceItems: PriceTrackerItem[];
  dashboardPanels: DashboardPanel[];
  genericBlocks: GenericBlock[];
  lastRunOutput: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  const next = value.trim();
  return next || fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item, ""))
    .filter((item) => !!item);
}

function asUIType(value: string): MiniAppUIType {
  const normalized = value.trim().toLowerCase();
  if (normalized === "news_feed") return "news_feed";
  if (normalized === "flashcard") return "flashcard";
  if (normalized === "price_tracker") return "price_tracker";
  if (normalized === "dashboard") return "dashboard";
  return "generic";
}

function parseNews(value: unknown): NewsFeedItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const obj = asRecord(item);
      return {
        id: asString(obj.id, `news_${index}`),
        title: asString(obj.title, "Untitled"),
        source: asString(obj.source, "Source"),
        time: asString(obj.time, "Now"),
        summary: asString(obj.summary, ""),
        tag: asString(obj.tag, ""),
        heat: Math.max(0, Math.min(100, Math.round(asNumber(obj.heat, 72)))),
        insight: asString(obj.insight, ""),
      };
    })
    .filter((item) => !!item.title);
}

function parseFlashcard(value: unknown): FlashcardData {
  const obj = asRecord(value);
  return {
    word: asString(obj.word, "Word"),
    pronunciation: asString(obj.pronunciation, ""),
    definition: asString(obj.definition, "No definition"),
    synonyms: asStringList(obj.synonyms),
    antonyms: asStringList(obj.antonyms),
    example: asString(obj.example, ""),
    memoryTip: asString(obj.memoryTip, ""),
    collocations: asStringList(obj.collocations),
    quiz: asString(obj.quiz, ""),
  };
}

function parsePrice(value: unknown): PriceTrackerItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const obj = asRecord(item);
      const trendRaw = asString(obj.trend, "stable").toLowerCase();
      const trend: "up" | "down" | "stable" =
        trendRaw === "up" || trendRaw === "down" || trendRaw === "stable"
          ? trendRaw
          : "stable";
      return {
        id: asString(obj.id, `price_${index}`),
        product: asString(obj.product, "Item"),
        price: asNumber(obj.price, 0),
        originalPrice: asNumber(obj.originalPrice, 0),
        trend,
        retailer: asString(obj.retailer, "Store"),
        discountPct: Math.max(0, Math.round(asNumber(obj.discountPct, 0))),
        note: asString(obj.note, ""),
      };
    })
    .filter((item) => !!item.product);
}

function parsePanels(value: unknown): DashboardPanel[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const obj = asRecord(item);
      const trendRaw = asString(obj.trend, "stable").toLowerCase();
      const trend: "up" | "down" | "stable" =
        trendRaw === "up" || trendRaw === "down" || trendRaw === "stable"
          ? trendRaw
          : "stable";
      return {
        id: asString(obj.id, `panel_${index}`),
        label: asString(obj.label, "Metric"),
        value: asNumber(obj.value, 0),
        delta: asString(obj.delta, "0"),
        trend,
      };
    })
    .filter((item) => !!item.label);
}

function parseBlocks(value: unknown): GenericBlock[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const obj = asRecord(item);
      const kindRaw = asString(obj.kind, "paragraph").toLowerCase();
      const kind: GenericBlock["kind"] =
        kindRaw === "title" ||
        kindRaw === "paragraph" ||
        kindRaw === "list" ||
        kindRaw === "stats" ||
        kindRaw === "chips" ||
        kindRaw === "json"
          ? kindRaw
          : "paragraph";
      const items = Array.isArray(obj.items) ? (obj.items as Record<string, unknown>[]) : undefined;
      const value = asRecord(obj.value);
      return {
        id: asString(obj.id, `block_${index}`),
        kind,
        text: asString(obj.text, ""),
        items,
        value: Object.keys(value).length ? value : undefined,
      };
    })
    .filter((item) => !!item.id);
}

function fallbackUIType(app: MiniApp): MiniAppUIType {
  return asUIType(asString(app.category, ""));
}

function iconForType(type: MiniAppUIType): string {
  switch (type) {
    case "news_feed":
      return "newspaper-outline";
    case "flashcard":
      return "book-outline";
    case "price_tracker":
      return "pricetag-outline";
    case "dashboard":
      return "grid-outline";
    default:
      return "apps-outline";
  }
}

function colorForType(type: MiniAppUIType): string {
  switch (type) {
    case "news_feed":
      return "#3b82f6";
    case "flashcard":
      return "#8b5cf6";
    case "price_tracker":
      return "#f97316";
    case "dashboard":
      return "#22c55e";
    default:
      return "#64748b";
  }
}

export function buildMiniAppViewModel(app: MiniApp): MiniAppViewModel {
  const preview = asRecord(app.preview);
  const content = asRecord(preview.content);
  const lastRun = asRecord(preview.lastRun);
  const lastRunData = asRecord(lastRun.outputData);

  const fromPreview = asUIType(asString(preview.uiType, ""));
  const fromRun = asUIType(asString(lastRunData.uiType, ""));
  const candidateType = fromPreview === "generic" ? fromRun : fromPreview;
  const resolvedType = candidateType === "generic" ? fallbackUIType(app) : candidateType;

  const newsSource = Array.isArray(lastRunData.items) ? lastRunData.items : content.items;
  const priceSource = Array.isArray(lastRunData.items) ? lastRunData.items : content.items;
  const flashcardSource = Object.keys(asRecord(lastRunData.card)).length > 0 ? lastRunData.card : content.card;
  const dashboardSource = Array.isArray(lastRunData.panels) ? lastRunData.panels : content.panels;
  const blockSource = Array.isArray(lastRunData.blocks) ? lastRunData.blocks : content.blocks;

  return {
    uiType: resolvedType,
    icon: asString(preview.icon, iconForType(resolvedType)),
    color: asString(preview.color, colorForType(resolvedType)),
    description: asString(preview.description, app.summary || ""),
    heroImage: asString(
      preview.heroImage,
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=60"
    ),
    newsItems: parseNews(newsSource),
    flashcard: parseFlashcard(flashcardSource),
    priceItems: parsePrice(priceSource),
    dashboardPanels: parsePanels(dashboardSource),
    genericBlocks: parseBlocks(blockSource),
    lastRunOutput: asString(lastRun.output, ""),
  };
}
