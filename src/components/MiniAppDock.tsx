import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { tx } from "@/src/i18n/translate";
import { generateGeminiJson } from "@/src/lib/gemini";
import { AppLanguage, TaskItem, UiTheme } from "@/src/types";

interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  prompt: string;
}

interface GeneratorExample {
  id: string;
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  prompt: string;
}

type MiniAppType = "news_feed" | "flashcard" | "price_tracker";

interface NewsItem {
  title: string;
  source: string;
  summary: string;
}

interface PriceItem {
  product: string;
  retailer: string;
  price: number;
  trend: "up" | "down" | "stable";
}

interface MiniAppCard {
  id: string;
  title: string;
  type: MiniAppType;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  shortcutId?: string;
  description: string;
  heroImage: string;
  newsItems?: NewsItem[];
  flashcard?: {
    word: string;
    pronunciation: string;
    definition: string;
    example: string;
  };
  priceItems?: PriceItem[];
}

let persistedInstalledApps: MiniAppCard[] = [];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

interface MiniAppDockProps {
  accentColor: string;
  theme?: UiTheme;
  language?: AppLanguage;
  onOpenChat: () => void;
  tasks: TaskItem[];
  onTaskPanelVisibilityChange?: (visible: boolean) => void;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "focus",
    label: "关注",
    icon: "newspaper-outline",
    prompt: "生成一个新闻Mini App，每2个小时采集Reddit, Github, 排名前100的美国和中国科技媒体的热点AI新闻。",
  },
  {
    id: "price",
    label: "比价",
    icon: "pricetag-outline",
    prompt: "生成一个降价猎手 Mini App，追踪收藏品牌价格变化并输出最低价提醒。",
  },
  {
    id: "words",
    label: "单词",
    icon: "book-outline",
    prompt: "生成一个每日单词打卡 Mini App，支持发音、释义和翻面学习。",
  },
  {
    id: "tasks",
    label: "待办",
    icon: "checkmark-done-outline",
    prompt: "生成一个任务象限 Mini App，按紧急重要度自动排序并输出执行建议。",
  },
  {
    id: "food",
    label: "点餐",
    icon: "restaurant-outline",
    prompt: "生成一个餐饮预定 Mini App，监控未来一周热门餐厅空位并支持一键预定。",
  },
  {
    id: "calendar",
    label: "日程",
    icon: "calendar-outline",
    prompt: "生成一个社交日历 Mini App，识别邀请并给出优先级与提醒。",
  },
];

const GENERATOR_EXAMPLES: GeneratorExample[] = [
  {
    id: "news",
    title: "阅读早报",
    desc: "每天早上 8 点，采集 Reddit、TechCrunch 等过去 24 小时 AI 热点新闻，生成摘要卡片。",
    icon: "newspaper-outline",
    prompt:
      "生成一个阅读早报 Mini App：每天早上 8 点，采集 Reddit、TechCrunch 和机器之心过去 24 小时 AI 热点并生成摘要。",
  },
  {
    id: "chat-summary",
    title: "Chat 决策摘要",
    desc: "自动汇总群聊中过去 2 小时讨论，提取共识和待分配任务。",
    icon: "chatbox-ellipses-outline",
    prompt:
      "生成一个聊天决策摘要 Mini App，自动汇总群聊中过去 2 小时讨论，提取结论和待办。",
  },
  {
    id: "mail",
    title: "收件箱脱水",
    desc: "扫描过去 24 小时未读邮件，输出谁发了什么、需要我做什么。",
    icon: "mail-unread-outline",
    prompt:
      "生成一个收件箱脱水 Mini App：每天扫描未读邮件，结构化输出发件人、核心信息、需要动作和截止日期。",
  },
  {
    id: "follow-up",
    title: "未回复随访",
    desc: "标记已发送但对方超过 3 天未回复的重要邮件，生成跟进建议。",
    icon: "time-outline",
    prompt:
      "生成一个未回复随访 Mini App，自动识别超过 3 天未回复的重要对话并给出跟进建议。",
  },
  {
    id: "words",
    title: "每日单词打卡",
    desc: "每日生成高阶词，美式发音、释义和例句。",
    icon: "book-outline",
    prompt: "生成一个每日单词打卡 Mini App，支持发音、释义、例句与翻面记忆。",
  },
  {
    id: "milestone",
    title: "项目倒计时",
    desc: "提取日历里程碑并可视化显示交付剩余天数与延期风险。",
    icon: "hourglass-outline",
    prompt:
      "生成一个项目倒计时 Mini App，将日历里的里程碑转换成剩余天数和延期风险提示卡片。",
  },
  {
    id: "security",
    title: "车辆守卫",
    desc: "检测到非授权移动时，弹出坐标与远程报警快捷入口。",
    icon: "shield-checkmark-outline",
    prompt:
      "生成一个车辆守卫 Mini App，当检测到异常移动时推送定位并提供远程报警按钮。",
  },
  {
    id: "home",
    title: "智能家居",
    desc: "一句话自动调整灯光、窗帘和空调温度。",
    icon: "home-outline",
    prompt:
      "生成一个智能家居 Mini App，通过一句话场景描述自动调整灯光、窗帘和空调。",
  },
  {
    id: "price",
    title: "降价猎手",
    desc: "监控品牌 24 小时最低价并自动尝试领券。",
    icon: "pricetag-outline",
    prompt: "生成一个降价猎手 Mini App，监控品牌价格并给出最低价提醒和领券建议。",
  },
  {
    id: "foodbook",
    title: "餐饮预定",
    desc: "监控热门餐厅空位，一旦出现立即生成是否预定卡片。",
    icon: "restaurant-outline",
    prompt: "生成一个餐饮预定 Mini App，监控热门餐厅空位并支持一键预定。",
  },
  {
    id: "fitness",
    title: "健身进度",
    desc: "同步运动数据，把消耗卡路里换算成可摄入餐食量。",
    icon: "pulse-outline",
    prompt: "生成一个健身进度 Mini App，同步运动数据并输出本周饮食建议。",
  },
  {
    id: "sync",
    title: "跨平台同步",
    desc: "将 Google Tasks、收藏和笔记待办聚合到一张卡片。",
    icon: "sync-outline",
    prompt:
      "生成一个跨平台同步 Mini App，汇总 Google Tasks、消息收藏和笔记中的待办事项。",
  },
];

function quickActionLabel(id: string, language: AppLanguage) {
  const zhMap: Record<string, string> = {
    focus: "关注",
    price: "比价",
    words: "单词",
    tasks: "待办",
    food: "点餐",
    calendar: "日程",
  };
  const enMap: Record<string, string> = {
    focus: "News",
    price: "Price",
    words: "Words",
    tasks: "Tasks",
    food: "Food",
    calendar: "Calendar",
  };
  return language === "zh" ? zhMap[id] || id : enMap[id] || id;
}

function quickActionPrompt(id: string, language: AppLanguage) {
  if (language === "zh") {
    return QUICK_ACTIONS.find((item) => item.id === id)?.prompt || "";
  }
  const enMap: Record<string, string> = {
    focus:
      "Generate a news mini app that collects trending AI stories from Reddit, GitHub, and top US/China tech media every 2 hours.",
    price:
      "Generate a price tracker mini app that watches favorite brands and reports the lowest available prices.",
    words:
      "Generate a daily vocabulary mini app with pronunciation, definition, and spaced learning cards.",
    tasks:
      "Generate an Eisenhower matrix mini app that ranks tasks by urgency and importance.",
    food:
      "Generate a dining booking mini app that monitors table availability and allows one-tap reservation.",
    calendar:
      "Generate a social calendar mini app that extracts invitations and creates smart reminders.",
  };
  return enMap[id] || "";
}

function quickActionAppColor(id: string) {
  const map: Record<string, string> = {
    focus: "#3b82f6",
    price: "#f97316",
    words: "#8b5cf6",
    tasks: "#22c55e",
    food: "#ef4444",
    calendar: "#06b6d4",
  };
  return map[id] || "#3b82f6";
}

function exampleTitle(item: GeneratorExample, language: AppLanguage) {
  if (language === "zh") return item.title;
  const map: Record<string, string> = {
    news: "Morning Brief",
    "chat-summary": "Chat Digest",
    mail: "Inbox Digest",
    "follow-up": "Follow-up Radar",
    words: "Word of the Day",
    milestone: "Milestone Timer",
    security: "Vehicle Guard",
    home: "Smart Home",
    price: "Price Hunter",
    foodbook: "Restaurant Book",
    fitness: "Fitness Tracker",
    sync: "Cross-platform Sync",
  };
  return map[item.id] || item.title;
}

function exampleDesc(item: GeneratorExample, language: AppLanguage) {
  if (language === "zh") return item.desc;
  const map: Record<string, string> = {
    news: "Collect top AI headlines from key sources every morning.",
    "chat-summary": "Summarize recent group discussion and extract action items.",
    mail: "Turn unread emails into structured actionable cards.",
    "follow-up": "Find important threads with no reply after 3+ days.",
    words: "Generate daily vocabulary cards with pronunciation and examples.",
    milestone: "Show delivery countdown and schedule risk at a glance.",
    security: "Trigger location + alert flow on unauthorized movement.",
    home: "Control lights, curtains and AC via one natural-language command.",
    price: "Track favorite products and detect new lowest prices.",
    foodbook: "Monitor table availability and reserve instantly.",
    fitness: "Sync activity and output calorie + diet guidance.",
    sync: "Merge tasks from notes, chats and cloud apps into one board.",
  };
  return map[item.id] || item.desc;
}

function examplePrompt(item: GeneratorExample, language: AppLanguage) {
  if (language === "zh") return item.prompt;
  const map: Record<string, string> = {
    news:
      "Build a morning brief mini app that summarizes top AI stories from Reddit, TechCrunch and major media every day at 8 AM.",
    "chat-summary":
      "Build a chat digest mini app that summarizes the last 2 hours of group discussion and extracts owners + tasks.",
    mail:
      "Build an inbox digest mini app that summarizes unread emails into who/what/action/deadline cards.",
    "follow-up":
      "Build a follow-up mini app that highlights important threads with no reply for more than 3 days.",
    words:
      "Build a daily vocabulary mini app with pronunciation, definition, and example sentence.",
    milestone:
      "Build a milestone countdown mini app to show days-to-delivery and schedule risk.",
    security:
      "Build a vehicle guard mini app that triggers location and alert actions on unauthorized movement.",
    home:
      "Build a smart-home mini app that adjusts lighting, curtains and AC from one voice command.",
    price:
      "Build a price-hunter mini app that monitors favorite products and alerts the new lowest price.",
    foodbook:
      "Build a dining booking mini app that watches seat availability and reserves with one tap.",
    fitness:
      "Build a fitness mini app that syncs workout data and outputs calorie + meal recommendations.",
    sync:
      "Build a cross-platform sync mini app that merges todos from chat, notes and cloud apps.",
  };
  return map[item.id] || item.prompt;
}

function inferType(prompt: string): MiniAppType {
  const q = prompt.toLowerCase();
  if (q.includes("单词") || q.includes("词汇") || q.includes("flash") || q.includes("学习")) {
    return "flashcard";
  }
  if (q.includes("价格") || q.includes("比价") || q.includes("降价") || q.includes("coupon")) {
    return "price_tracker";
  }
  return "news_feed";
}

function getTypeMeta(type: MiniAppType): {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  heroImage: string;
} {
  if (type === "flashcard") {
    return {
      icon: "book-outline",
      color: "#8b5cf6",
      heroImage:
        "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1000&auto=format&fit=crop",
    };
  }
  if (type === "price_tracker") {
    return {
      icon: "pricetag-outline",
      color: "#f97316",
      heroImage:
        "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?q=80&w=1000&auto=format&fit=crop",
    };
  }
  return {
    icon: "newspaper-outline",
    color: "#3b82f6",
    heroImage:
      "https://images.unsplash.com/photo-1495020689067-958852a7765e?q=80&w=1000&auto=format&fit=crop",
  };
}

function buildFallbackCard(prompt: string, language: AppLanguage = "en"): MiniAppCard {
  const type = inferType(prompt);
  const meta = getTypeMeta(type);
  const isZh = language === "zh";

  if (type === "flashcard") {
    return {
      id: `draft_${Date.now()}`,
      title: isZh ? "每日单词打卡" : "Word Sprint",
      type,
      icon: meta.icon,
      color: meta.color,
      heroImage: meta.heroImage,
      description: isZh
        ? "每日生成高频高阶词，支持发音、释义和例句。"
        : "Generate daily high-frequency vocabulary with pronunciation and examples.",
      flashcard: {
        word: isZh ? "Serendipity" : "Momentum",
        pronunciation: isZh ? "/ˌserənˈdɪpəti/" : "/məˈmentəm/",
        definition: isZh ? "意外发现珍贵事物的幸运能力。" : "The force that keeps growth moving forward.",
        example: isZh ? "We found this idea by pure serendipity." : "Our product gained strong momentum this quarter.",
      },
    };
  }

  if (type === "price_tracker") {
    return {
      id: `draft_${Date.now()}`,
      title: isZh ? "降价猎手" : "Price Hunter",
      type,
      icon: meta.icon,
      color: meta.color,
      heroImage: meta.heroImage,
      description: isZh
        ? "监控你关注品牌的最低价并自动给出提醒。"
        : "Track your saved products and alert the lowest available prices.",
      priceItems: [
        { product: "Lululemon Align", retailer: "Lulu CN", price: 499, trend: "down" },
        { product: "On Cloudmonster", retailer: "On Store", price: 1099, trend: "stable" },
        { product: "LEGO 42161", retailer: "JD", price: 349, trend: "down" },
      ],
    };
  }

  return {
    id: `draft_${Date.now()}`,
    title: isZh ? "AI 科技全景哨兵" : "AI News Radar",
    type,
    icon: meta.icon,
    color: meta.color,
    heroImage: meta.heroImage,
    description: isZh
      ? "实时聚合 Reddit、GitHub 及中美科技媒体的 AI 热点。"
      : "Aggregate AI headlines from Reddit, GitHub, and major media in real time.",
    newsItems: [
      {
        title: isZh
          ? "Reddit 热议：Meta 计划在下季度推出新模型"
          : "Reddit Buzz: Meta plans a new model next quarter",
        source: "Reddit",
        summary: isZh
          ? "开发者社区持续讨论模型参数与推理效率。"
          : "Developers are debating model scale and inference efficiency.",
      },
      {
        title: isZh
          ? "GitHub Trending: Open-Devin 项目活跃度上升"
          : "GitHub Trending: Open-Devin activity is rising",
        source: "GitHub",
        summary: isZh
          ? "开源 Agent 工程化能力进入新一轮迭代。"
          : "Open-source agent engineering is entering another acceleration cycle.",
      },
      {
        title: isZh
          ? "The Verge: OpenAI 语音交互模型进展"
          : "The Verge: OpenAI voice interaction model progress",
        source: "The Verge",
        summary: isZh
          ? "多模态交互体验成为产品落地关键方向。"
          : "Multimodal interaction is becoming a key product direction.",
      },
    ],
  };
}

function buildQuickActionApp(action: QuickAction, language: AppLanguage): MiniAppCard {
  const fallback = buildFallbackCard(quickActionPrompt(action.id, language), language);
  return {
    ...fallback,
    id: `quick_${action.id}`,
    title: quickActionLabel(action.id, language),
    icon: action.icon,
    color: quickActionAppColor(action.id),
    shortcutId: action.id,
  };
}

function normalizeGeneratedCard(raw: any, prompt: string, language: AppLanguage): MiniAppCard {
  const fallback = buildFallbackCard(prompt, language);
  if (!raw || typeof raw !== "object") return fallback;

  const type: MiniAppType =
    raw.type === "flashcard" || raw.type === "price_tracker" || raw.type === "news_feed"
      ? raw.type
      : fallback.type;

  const meta = getTypeMeta(type);

  const card: MiniAppCard = {
    id: `draft_${Date.now()}`,
    title:
      typeof raw.title === "string" && raw.title.trim()
        ? raw.title.trim().slice(0, 24)
        : fallback.title,
    type,
    icon: meta.icon,
    color: meta.color,
    heroImage:
      typeof raw.heroImage === "string" && raw.heroImage.trim()
        ? raw.heroImage
        : meta.heroImage,
    description:
      typeof raw.description === "string" && raw.description.trim()
        ? raw.description.trim()
        : fallback.description,
  };

  if (type === "flashcard") {
    card.flashcard = {
      word: typeof raw.word === "string" && raw.word ? raw.word : fallback.flashcard?.word || "Word",
      pronunciation:
        typeof raw.pronunciation === "string" && raw.pronunciation
          ? raw.pronunciation
          : fallback.flashcard?.pronunciation || "/wɜːd/",
      definition:
        typeof raw.definition === "string" && raw.definition
          ? raw.definition
          : fallback.flashcard?.definition || "词义",
      example:
        typeof raw.example === "string" && raw.example
          ? raw.example
          : fallback.flashcard?.example || "Example sentence.",
    };
    return card;
  }

  if (type === "price_tracker") {
    const items = Array.isArray(raw.items) ? raw.items : [];
    card.priceItems =
      items
        .slice(0, 3)
        .map((item: any) => ({
          product: typeof item?.product === "string" ? item.product : "Unknown Product",
          retailer: typeof item?.retailer === "string" ? item.retailer : "Store",
          price: Number.isFinite(Number(item?.price)) ? Number(item.price) : 999,
          trend:
            item?.trend === "up" || item?.trend === "stable" || item?.trend === "down"
              ? item.trend
              : "stable",
        }))
        .filter((x: PriceItem) => x.product) || fallback.priceItems;
    if (!card.priceItems || card.priceItems.length === 0) {
      card.priceItems = fallback.priceItems;
    }
    return card;
  }

  const news = Array.isArray(raw.items) ? raw.items : [];
  card.newsItems =
    news
      .slice(0, 3)
      .map((item: any) => ({
        title: typeof item?.title === "string" ? item.title : "AI News",
        source: typeof item?.source === "string" ? item.source : "Source",
        summary: typeof item?.summary === "string" ? item.summary : "Summary",
      }))
      .filter((x: NewsItem) => x.title) || fallback.newsItems;
  if (!card.newsItems || card.newsItems.length === 0) {
    card.newsItems = fallback.newsItems;
  }

  return card;
}

async function generateMiniAppCard(prompt: string, language: AppLanguage) {
  const fallback = buildFallbackCard(prompt, language);
  const outputLangHint =
    language === "zh"
      ? "Use Chinese for all user-facing strings."
      : "Use English for all user-facing strings.";

  const generated = await generateGeminiJson<any>(
    [
      "You are an AI mini app generator.",
      "Return JSON only with this schema:",
      "{",
      '  "title": "short chinese app name",',
      '  "type": "news_feed|flashcard|price_tracker",',
      '  "description": "short chinese description",',
      '  "heroImage": "https://... optional",',
      '  "items": [{"title":"...","source":"...","summary":"..."}],',
      '  "word": "...",',
      '  "pronunciation": "...",',
      '  "definition": "...",',
      '  "example": "..."',
      "}",
      "Rules:",
      `1) ${outputLangHint}`,
      "2) If type is news_feed or price_tracker, provide 3 items.",
      "3) If type is flashcard, provide word/pronunciation/definition/example.",
      `User prompt: ${prompt}`,
    ].join("\n"),
    {
      title: fallback.title,
      type: fallback.type,
      description: fallback.description,
      heroImage: fallback.heroImage,
      items:
        fallback.type === "news_feed"
          ? fallback.newsItems
          : fallback.type === "price_tracker"
            ? fallback.priceItems
            : [],
      word: fallback.flashcard?.word,
      pronunciation: fallback.flashcard?.pronunciation,
      definition: fallback.flashcard?.definition,
      example: fallback.flashcard?.example,
    }
  );

  return normalizeGeneratedCard(generated, prompt, language);
}

function AppPreviewCard({ app }: { app: MiniAppCard }) {
  return (
    <View style={styles.previewCard}>
      <View style={styles.previewHeroWrap}>
        <View style={styles.previewHeroOverlay} />
        <Text style={styles.previewHeroType}>{app.type.replace("_", " ").toUpperCase()}</Text>
        <Text style={styles.previewHeroTitle} numberOfLines={2}>
          {app.title}
        </Text>
      </View>

      <View style={styles.previewBody}>
        {app.type === "news_feed" ? (
          <View style={styles.previewList}>
            {(app.newsItems || []).slice(0, 3).map((item, idx) => (
              <View key={`${item.title}_${idx}`} style={styles.previewItem}>
                <Text style={styles.previewIndex}>{`0${idx + 1}`}</Text>
                <View style={styles.previewItemBody}>
                  <Text style={styles.previewItemTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={styles.previewMetaRow}>
                    <Text style={styles.previewTag}>{item.source}</Text>
                    <Text style={styles.previewItemSummary} numberOfLines={1}>
                      {item.summary}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {app.type === "flashcard" ? (
          <View style={styles.flashCardBox}>
            <Text style={styles.flashWord}>{app.flashcard?.word || "Word"}</Text>
            <Text style={styles.flashPron}>{app.flashcard?.pronunciation || "/-/"}</Text>
            <Text style={styles.flashDef}>{app.flashcard?.definition || "Definition"}</Text>
            <Text style={styles.flashExample} numberOfLines={2}>
              {app.flashcard?.example || "Example"}
            </Text>
          </View>
        ) : null}

        {app.type === "price_tracker" ? (
          <View style={styles.previewList}>
            {(app.priceItems || []).slice(0, 3).map((item, idx) => (
              <View key={`${item.product}_${idx}`} style={styles.previewItem}>
                <Text style={styles.previewIndex}>{`0${idx + 1}`}</Text>
                <View style={styles.previewItemBody}>
                  <Text style={styles.previewItemTitle} numberOfLines={1}>
                    {item.product}
                  </Text>
                  <View style={styles.previewMetaRow}>
                    <Text style={styles.previewTag}>{item.retailer}</Text>
                    <Text style={styles.priceText}>{`¥${item.price}`}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.previewQuoteWrap}>
          <Text style={styles.previewQuote} numberOfLines={2}>{`“${app.description}”`}</Text>
        </View>
      </View>

      <View style={styles.previewFooter}>
        <View style={styles.previewFooterLeft}>
          <View style={styles.generatedBadge}>
            <Ionicons name="sparkles" size={12} color="white" />
          </View>
          <View>
            <Text style={styles.generatedTitle}>GENERATED BY AI</Text>
            <Text style={styles.generatedSub}>Scan to add to Desktop</Text>
          </View>
        </View>
        <View style={styles.previewQr} />
      </View>
    </View>
  );
}

function buildRunSummary(app: MiniAppCard, language: AppLanguage) {
  const tr = (zh: string, en: string) => tx(language, zh, en);
  if (app.type === "news_feed") {
    const headline = app.newsItems?.[0]?.title ?? tr("已生成新闻卡片", "News card generated");
    return language === "zh"
      ? `[${app.title}] 已运行，当前头条：${headline}`
      : `[${app.title}] Ran successfully. Top headline: ${headline}`;
  }
  if (app.type === "flashcard") {
    const word = app.flashcard?.word ?? "Word";
    return language === "zh"
      ? `[${app.title}] 已运行，今日学习词：${word}`
      : `[${app.title}] Ran successfully. Today's word: ${word}`;
  }
  const topDeal = app.priceItems?.[0];
  if (topDeal) {
    return language === "zh"
      ? `[${app.title}] 已运行，最低价：${topDeal.product} ¥${topDeal.price}`
      : `[${app.title}] Ran successfully. Lowest price: ${topDeal.product} ¥${topDeal.price}`;
  }
  return language === "zh" ? `[${app.title}] 已运行` : `[${app.title}] Ran successfully`;
}

function MiniAppRuntime({
  app,
  language,
}: {
  app: MiniAppCard;
  language: AppLanguage;
}) {
  const tr = (zh: string, en: string) => tx(language, zh, en);
  return (
    <View style={styles.runtimeCard}>
      <View style={styles.runtimeHead}>
        <View style={[styles.runtimeIconWrap, { backgroundColor: app.color }]}>
          <Ionicons name={app.icon} size={16} color="white" />
        </View>
        <View style={styles.runtimeHeadText}>
          <Text style={styles.runtimeTitle} numberOfLines={1}>
            {app.title}
          </Text>
          <Text style={styles.runtimeSub}>{tr("AI 生成应用 · 运行态", "AI app · Runtime")}</Text>
        </View>
      </View>

      <ScrollView style={styles.runtimeBody} showsVerticalScrollIndicator={false}>
        {app.type === "news_feed" ? (
          <View style={styles.runtimeList}>
            {(app.newsItems ?? []).map((item, idx) => (
              <View key={`${item.title}_${idx}`} style={styles.runtimeItem}>
                <Text style={styles.runtimeIndex}>{`0${idx + 1}`}</Text>
                <View style={styles.runtimeItemMain}>
                  <Text style={styles.runtimeItemTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.runtimeItemSub} numberOfLines={2}>
                    {item.source} · {item.summary}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {app.type === "flashcard" ? (
          <View style={styles.runtimeFlashCard}>
            <Text style={styles.runtimeFlashWord}>{app.flashcard?.word ?? "Word"}</Text>
            <Text style={styles.runtimeFlashPron}>{app.flashcard?.pronunciation ?? "/-/"}</Text>
            <Text style={styles.runtimeFlashDef}>{app.flashcard?.definition ?? ""}</Text>
            <Text style={styles.runtimeFlashExample}>
              {app.flashcard?.example ?? "Example sentence."}
            </Text>
          </View>
        ) : null}

        {app.type === "price_tracker" ? (
          <View style={styles.runtimeList}>
            {(app.priceItems ?? []).map((item, idx) => (
              <View key={`${item.product}_${idx}`} style={styles.runtimeItem}>
                <Text style={styles.runtimeIndex}>{`0${idx + 1}`}</Text>
                <View style={styles.runtimeItemMain}>
                  <Text style={styles.runtimeItemTitle} numberOfLines={1}>
                    {item.product}
                  </Text>
                  <Text style={styles.runtimeItemSub} numberOfLines={1}>
                    {item.retailer}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.runtimePrice,
                    item.trend === "down" ? styles.runtimePriceDrop : null,
                  ]}
                >
                  ¥{item.price}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

export function MiniAppDock({
  accentColor,
  onOpenChat,
  tasks,
  theme = "classic",
  language = "en",
  onTaskPanelVisibilityChange,
}: MiniAppDockProps) {
  const isNeo = theme === "neo";
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const tr = (zh: string, en: string) => tx(language, zh, en);
  const [expanded, setExpanded] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [promptInput, setPromptInput] = useState(QUICK_ACTIONS[0].prompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftApp, setDraftApp] = useState<MiniAppCard | null>(null);
  const [installedApps, setInstalledApps] = useState<MiniAppCard[]>(() => persistedInstalledApps);
  const [showTasks, setShowTasks] = useState(false);
  const [activeRuntimeApp, setActiveRuntimeApp] = useState<MiniAppCard | null>(null);
  const [previewMode, setPreviewMode] = useState<"new" | "installed">("new");
  const [showManager, setShowManager] = useState(false);
  const [collapsedOffset, setCollapsedOffset] = useState({ x: 0, y: 0 });
  const [collapsedSide, setCollapsedSide] = useState<"left" | "right">("right");
  const collapsedOffsetRef = useRef(collapsedOffset);
  const hasInitCollapsedOffset = useRef(false);
  const collapsedDragStart = useRef({ x: 0, y: 0 });
  const collapsedPressStartAt = useRef(0);
  const collapsedDidMove = useRef(false);

  const collapsedMaxX = useMemo(() => Math.max(0, windowWidth - 28 - 60), [windowWidth]);
  const collapsedMaxY = useMemo(
    () => Math.max(0, Math.min(windowHeight * (isNeo ? 0.42 : 0.34), isNeo ? 340 : 300)),
    [isNeo, windowHeight]
  );

  const appDisplayTitle = (app: MiniAppCard) =>
    app.shortcutId ? quickActionLabel(app.shortcutId, language) : app.title;

  useEffect(() => {
    if (installedApps.length > 0) return;
    const seeded = QUICK_ACTIONS.map((action) => buildQuickActionApp(action, language));
    setInstalledApps(seeded);
  }, [installedApps.length, language]);

  useEffect(() => {
    setInstalledApps((prev) => {
      let changed = false;
      const next = prev.map((app) => {
        if (!app.shortcutId) return app;
        const localized = quickActionLabel(app.shortcutId, language);
        if (app.title === localized) return app;
        changed = true;
        return { ...app, title: localized };
      });
      return changed ? next : prev;
    });
  }, [language]);

  useEffect(() => {
    persistedInstalledApps = installedApps;
  }, [installedApps]);

  useEffect(() => {
    onTaskPanelVisibilityChange?.(showTasks);
  }, [onTaskPanelVisibilityChange, showTasks]);

  useEffect(() => {
    if (hasInitCollapsedOffset.current) return;
    hasInitCollapsedOffset.current = true;
    const defaultX = isNeo ? Math.max(0, collapsedMaxX - 2) : 0;
    const defaultY = Math.min(isNeo ? 140 : 0, collapsedMaxY);
    setCollapsedSide(defaultX > collapsedMaxX / 2 ? "right" : "left");
    setCollapsedOffset({
      x: defaultX,
      y: defaultY,
    });
  }, [collapsedMaxX, collapsedMaxY, isNeo]);

  useEffect(() => {
    collapsedOffsetRef.current = collapsedOffset;
  }, [collapsedOffset]);

  useEffect(() => {
    setCollapsedOffset((prev) => {
      const nextX = clamp(prev.x, 0, collapsedMaxX);
      const nextY = clamp(prev.y, 0, collapsedMaxY);
      if (prev.x === nextX && prev.y === nextY) return prev;
      return { x: nextX, y: nextY };
    });
  }, [collapsedMaxX, collapsedMaxY]);

  const collapsedPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          collapsedDragStart.current = collapsedOffsetRef.current;
          collapsedPressStartAt.current = Date.now();
          collapsedDidMove.current = false;
        },
        onPanResponderMove: (_, gestureState) => {
          if (
            !collapsedDidMove.current &&
            (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2)
          ) {
            collapsedDidMove.current = true;
          }
          const nextX = clamp(
            collapsedDragStart.current.x + gestureState.dx,
            0,
            collapsedMaxX
          );
          const nextY = clamp(
            collapsedDragStart.current.y + gestureState.dy,
            0,
            collapsedMaxY
          );
          setCollapsedOffset((prev) => {
            if (prev.x === nextX && prev.y === nextY) return prev;
            return { x: nextX, y: nextY };
          });
        },
        onPanResponderRelease: (_, gestureState) => {
          const tapDuration = Date.now() - collapsedPressStartAt.current;
          const consideredTap =
            !collapsedDidMove.current &&
            Math.abs(gestureState.dx) <= 3 &&
            Math.abs(gestureState.dy) <= 3 &&
            tapDuration < 220;
          if (consideredTap) {
            setExpanded(true);
            return;
          }
          const rawX = collapsedDragStart.current.x + gestureState.dx;
          const rawY = collapsedDragStart.current.y + gestureState.dy;
          const clampedX = clamp(rawX, 0, collapsedMaxX);
          const clampedY = clamp(rawY, 0, collapsedMaxY);
          const edgeSnapThreshold = 18;
          const settledX =
            clampedX < edgeSnapThreshold
              ? 0
              : collapsedMaxX - clampedX < edgeSnapThreshold
                ? collapsedMaxX
                : clampedX;
          setCollapsedSide(settledX > collapsedMaxX / 2 ? "right" : "left");
          setCollapsedOffset({
            x: settledX,
            y: clampedY,
          });
        },
        onPanResponderTerminate: (_, gestureState) => {
          const rawX = collapsedDragStart.current.x + gestureState.dx;
          const rawY = collapsedDragStart.current.y + gestureState.dy;
          const clampedX = clamp(rawX, 0, collapsedMaxX);
          const clampedY = clamp(rawY, 0, collapsedMaxY);
          const edgeSnapThreshold = 18;
          const settledX =
            clampedX < edgeSnapThreshold
              ? 0
              : collapsedMaxX - clampedX < edgeSnapThreshold
                ? collapsedMaxX
                : clampedX;
          setCollapsedSide(settledX > collapsedMaxX / 2 ? "right" : "left");
          setCollapsedOffset({
            x: settledX,
            y: clampedY,
          });
        },
      }),
    [collapsedMaxX, collapsedMaxY]
  );

  const selectedCountText = language === "zh" ? "创建应用" : "Create App";
  const createSubText =
    installedApps.length === 0
      ? language === "zh"
        ? "描述即可生成"
        : "Describe to generate"
      : language === "zh"
        ? `已就绪 ${installedApps.length} 个应用`
        : `${installedApps.length} apps ready`;

  const openCreator = (initialPrompt?: string) => {
    setPreviewMode("new");
    setDraftApp(null);
    if (initialPrompt) {
      setPromptInput(initialPrompt);
    }
    setShowCreator(true);
  };

  const openInstalledApp = (app: MiniAppCard) => {
    setPreviewMode("installed");
    setDraftApp(app);
    setPromptInput(app.description);
    setShowCreator(true);
  };

  const openInstalledRuntime = (app: MiniAppCard) => {
    if (app.shortcutId === "tasks") {
      setShowTasks((prev) => !prev);
      return;
    }
    setActiveRuntimeApp({ ...app, title: appDisplayTitle(app) });
  };

  const moveInstalledApp = (fromIndex: number, toIndex: number) => {
    setInstalledApps((prev) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex >= prev.length ||
        fromIndex === toIndex
      ) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const renameInstalledApp = (id: string, nextTitle: string) => {
    setInstalledApps((prev) =>
      prev.map((app) => {
        if (app.id !== id) return app;
        if (app.shortcutId) return app;
        const title = nextTitle.trim().slice(0, 24);
        return { ...app, title: title || app.title };
      })
    );
  };

  const deleteInstalledApp = (id: string) => {
    setInstalledApps((prev) => prev.filter((app) => app.id !== id));
    if (activeRuntimeApp?.id === id) {
      setActiveRuntimeApp(null);
    }
    if (draftApp?.id === id) {
      setDraftApp(null);
      setPreviewMode("new");
    }
    const deletingTasksShortcut = installedApps.some(
      (app) => app.id === id && app.shortcutId === "tasks"
    );
    if (deletingTasksShortcut) {
      setShowTasks(false);
    }
  };

  const handleGenerate = async () => {
    const raw = promptInput.trim();
    if (!raw) {
      Alert.alert(
        tr("提示词为空", "Prompt is empty"),
        tr("请先输入你要生成的 Mini App 需求。", "Please describe the mini app you want to generate.")
      );
      return;
    }

    try {
      setIsGenerating(true);
      const app = await generateMiniAppCard(raw, language);
      setDraftApp(app);
      setPreviewMode("new");
    } catch {
      Alert.alert(tr("生成失败", "Generation failed"), tr("已切换到本地模板，请稍后重试。", "Switched to fallback template. Please try again."), [
        {
          text: "OK",
          onPress: () => setDraftApp(buildFallbackCard(raw, language)),
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInstallDraft = () => {
    if (!draftApp) return;
    setInstalledApps((prev) => [{ ...draftApp, id: `installed_${Date.now()}` }, ...prev]);
    setShowCreator(false);
    setPreviewMode("installed");
  };

  const handleRuntimeWriteback = () => {
    if (!activeRuntimeApp) return;
    const summary = buildRunSummary(activeRuntimeApp, language);
    setActiveRuntimeApp(null);
    Alert.alert(tr("回写摘要已生成", "Summary generated"), summary, [
      { text: tr("关闭", "Close"), style: "cancel" },
      { text: tr("打开聊天", "Open Chat"), onPress: onOpenChat },
    ]);
  };

  if (!expanded) {
    return (
      <View style={styles.minButtonArea} pointerEvents="box-none">
        <View
          style={[
            styles.minButtonDraggable,
            {
              transform: [
                { translateX: collapsedOffset.x },
                { translateY: collapsedOffset.y },
              ],
            },
          ]}
          {...collapsedPanResponder.panHandlers}
        >
          <View style={[styles.minButton, !isNeo && styles.minButtonClassic]}>
            <Ionicons name="grid-outline" size={22} color="white" />
          </View>
          {isNeo ? (
            <View
              style={[
                styles.minButtonLabel,
                collapsedSide === "right"
                  ? styles.minButtonLabelLeft
                  : styles.minButtonLabelRight,
              ]}
              pointerEvents="none"
            >
              <Text style={styles.minButtonLabelText}>{tr("仪表盘", "Dashboard")}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.container, !isNeo && styles.containerClassic]}>
        <View style={styles.rowTop}>
          <Pressable style={[styles.createButton, !isNeo && styles.createButtonClassic]} onPress={() => openCreator()}>
            <View style={[styles.createIconWrap, !isNeo && styles.createIconWrapClassic]}>
              <Ionicons name="add" size={20} color="white" />
            </View>
            <View style={styles.createTextWrap}>
              <Text style={[styles.createTitle, !isNeo && styles.createTitleClassic]}>
                {selectedCountText}
              </Text>
              <Text style={[styles.createSub, !isNeo && styles.createSubClassic]}>
                {createSubText}
              </Text>
            </View>
            <View style={[styles.createArrowWrap, !isNeo && styles.createArrowWrapClassic]}>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={isNeo ? "rgba(255,255,255,0.85)" : "#334155"}
              />
            </View>
          </Pressable>

          <Pressable style={[styles.minusButton, !isNeo && styles.minusButtonClassic]} onPress={() => setExpanded(false)}>
            <Ionicons name="remove" size={22} color={isNeo ? "rgba(255,255,255,0.8)" : "#334155"} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionRow}
        >
          {installedApps.map((app) => (
            <Pressable
              key={app.id}
              style={[styles.actionCard, !isNeo && styles.actionCardClassic]}
              onPress={() => openInstalledRuntime(app)}
              onLongPress={() =>
                app.shortcutId ? openCreator(quickActionPrompt(app.shortcutId, language)) : openInstalledApp(app)
              }
            >
              <View style={[styles.actionIconWrap, { backgroundColor: app.color }]}>
                <Ionicons name={app.icon} size={14} color="white" />
              </View>
              <Text style={[styles.actionLabel, !isNeo && styles.actionLabelClassic]} numberOfLines={1}>
                {appDisplayTitle(app)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {showTasks ? (
          <View style={[styles.taskPanel, !isNeo && styles.taskPanelClassic]}>
            <View style={styles.taskPanelHead}>
              <Text style={[styles.taskPanelTitle, !isNeo && styles.taskPanelTitleClassic]}>
                {tr("活跃任务", "Active Tasks")}
              </Text>
              <Text style={styles.taskPanelCount}>{tasks.length}</Text>
            </View>
            {tasks.length > 0 ? (
              <View style={styles.taskList}>
                {tasks.slice(0, 3).map((task) => (
                  <View key={`${task.id ?? task.title}_${task.priority}`} style={styles.taskRow}>
                    <View
                      style={[
                        styles.taskDot,
                        task.priority === "High" ? styles.taskDotHigh : styles.taskDotMid,
                      ]}
                    />
                    <View style={styles.taskContent}>
                      <Text style={styles.taskName} numberOfLines={1}>
                        {task.title}
                      </Text>
                      <Text style={[styles.taskMeta, !isNeo && styles.taskMetaClassic]} numberOfLines={1}>
                        {task.assignee} ·{" "}
                        {language === "zh"
                          ? { High: "高", Medium: "中", Low: "低" }[task.priority]
                          : task.priority}
                      </Text>
                    </View>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#94a3b8" />
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.taskEmpty, !isNeo && styles.taskEmptyClassic]}>
                {tr("暂无活跃任务", "No active tasks")}
              </Text>
            )}
          </View>
        ) : null}

        {installedApps.length > 0 ? (
          <View style={styles.generatedCard}>
            <Text style={styles.generatedCardTitle}>{appDisplayTitle(installedApps[0])}</Text>
            <Text style={styles.generatedCardText} numberOfLines={2}>
              {tr(
                "已安装，点击可再次打开；点击“运行并回写”把摘要写回聊天流。",
                "Installed. Tap to open again; tap run to write a summary back to chat."
              )}
            </Text>
            <View style={styles.generatedActions}>
              <Pressable
                style={[styles.runButton, { backgroundColor: accentColor }]}
                onPress={() => openInstalledRuntime(installedApps[0])}
              >
                <Ionicons name="play" size={14} color="white" />
                <Text style={styles.runButtonText}>{tr("运行并回写", "Run & Writeback")}</Text>
              </Pressable>
              <Pressable
                style={[styles.manageButton, !isNeo && styles.manageButtonClassic]}
                onPress={() => setShowManager(true)}
              >
                <Ionicons
                  name="settings-outline"
                  size={14}
                  color={isNeo ? "rgba(226,232,240,0.9)" : "#334155"}
                />
                <Text style={[styles.manageButtonText, !isNeo && styles.manageButtonTextClassic]}>
                  {tr("管理应用", "Manage Apps")}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <Modal
        visible={showCreator}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreator(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, !isNeo && styles.modalCardClassic]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <View style={styles.sparkBadge}>
                  <Ionicons name="sparkles" size={14} color="white" />
                </View>
                <Text style={[styles.modalTitle, !isNeo && styles.modalTitleClassic]}>
                  {tr("生成此 Mini App 的提示词", "Prompt for this Mini App")}
                </Text>
              </View>
              <Pressable onPress={() => setShowCreator(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={isNeo ? "rgba(255,255,255,0.8)" : "#475569"} />
              </Pressable>
            </View>

            <View style={[styles.promptWrap, !isNeo && styles.promptWrapClassic]}>
              <View style={styles.promptBadgeRow}>
                <Ionicons name="sparkles-outline" size={12} color="#60a5fa" />
                <Text style={styles.promptBadgeText}>AI GENERATOR</Text>
              </View>

              <TextInput
                style={[styles.promptInput, !isNeo && styles.promptInputClassic]}
                placeholder={tr("描述你想创建的应用功能...", "Describe the app you want to create...")}
                placeholderTextColor={isNeo ? "rgba(203,213,225,0.55)" : "#94a3b8"}
                multiline
                value={promptInput}
                onChangeText={setPromptInput}
              />

              <Pressable
                style={[styles.generateArrowBtn, !isNeo && styles.generateArrowBtnClassic]}
                onPress={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color={isNeo ? "white" : "#0f172a"} />
                ) : (
                  <Ionicons name="arrow-up" size={16} color={isNeo ? "white" : "#0f172a"} />
                )}
              </Pressable>
            </View>

            <ScrollView
              style={styles.creatorBodyScroll}
              contentContainerStyle={styles.creatorBodyScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {draftApp ? (
                <>
                  <View style={styles.installRow}>
                    <View style={styles.readyLabelWrap}>
                      <Ionicons
                        name={previewMode === "installed" ? "checkmark-circle" : "checkmark"}
                        size={14}
                        color="#22c55e"
                      />
                      <Text style={[styles.readyLabel, !isNeo && styles.readyLabelClassic]}>
                        {previewMode === "installed"
                          ? tr("已安装", "INSTALLED")
                          : tr("准备安装", "READY TO INSTALL")}
                      </Text>
                    </View>

                    {previewMode === "new" ? (
                      <View style={styles.installActions}>
                        <Pressable onPress={() => setDraftApp(null)}>
                          <Text style={[styles.discardText, !isNeo && styles.discardTextClassic]}>
                            {tr("放弃", "Discard")}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={[styles.addAppBtn, { backgroundColor: "#f8fafc" }]}
                          onPress={handleInstallDraft}
                        >
                          <Ionicons name="download-outline" size={14} color="#111827" />
                          <Text style={styles.addAppBtnText}>{tr("添加应用", "Add App")}</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        style={[styles.runButtonInline, { backgroundColor: accentColor }]}
                        onPress={() => draftApp && openInstalledRuntime(draftApp)}
                      >
                        <Ionicons name="play" size={13} color="white" />
                        <Text style={styles.runInlineText}>{tr("在聊天中运行", "Run in Chat")}</Text>
                      </Pressable>
                    )}
                  </View>
                  <AppPreviewCard app={draftApp} />
                </>
              ) : (
                <>
                  <Text style={[styles.examplesTitle, !isNeo && styles.examplesTitleClassic]}>
                    {tr("试试这些示例", "TRY THESE EXAMPLES")}
                  </Text>
                  <View style={styles.examplesGrid}>
                    {GENERATOR_EXAMPLES.map((item) => (
                      <Pressable
                        key={`example_${item.id}`}
                        style={[styles.exampleCard, !isNeo && styles.exampleCardClassic]}
                        onPress={() => setPromptInput(examplePrompt(item, language))}
                      >
                        <View style={[styles.exampleIconWrap, !isNeo && styles.exampleIconWrapClassic]}>
                          <Ionicons name={item.icon} size={14} color="white" />
                        </View>
                        <Text style={[styles.exampleTitle, !isNeo && styles.exampleTitleClassic]} numberOfLines={1}>
                          {exampleTitle(item, language)}
                        </Text>
                        <Text style={[styles.exampleDesc, !isNeo && styles.exampleDescClassic]} numberOfLines={3}>
                          {exampleDesc(item, language)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={Boolean(activeRuntimeApp)}
        animationType="fade"
        transparent
        onRequestClose={() => setActiveRuntimeApp(null)}
      >
        <View style={styles.runtimeOverlay}>
          <View style={styles.runtimeWrap}>
            <View style={styles.runtimeToolbar}>
              <Pressable
                style={styles.runtimeToolbarBtn}
                onPress={() => setActiveRuntimeApp(null)}
              >
                <Ionicons name="close" size={18} color="#334155" />
              </Pressable>
              <Pressable
                style={[styles.runtimeToolbarBtn, { backgroundColor: accentColor }]}
                onPress={handleRuntimeWriteback}
              >
                <Ionicons name="chatbox-ellipses-outline" size={16} color="white" />
              </Pressable>
            </View>

            {activeRuntimeApp ? <MiniAppRuntime app={activeRuntimeApp} language={language} /> : null}

            <Pressable
              style={[styles.runtimeFooterBtn, { backgroundColor: accentColor }]}
              onPress={handleRuntimeWriteback}
            >
              <Ionicons name="return-up-forward-outline" size={14} color="white" />
              <Text style={styles.runtimeFooterBtnText}>{tr("回写摘要到聊天", "Write summary to chat")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showManager}
        animationType="fade"
        transparent
        onRequestClose={() => setShowManager(false)}
      >
        <View style={styles.managerOverlay}>
          <View style={[styles.managerCard, !isNeo && styles.managerCardClassic]}>
            <View style={styles.managerHeader}>
              <View>
                <Text style={[styles.managerTitle, !isNeo && styles.managerTitleClassic]}>
                  {tr("已安装应用", "Installed Apps")}
                </Text>
                <Text style={[styles.managerSub, !isNeo && styles.managerSubClassic]}>
                  {tr("重命名、排序或删除", "Rename, reorder, or delete")}
                </Text>
              </View>
              <Pressable style={styles.managerClose} onPress={() => setShowManager(false)}>
                <Ionicons name="close" size={18} color={isNeo ? "#cbd5e1" : "#475569"} />
              </Pressable>
            </View>

            <ScrollView style={styles.managerList} showsVerticalScrollIndicator={false}>
              {installedApps.map((app, idx) => (
                <View key={`manager_${app.id}`} style={[styles.managerRow, !isNeo && styles.managerRowClassic]}>
                  <View style={[styles.managerAppIcon, { backgroundColor: app.color }]}>
                    <Ionicons name={app.icon} size={14} color="white" />
                  </View>
                  <TextInput
                    style={[styles.managerInput, !isNeo && styles.managerInputClassic]}
                    value={appDisplayTitle(app)}
                    onChangeText={(next) => renameInstalledApp(app.id, next)}
                    editable={!app.shortcutId}
                    maxLength={24}
                    placeholder={tr("应用名称", "App title")}
                    placeholderTextColor={isNeo ? "rgba(148,163,184,0.8)" : "#94a3b8"}
                  />
                  <View style={styles.managerActionGroup}>
                    <Pressable
                      style={[styles.managerActionBtn, !isNeo && styles.managerActionBtnClassic]}
                      onPress={() => moveInstalledApp(idx, idx - 1)}
                      disabled={idx === 0}
                    >
                      <Ionicons
                        name="chevron-up"
                        size={14}
                        color={
                          idx === 0 ? (isNeo ? "rgba(100,116,139,0.6)" : "#cbd5e1") : isNeo ? "#cbd5e1" : "#475569"
                        }
                      />
                    </Pressable>
                    <Pressable
                      style={[styles.managerActionBtn, !isNeo && styles.managerActionBtnClassic]}
                      onPress={() => moveInstalledApp(idx, idx + 1)}
                      disabled={idx === installedApps.length - 1}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={14}
                        color={
                          idx === installedApps.length - 1
                            ? isNeo
                              ? "rgba(100,116,139,0.6)"
                              : "#cbd5e1"
                            : isNeo
                              ? "#cbd5e1"
                              : "#475569"
                        }
                      />
                    </Pressable>
                    <Pressable
                      style={[styles.managerActionBtn, styles.managerDeleteBtn]}
                      onPress={() => deleteInstalledApp(app.id)}
                    >
                      <Ionicons name="trash-outline" size={13} color="white" />
                    </Pressable>
                  </View>
                </View>
              ))}
              {installedApps.length === 0 ? (
                <Text style={[styles.managerEmpty, !isNeo && styles.managerEmptyClassic]}>
                  {tr("还没有已安装应用", "No installed apps yet")}
                </Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 34,
    padding: 12,
    backgroundColor: "rgba(31,31,47,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  containerClassic: {
    backgroundColor: "rgba(255,255,255,0.93)",
    borderColor: "rgba(255,255,255,0.8)",
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  createButton: {
    flex: 1,
    minHeight: 64,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  createButtonClassic: {
    backgroundColor: "#f8fafc",
    borderColor: "#dbeafe",
  },
  createIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  createIconWrapClassic: {
    backgroundColor: "#22c55e",
  },
  createTextWrap: {
    flex: 1,
    gap: 2,
  },
  createTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f8fafc",
  },
  createTitleClassic: {
    color: "#0f172a",
  },
  createSub: {
    fontSize: 11,
    color: "rgba(226,232,240,0.7)",
  },
  createSubClassic: {
    color: "#64748b",
  },
  createArrowWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  createArrowWrapClassic: {
    backgroundColor: "#e2e8f0",
  },
  minusButton: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    alignItems: "center",
    justifyContent: "center",
  },
  minusButtonClassic: {
    backgroundColor: "#f8fafc",
    borderColor: "#dbeafe",
  },
  actionRow: {
    gap: 8,
    paddingRight: 2,
  },
  actionCard: {
    width: 82,
    height: 78,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 4,
  },
  actionCardClassic: {
    backgroundColor: "#f8fafc",
    borderColor: "#dbeafe",
  },
  actionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconWrapClassic: {
    backgroundColor: "#22c55e",
  },
  actionIconWrapActive: {
    backgroundColor: "rgba(34,197,94,0.55)",
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f8fafc",
  },
  actionLabelClassic: {
    color: "#0f172a",
  },
  taskPanel: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(2,6,23,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 8,
  },
  taskPanelClassic: {
    borderColor: "#dbeafe",
    backgroundColor: "#f8fafc",
  },
  taskPanelHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  taskPanelTitle: {
    color: "rgba(226,232,240,0.88)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  taskPanelTitleClassic: {
    color: "#0f172a",
  },
  taskPanelCount: {
    minWidth: 20,
    textAlign: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
    fontSize: 10,
    fontWeight: "700",
    color: "#e2e8f0",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  taskList: {
    gap: 5,
  },
  taskRow: {
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  taskDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  taskDotHigh: {
    backgroundColor: "#ef4444",
  },
  taskDotMid: {
    backgroundColor: "#3b82f6",
  },
  taskContent: {
    flex: 1,
    gap: 1,
  },
  taskName: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "600",
  },
  taskMeta: {
    color: "rgba(203,213,225,0.68)",
    fontSize: 10,
  },
  taskMetaClassic: {
    color: "#64748b",
  },
  taskEmpty: {
    color: "rgba(203,213,225,0.6)",
    fontSize: 11,
  },
  taskEmptyClassic: {
    color: "#64748b",
  },
  generatedCard: {
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    padding: 10,
    gap: 8,
  },
  generatedCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  generatedCardText: {
    fontSize: 11,
    color: "#334155",
    lineHeight: 16,
  },
  generatedActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  runButton: {
    alignSelf: "flex-start",
    minHeight: 34,
    borderRadius: 99,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  runButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  manageButton: {
    minHeight: 34,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    backgroundColor: "rgba(15,23,42,0.42)",
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  manageButtonClassic: {
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  manageButtonText: {
    color: "rgba(226,232,240,0.9)",
    fontSize: 12,
    fontWeight: "700",
  },
  manageButtonTextClassic: {
    color: "#334155",
  },
  minButton: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "rgba(26,30,40,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  minButtonClassic: {
    backgroundColor: "#22c55e",
    borderColor: "rgba(255,255,255,0.75)",
  },
  minButtonArea: {
    width: "100%",
    minHeight: 84,
  },
  minButtonDraggable: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  minButtonLabel: {
    position: "absolute",
    top: 18,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(2,6,23,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  minButtonLabelLeft: {
    right: 68,
  },
  minButtonLabelRight: {
    left: 68,
  },
  minButtonLabelText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(248,250,252,0.92)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.72)",
    justifyContent: "flex-start",
    paddingTop: 32,
    paddingHorizontal: 12,
    paddingBottom: 18,
  },
  modalCard: {
    borderRadius: 30,
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 14,
    maxHeight: "92%",
    overflow: "hidden",
  },
  modalCardClassic: {
    backgroundColor: "rgba(255,255,255,0.98)",
    borderColor: "#dbeafe",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sparkBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f8fafc",
  },
  modalTitleClassic: {
    color: "#0f172a",
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  promptWrap: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(2,6,23,0.72)",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    position: "relative",
    marginBottom: 12,
  },
  promptWrapClassic: {
    borderColor: "#cbd5e1",
    backgroundColor: "white",
  },
  promptBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  promptBadgeText: {
    fontSize: 12,
    letterSpacing: 0.5,
    fontWeight: "700",
    color: "#60a5fa",
  },
  promptInput: {
    minHeight: 96,
    color: "#f8fafc",
    fontSize: 15,
    textAlignVertical: "top",
    paddingRight: 56,
  },
  promptInputClassic: {
    color: "#0f172a",
  },
  generateArrowBtn: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  generateArrowBtnClassic: {
    backgroundColor: "#e2e8f0",
  },
  installRow: {
    minHeight: 40,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  readyLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  readyLabel: {
    color: "rgba(226,232,240,0.86)",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  readyLabelClassic: {
    color: "#334155",
  },
  installActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  discardText: {
    color: "rgba(226,232,240,0.72)",
    fontSize: 14,
  },
  discardTextClassic: {
    color: "#64748b",
  },
  addAppBtn: {
    minHeight: 32,
    borderRadius: 99,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addAppBtnText: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 14,
  },
  runButtonInline: {
    minHeight: 32,
    borderRadius: 99,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  runInlineText: {
    color: "white",
    fontWeight: "700",
    fontSize: 12,
  },
  examplesTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "rgba(226,232,240,0.7)",
    marginBottom: 10,
  },
  examplesTitleClassic: {
    color: "#64748b",
  },
  examplesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  exampleCard: {
    width: "48%",
    minHeight: 136,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 10,
    gap: 8,
    justifyContent: "flex-start",
  },
  exampleCardClassic: {
    borderColor: "#dbeafe",
    backgroundColor: "#f8fafc",
  },
  exampleIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  exampleIconWrapClassic: {
    backgroundColor: "#22c55e",
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f8fafc",
  },
  exampleTitleClassic: {
    color: "#0f172a",
  },
  exampleDesc: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    color: "rgba(203,213,225,0.74)",
  },
  exampleDescClassic: {
    color: "#64748b",
  },
  creatorBodyScroll: {
    flex: 1,
    minHeight: 80,
  },
  creatorBodyScrollContent: {
    paddingBottom: 12,
    gap: 12,
  },
  previewCard: {
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    backgroundColor: "#f8fafc",
    marginBottom: 8,
  },
  previewHeroWrap: {
    minHeight: 130,
    backgroundColor: "#94a3b8",
    justifyContent: "flex-end",
    padding: 12,
  },
  previewHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.28)",
  },
  previewHeroType: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    zIndex: 2,
  },
  previewHeroTitle: {
    color: "white",
    fontSize: 32,
    fontWeight: "900",
    zIndex: 2,
    marginTop: 2,
  },
  previewBody: {
    padding: 12,
    gap: 10,
  },
  previewList: {
    gap: 8,
  },
  previewItem: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "white",
    padding: 10,
  },
  previewIndex: {
    fontSize: 20,
    fontWeight: "900",
    color: "#d1d5db",
    width: 34,
  },
  previewItemBody: {
    flex: 1,
    gap: 5,
  },
  previewItemTitle: {
    fontSize: 15,
    color: "#1f2937",
    fontWeight: "700",
  },
  previewMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewTag: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "700",
  },
  previewItemSummary: {
    flex: 1,
    fontSize: 12,
    color: "#64748b",
  },
  priceText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ea580c",
  },
  flashCardBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "white",
    padding: 14,
    gap: 8,
  },
  flashWord: {
    fontSize: 30,
    fontWeight: "900",
    color: "#111827",
  },
  flashPron: {
    fontSize: 13,
    color: "#64748b",
  },
  flashDef: {
    fontSize: 15,
    color: "#334155",
    lineHeight: 21,
  },
  flashExample: {
    marginTop: 2,
    fontSize: 12,
    color: "#475569",
  },
  previewQuoteWrap: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  previewQuote: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
    fontStyle: "italic",
  },
  previewFooter: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  generatedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  generatedTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 0.4,
  },
  generatedSub: {
    fontSize: 11,
    color: "#94a3b8",
  },
  previewQr: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#d1d5db",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  runtimeOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.78)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  runtimeWrap: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "92%",
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
    padding: 12,
    gap: 10,
  },
  runtimeToolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  runtimeToolbarBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  runtimeCard: {
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  runtimeHead: {
    minHeight: 60,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "white",
  },
  runtimeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  runtimeHeadText: {
    flex: 1,
    gap: 1,
  },
  runtimeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  runtimeSub: {
    fontSize: 11,
    color: "#64748b",
  },
  runtimeBody: {
    maxHeight: 380,
    padding: 10,
  },
  runtimeList: {
    gap: 8,
  },
  runtimeItem: {
    minHeight: 68,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 10,
  },
  runtimeIndex: {
    width: 30,
    color: "#d1d5db",
    fontSize: 18,
    fontWeight: "900",
  },
  runtimeItemMain: {
    flex: 1,
    gap: 3,
  },
  runtimeItemTitle: {
    color: "#1f2937",
    fontSize: 13,
    fontWeight: "700",
  },
  runtimeItemSub: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 15,
  },
  runtimePrice: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "800",
  },
  runtimePriceDrop: {
    color: "#ea580c",
  },
  runtimeFlashCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "white",
    padding: 14,
    gap: 7,
  },
  runtimeFlashWord: {
    color: "#111827",
    fontSize: 26,
    fontWeight: "900",
  },
  runtimeFlashPron: {
    color: "#64748b",
    fontSize: 12,
  },
  runtimeFlashDef: {
    color: "#334155",
    fontSize: 14,
    lineHeight: 20,
  },
  runtimeFlashExample: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
  },
  runtimeFooterBtn: {
    minHeight: 40,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  runtimeFooterBtnText: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },
  managerOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  managerCard: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "78%",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.26)",
    backgroundColor: "rgba(15,23,42,0.92)",
    padding: 12,
    gap: 10,
  },
  managerCardClassic: {
    borderColor: "#dbeafe",
    backgroundColor: "rgba(255,255,255,0.98)",
  },
  managerHeader: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  managerTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "800",
  },
  managerTitleClassic: {
    color: "#0f172a",
  },
  managerSub: {
    color: "rgba(148,163,184,0.88)",
    fontSize: 12,
    marginTop: 2,
  },
  managerSubClassic: {
    color: "#64748b",
  },
  managerClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  managerList: {
    flexGrow: 0,
  },
  managerRow: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.24)",
    backgroundColor: "rgba(255,255,255,0.04)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    marginBottom: 8,
    gap: 8,
  },
  managerRowClassic: {
    borderColor: "#dbeafe",
    backgroundColor: "#f8fafc",
  },
  managerAppIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  managerInput: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 0,
  },
  managerInputClassic: {
    color: "#0f172a",
  },
  managerActionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  managerActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
    backgroundColor: "rgba(15,23,42,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  managerActionBtnClassic: {
    borderColor: "#cbd5e1",
    backgroundColor: "#f1f5f9",
  },
  managerDeleteBtn: {
    borderColor: "transparent",
    backgroundColor: "#ef4444",
  },
  managerEmpty: {
    textAlign: "center",
    color: "rgba(148,163,184,0.88)",
    fontSize: 13,
    paddingVertical: 10,
  },
  managerEmptyClassic: {
    color: "#64748b",
  },
});
