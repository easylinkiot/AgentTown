import { AppLanguage, MiniApp, MiniAppTemplate } from "@/src/types";

export type MiniToolCatalogSource = "preset" | "template";

export type MiniToolCatalogItem = {
  id: string;
  sourceType: MiniToolCatalogSource;
  title: string;
  description: string;
  category: string;
  icon: string;
  accentColor: string;
  query: string;
  sources: string[];
  presetKey?: "news" | "price" | "words";
  templateId?: string;
  previewUiType?: string;
  linkedApp: MiniApp | null;
  installedApp: MiniApp | null;
  searchText: string;
};

type LocalPreset = {
  id: "news" | "price" | "words";
  icon: string;
  accentColor: string;
  category: string;
  zhTitle: string;
  enTitle: string;
  zhDescription: string;
  enDescription: string;
  zhQuery: string;
  enQuery: string;
  sources: string[];
  previewUiType: string;
};

const PRESETS: LocalPreset[] = [
  {
    id: "news",
    icon: "newspaper-outline",
    accentColor: "#3b82f6",
    category: "news",
    zhTitle: "AI 早报",
    enTitle: "AI Brief",
    zhDescription: "每 2 小时采集热点 AI 新闻，生成头条与快讯卡片。",
    enDescription: "Collect AI headlines every 2 hours and generate a poster brief.",
    zhQuery:
      "生成一个新闻早报 Mini App：每2小时采集 Reddit、TechCrunch、GitHub Trending 的 AI 热点。海报包含头条主卡（热度分）、4条快讯、主题标签、关键洞察和今日行动建议。",
    enQuery:
      "Build a news mini app that collects AI headlines from Reddit, TechCrunch and GitHub Trending every 2 hours. Poster should include one hero headline card with heat score, 4 quick briefs, topic tags, key insight, and one action hint.",
    sources: ["reddit", "techcrunch", "github"],
    previewUiType: "news_feed",
  },
  {
    id: "price",
    icon: "pricetag-outline",
    accentColor: "#f97316",
    category: "shopping",
    zhTitle: "历史比价",
    enTitle: "Price Radar",
    zhDescription: "追踪收藏商品的价格变化，在历史低价时提醒。",
    enDescription: "Track saved products and alert on new all-time lows.",
    zhQuery:
      "生成一个比价 Mini App：追踪我收藏的商品，出现历史低价时提醒。海报展示商品现价/原价、折扣百分比、趋势箭头、门店信息和购买建议。",
    enQuery:
      "Build a price tracker mini app that watches saved products and alerts on new all-time lows. Poster should show current vs original price, discount percentage, trend arrow, retailer, and buy/hold advice.",
    sources: ["shopping", "deals"],
    previewUiType: "price_tracker",
  },
  {
    id: "words",
    icon: "book-outline",
    accentColor: "#8b5cf6",
    category: "learning",
    zhTitle: "每日单词",
    enTitle: "Word Card",
    zhDescription: "高阶词卡、发音、例句与翻面记忆小测。",
    enDescription: "Advanced vocabulary with pronunciation, examples, and flip quiz.",
    zhQuery:
      "生成一个英语背单词 Mini App：每天随机生成高阶词，提供美式发音、同义/反义词、例句、记忆口诀和小测题，并支持翻面记忆海报。",
    enQuery:
      "Build a daily vocabulary mini app: word of the day with pronunciation, synonyms/antonyms, example sentence, memory tip, and quiz line in a flip-to-reveal poster layout.",
    sources: ["dictionary", "learning"],
    previewUiType: "flashcard",
  },
];

function localize(language: AppLanguage, zh: string, en: string) {
  return language === "zh" ? zh : en;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function bestMatchForCatalog(miniApps: MiniApp[], item: { presetKey?: string; query: string }) {
  const normalizedQuery = normalizeText(item.query);
  const matches = miniApps.filter((app) => {
    if (item.presetKey && normalizeText(app.presetKey || "") === item.presetKey) {
      return true;
    }
    return normalizeText(app.query || "") === normalizedQuery;
  });
  if (matches.length === 0) return null;
  const installed = matches.find((app) => app.installed);
  if (installed) return installed;
  return matches
    .slice()
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))[0] || null;
}

function templateIcon(template: MiniAppTemplate) {
  return template.icon || "apps-outline";
}

function templateAccent(template: MiniAppTemplate) {
  return template.accentColor || "#38bdf8";
}

export function buildMiniToolCatalog(
  language: AppLanguage,
  miniApps: MiniApp[],
  miniAppTemplates: MiniAppTemplate[]
): MiniToolCatalogItem[] {
  const presetItems = PRESETS.map((preset) => {
    const linkedApp = bestMatchForCatalog(miniApps, {
      presetKey: preset.id,
      query: localize(language, preset.zhQuery, preset.enQuery),
    });
    const title = localize(language, preset.zhTitle, preset.enTitle);
    const description = localize(language, preset.zhDescription, preset.enDescription);
    return {
      id: `preset:${preset.id}`,
      sourceType: "preset" as const,
      title,
      description,
      category: preset.category,
      icon: preset.icon,
      accentColor: preset.accentColor,
      query: localize(language, preset.zhQuery, preset.enQuery),
      sources: preset.sources,
      presetKey: preset.id,
      previewUiType: preset.previewUiType,
      linkedApp,
      installedApp: linkedApp?.installed ? linkedApp : null,
      searchText: normalizeText(`${title} ${description} ${preset.category} ${preset.id}`),
    };
  });

  const templateItems = miniAppTemplates
    .filter((template) => template.query && template.query.trim())
    .map((template) => {
      const linkedApp = bestMatchForCatalog(miniApps, { query: template.query || "" });
      const title = template.name;
      const description = template.description;
      return {
        id: `template:${template.id}`,
        sourceType: "template" as const,
        title,
        description,
        category: template.category,
        icon: templateIcon(template),
        accentColor: templateAccent(template),
        query: template.query || "",
        sources: template.sources || [],
        templateId: template.id,
        previewUiType: template.previewUiType,
        linkedApp,
        installedApp: linkedApp?.installed ? linkedApp : null,
        searchText: normalizeText(
          `${title} ${description} ${template.category} ${template.id} ${template.query || ""} ${(template.sources || []).join(" ")}`
        ),
      };
    });

  return [...presetItems, ...templateItems];
}

export function filterMiniToolCatalog(items: MiniToolCatalogItem[], query: string) {
  const safe = normalizeText(query);
  if (!safe) return items;
  return items.filter((item) => item.searchText.includes(safe));
}
