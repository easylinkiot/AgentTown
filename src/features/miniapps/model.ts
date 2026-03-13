import { MiniApp } from "@/src/types";

export type MiniAppUIType =
  | "news_feed"
  | "flashcard"
  | "price_tracker"
  | "dashboard"
  | "task_list"
  | "generative_app"
  | "fashion_designer"
  | "car_caring"
  | "generic";

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

export type TaskListEntry = {
  id: string;
  title: string;
  assignee: string;
  priority: "High" | "Medium" | "Low";
  status: "Pending" | "In Progress" | "Done";
};

export type GenerativeWidget = {
  type: "stat" | "button" | "toggle" | "list" | "chart" | "text";
  label: string;
  value?: string | number | boolean;
  subValue?: string;
  icon?: string;
  color?: string;
  data?: unknown[];
  action?: string;
};

export type FashionDesignerData = {
  title: string;
  inspiration: string;
  palette: string[];
  materials: string[];
  steps: string[];
  looks: { label: string; description: string }[];
  renders: { label: string; image: string }[];
};

export type CarCaringData = {
  carName: string;
  message: string;
  actions: string[];
  stats: {
    cleanliness: number;
    fuel: number;
    health: number;
  };
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
  taskItems: TaskListEntry[];
  widgets: GenerativeWidget[];
  fashionDesigner: FashionDesignerData;
  carCaring: CarCaringData;
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

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
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
  if (
    normalized === "news_feed" ||
    normalized === "flashcard" ||
    normalized === "price_tracker" ||
    normalized === "dashboard" ||
    normalized === "task_list" ||
    normalized === "generative_app" ||
    normalized === "fashion_designer" ||
    normalized === "car_caring"
  ) {
    return normalized;
  }
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
        trendRaw === "up" || trendRaw === "down" || trendRaw === "stable" ? trendRaw : "stable";
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
        trendRaw === "up" || trendRaw === "down" || trendRaw === "stable" ? trendRaw : "stable";
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

function parseTaskItems(value: unknown): TaskListEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const obj = asRecord(item);
      const priorityRaw = asString(obj.priority, "Medium");
      const statusRaw = asString(obj.status, "Pending");
      const priority: TaskListEntry["priority"] =
        priorityRaw === "High" || priorityRaw === "Medium" || priorityRaw === "Low" ? priorityRaw : "Medium";
      const status: TaskListEntry["status"] =
        statusRaw === "Pending" || statusRaw === "In Progress" || statusRaw === "Done" ? statusRaw : "Pending";
      return {
        id: asString(obj.id, `task_${index}`),
        title: asString(obj.title, "Task"),
        assignee: asString(obj.assignee, "Owner"),
        priority,
        status,
      };
    })
    .filter((item) => !!item.title);
}

function parseWidgets(value: unknown): GenerativeWidget[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const obj = asRecord(item);
      const typeRaw = asString(obj.type, "text");
      const type: GenerativeWidget["type"] =
        typeRaw === "stat" ||
        typeRaw === "button" ||
        typeRaw === "toggle" ||
        typeRaw === "list" ||
        typeRaw === "chart" ||
        typeRaw === "text"
          ? typeRaw
          : "text";
      return {
        type,
        label: asString(obj.label, "Widget"),
        value: typeof obj.value === "boolean" ? obj.value : typeof obj.value === "number" ? obj.value : asString(obj.value, ""),
        subValue: asString(obj.subValue, ""),
        icon: asString(obj.icon, ""),
        color: asString(obj.color, ""),
        data: Array.isArray(obj.data) ? obj.data : [],
        action: asString(obj.action, ""),
      };
    })
    .filter((item) => !!item.label);
}

function parseFashionDesigner(value: unknown): FashionDesignerData {
  const obj = asRecord(value);
  const looksRaw = Array.isArray(obj.looks) ? obj.looks : [];
  const rendersRaw = Array.isArray(obj.renders) ? obj.renders : [];
  return {
    title: asString(obj.title, "Concept Capsule"),
    inspiration: asString(obj.inspiration, "Generate an editorial concept from your brief."),
    palette: asStringList(obj.palette),
    materials: asStringList(obj.materials),
    steps: asStringList(obj.steps),
    looks: looksRaw.map((item, index) => {
      const next = asRecord(item);
      return {
        label: asString(next.label, `Look ${index + 1}`),
        description: asString(next.description, ""),
      };
    }),
    renders: rendersRaw.map((item, index) => {
      const next = asRecord(item);
      return {
        label: asString(next.label, `Board ${index + 1}`),
        image: asString(next.image, ""),
      };
    }),
  };
}

function parseCarCaring(value: unknown): CarCaringData {
  const obj = asRecord(value);
  const stats = asRecord(obj.stats);
  return {
    carName: asString(obj.carName, "My Car"),
    message: asString(obj.message, "Ready to care for your car."),
    actions: asStringList(obj.actions),
    stats: {
      cleanliness: asNumber(stats.cleanliness, 50),
      fuel: asNumber(stats.fuel, 50),
      health: asNumber(stats.health, 80),
    },
  };
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
  return asUIType(asString(app.type || app.category, ""));
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
    case "task_list":
      return "checkmark-done-outline";
    case "generative_app":
      return "sparkles-outline";
    case "fashion_designer":
      return "shirt-outline";
    case "car_caring":
      return "car-sport-outline";
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
    case "task_list":
      return "#22c55e";
    case "generative_app":
      return "#a855f7";
    case "fashion_designer":
      return "#ec4899";
    case "car_caring":
      return "#3b82f6";
    default:
      return "#64748b";
  }
}

export function buildMiniAppViewModel(app: MiniApp): MiniAppViewModel {
  const preview = asRecord(app.preview);
  const content = asRecord(app.content || preview.content);
  const lastRun = asRecord(preview.lastRun);
  const lastRunData = asRecord(lastRun.outputData);
  const lastRunContent = asRecord(lastRunData.content);

  const fromRecord = asUIType(asString(app.type, ""));
  const fromPreview = asUIType(asString(preview.uiType, ""));
  const fromRun = asUIType(asString(lastRunData.uiType, ""));
  const candidateType =
    fromRecord !== "generic"
      ? fromRecord
      : fromPreview === "generic"
        ? fromRun
        : fromPreview;
  const resolvedType = candidateType === "generic" ? fallbackUIType(app) : candidateType;

  const newsSource = Array.isArray(lastRunContent.items) ? lastRunContent.items : Array.isArray(lastRunData.items) ? lastRunData.items : content.items;
  const priceSource = Array.isArray(lastRunContent.items) ? lastRunContent.items : Array.isArray(lastRunData.items) ? lastRunData.items : content.items;
  const flashcardSource =
    Object.keys(asRecord(lastRunContent.card)).length > 0
      ? lastRunContent.card
      : Object.keys(asRecord(lastRunData.card)).length > 0
        ? lastRunData.card
        : content.card;
  const dashboardSource =
    Array.isArray(lastRunContent.panels) ? lastRunContent.panels : Array.isArray(lastRunData.panels) ? lastRunData.panels : content.panels;
  const taskSource = Array.isArray(lastRunContent.items) ? lastRunContent.items : Array.isArray(lastRunData.items) ? lastRunData.items : content.items;
  const widgetsSource =
    Array.isArray(lastRunContent.widgets) ? lastRunContent.widgets : Array.isArray(lastRunData.widgets) ? lastRunData.widgets : content.widgets;
  const fashionSource =
    Object.keys(asRecord(lastRunContent.design)).length > 0
      ? lastRunContent.design
      : Object.keys(asRecord(lastRunData.design)).length > 0
        ? lastRunData.design
        : content.design;
  const carSource =
    Object.keys(asRecord(lastRunContent.game)).length > 0
      ? lastRunContent.game
      : Object.keys(asRecord(lastRunData.game)).length > 0
        ? lastRunData.game
        : content.game;
  const blockSource = Array.isArray(lastRunContent.blocks) ? lastRunContent.blocks : Array.isArray(lastRunData.blocks) ? lastRunData.blocks : content.blocks;

  return {
    uiType: resolvedType,
    icon: asString(app.icon, asString(preview.icon, iconForType(resolvedType))),
    color: asString(app.color, asString(preview.color, colorForType(resolvedType))),
    description: asString(app.description, asString(preview.description, app.summary || "")),
    heroImage: asString(
      preview.heroImage,
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=60"
    ),
    newsItems: parseNews(newsSource),
    flashcard: parseFlashcard(flashcardSource),
    priceItems: parsePrice(priceSource),
    dashboardPanels: parsePanels(dashboardSource),
    taskItems: parseTaskItems(taskSource),
    widgets: parseWidgets(widgetsSource),
    fashionDesigner: parseFashionDesigner(fashionSource),
    carCaring: parseCarCaring(carSource),
    genericBlocks: parseBlocks(blockSource),
    lastRunOutput: asString(lastRun.output, ""),
  };
}

export function asToggleValue(widget: GenerativeWidget) {
  return asBoolean(widget.value, false);
}

export function getMiniAppUIType(app: MiniApp): MiniAppUIType {
  return buildMiniAppViewModel(app).uiType;
}

export function getMiniAppContent(app: MiniApp): Record<string, unknown> {
  return asRecord(app.content || asRecord(app.preview).content);
}
