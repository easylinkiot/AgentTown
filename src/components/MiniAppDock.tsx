import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { generateGeminiJson } from "@/src/lib/gemini";
import { TaskItem } from "@/src/types";

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

interface MiniAppDockProps {
  accentColor: string;
  onOpenChat: () => void;
  tasks: TaskItem[];
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

function buildFallbackCard(prompt: string): MiniAppCard {
  const type = inferType(prompt);
  const meta = getTypeMeta(type);

  if (type === "flashcard") {
    return {
      id: `draft_${Date.now()}`,
      title: "每日单词打卡",
      type,
      icon: meta.icon,
      color: meta.color,
      heroImage: meta.heroImage,
      description: "每日生成高频高阶词，支持发音、释义和例句。",
      flashcard: {
        word: "Serendipity",
        pronunciation: "/ˌserənˈdɪpəti/",
        definition: "意外发现珍贵事物的幸运能力。",
        example: "We found this idea by pure serendipity.",
      },
    };
  }

  if (type === "price_tracker") {
    return {
      id: `draft_${Date.now()}`,
      title: "降价猎手",
      type,
      icon: meta.icon,
      color: meta.color,
      heroImage: meta.heroImage,
      description: "监控你关注品牌的最低价并自动给出提醒。",
      priceItems: [
        { product: "Lululemon Align", retailer: "Lulu CN", price: 499, trend: "down" },
        { product: "On Cloudmonster", retailer: "On Store", price: 1099, trend: "stable" },
        { product: "LEGO 42161", retailer: "JD", price: 349, trend: "down" },
      ],
    };
  }

  return {
    id: `draft_${Date.now()}`,
    title: "AI 科技全景哨兵",
    type,
    icon: meta.icon,
    color: meta.color,
    heroImage: meta.heroImage,
    description: "实时聚合 Reddit、GitHub 及中美科技媒体的 AI 热点。",
    newsItems: [
      {
        title: "Reddit 热议：Meta 计划在下季度推出新模型",
        source: "Reddit",
        summary: "开发者社区持续讨论模型参数与推理效率。",
      },
      {
        title: "GitHub Trending: Open-Devin 项目活跃度上升",
        source: "GitHub",
        summary: "开源 Agent 工程化能力进入新一轮迭代。",
      },
      {
        title: "The Verge: OpenAI 语音交互模型进展",
        source: "The Verge",
        summary: "多模态交互体验成为产品落地关键方向。",
      },
    ],
  };
}

function normalizeGeneratedCard(raw: any, prompt: string): MiniAppCard {
  const fallback = buildFallbackCard(prompt);
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

async function generateMiniAppCard(prompt: string) {
  const fallback = buildFallbackCard(prompt);

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
      "1) Use Chinese for all user-facing strings.",
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

  return normalizeGeneratedCard(generated, prompt);
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

function buildRunSummary(app: MiniAppCard) {
  if (app.type === "news_feed") {
    const headline = app.newsItems?.[0]?.title ?? "已生成新闻卡片";
    return `[${app.title}] 已运行，当前头条：${headline}`;
  }
  if (app.type === "flashcard") {
    const word = app.flashcard?.word ?? "Word";
    return `[${app.title}] 已运行，今日学习词：${word}`;
  }
  const topDeal = app.priceItems?.[0];
  if (topDeal) {
    return `[${app.title}] 已运行，最低价：${topDeal.product} ¥${topDeal.price}`;
  }
  return `[${app.title}] 已运行`;
}

function MiniAppRuntime({ app }: { app: MiniAppCard }) {
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
          <Text style={styles.runtimeSub}>AI 生成应用 · 运行态</Text>
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

export function MiniAppDock({ accentColor, onOpenChat, tasks }: MiniAppDockProps) {
  const [expanded, setExpanded] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [promptInput, setPromptInput] = useState(QUICK_ACTIONS[0].prompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftApp, setDraftApp] = useState<MiniAppCard | null>(null);
  const [installedApps, setInstalledApps] = useState<MiniAppCard[]>([]);
  const [showTasks, setShowTasks] = useState(false);
  const [activeRuntimeApp, setActiveRuntimeApp] = useState<MiniAppCard | null>(null);
  const [previewMode, setPreviewMode] = useState<"new" | "installed">("new");

  const selectedCountText = useMemo(() => {
    if (installedApps.length === 0) return "Create App";
    return installedApps[0].title;
  }, [installedApps]);

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
    setActiveRuntimeApp(app);
  };

  const handleGenerate = async () => {
    const raw = promptInput.trim();
    if (!raw) {
      Alert.alert("提示词为空", "请先输入你要生成的 Mini App 需求。");
      return;
    }

    try {
      setIsGenerating(true);
      const app = await generateMiniAppCard(raw);
      setDraftApp(app);
      setPreviewMode("new");
    } catch {
      Alert.alert("生成失败", "已切换到本地模板，请稍后重试。", [
        {
          text: "OK",
          onPress: () => setDraftApp(buildFallbackCard(raw)),
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
    const summary = buildRunSummary(activeRuntimeApp);
    setActiveRuntimeApp(null);
    Alert.alert("回写摘要已生成", summary, [
      { text: "Close", style: "cancel" },
      { text: "Open Chat", onPress: onOpenChat },
    ]);
  };

  if (!expanded) {
    return (
      <Pressable style={styles.minButton} onPress={() => setExpanded(true)}>
        <Ionicons name="grid-outline" size={22} color="white" />
      </Pressable>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.rowTop}>
          <Pressable style={styles.createButton} onPress={() => openCreator()}>
            <View style={styles.createIconWrap}>
              <Ionicons name="add" size={20} color="white" />
            </View>
            <View style={styles.createTextWrap}>
              <Text style={styles.createTitle}>{selectedCountText}</Text>
              <Text style={styles.createSub}>Describe to generate</Text>
            </View>
            <View style={styles.createArrowWrap}>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.85)" />
            </View>
          </Pressable>

          <Pressable style={styles.minusButton} onPress={() => setExpanded(false)}>
            <Ionicons name="remove" size={22} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionRow}
        >
          {QUICK_ACTIONS.map((item) => (
            <Pressable
              key={item.id}
              style={styles.actionCard}
              onPress={() => {
                if (item.id === "tasks") {
                  setShowTasks((prev) => !prev);
                  return;
                }
                openCreator(item.prompt);
              }}
            >
              <View
                style={[
                  styles.actionIconWrap,
                  item.id === "tasks" && showTasks
                    ? styles.actionIconWrapActive
                    : null,
                ]}
              >
                <Ionicons name={item.icon} size={15} color="white" />
              </View>
              <Text style={styles.actionLabel}>{item.label}</Text>
            </Pressable>
          ))}

          {installedApps.map((app) => (
            <Pressable
              key={app.id}
              style={styles.actionCard}
              onPress={() => openInstalledRuntime(app)}
              onLongPress={() => openInstalledApp(app)}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: app.color }]}>
                <Ionicons name={app.icon} size={14} color="white" />
              </View>
              <Text style={styles.actionLabel} numberOfLines={1}>
                {app.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {showTasks ? (
          <View style={styles.taskPanel}>
            <View style={styles.taskPanelHead}>
              <Text style={styles.taskPanelTitle}>Active Tasks</Text>
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
                      <Text style={styles.taskMeta} numberOfLines={1}>
                        {task.assignee} · {task.priority}
                      </Text>
                    </View>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#94a3b8" />
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.taskEmpty}>No active tasks</Text>
            )}
          </View>
        ) : null}

        {installedApps.length > 0 ? (
          <View style={styles.generatedCard}>
            <Text style={styles.generatedCardTitle}>{installedApps[0].title}</Text>
            <Text style={styles.generatedCardText} numberOfLines={2}>
              {`已安装，点击可再次打开；点击“运行并回写”把摘要写回聊天流。`}
            </Text>
            <Pressable
              style={[styles.runButton, { backgroundColor: accentColor }]}
              onPress={() => openInstalledRuntime(installedApps[0])}
            >
              <Ionicons name="play" size={14} color="white" />
              <Text style={styles.runButtonText}>运行并回写</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <Modal
        visible={showCreator}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreator(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <View style={styles.sparkBadge}>
                  <Ionicons name="sparkles" size={14} color="white" />
                </View>
                <Text style={styles.modalTitle}>生成此 Mini App 的提示词</Text>
              </View>
              <Pressable onPress={() => setShowCreator(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
              </Pressable>
            </View>

            <View style={styles.promptWrap}>
              <View style={styles.promptBadgeRow}>
                <Ionicons name="sparkles-outline" size={12} color="#60a5fa" />
                <Text style={styles.promptBadgeText}>AI GENERATOR</Text>
              </View>

              <TextInput
                style={styles.promptInput}
                placeholder="描述你想创建的应用功能..."
                placeholderTextColor="rgba(203,213,225,0.55)"
                multiline
                value={promptInput}
                onChangeText={setPromptInput}
              />

              <Pressable style={styles.generateArrowBtn} onPress={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="arrow-up" size={16} color="white" />
                )}
              </Pressable>
            </View>

            {draftApp ? (
              <View style={styles.installRow}>
                <View style={styles.readyLabelWrap}>
                  <Ionicons
                    name={previewMode === "installed" ? "checkmark-circle" : "checkmark"}
                    size={14}
                    color="#22c55e"
                  />
                  <Text style={styles.readyLabel}>
                    {previewMode === "installed" ? "INSTALLED" : "READY TO INSTALL"}
                  </Text>
                </View>

                {previewMode === "new" ? (
                  <View style={styles.installActions}>
                    <Pressable onPress={() => setDraftApp(null)}>
                      <Text style={styles.discardText}>Discard</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.addAppBtn, { backgroundColor: "#f8fafc" }]}
                      onPress={handleInstallDraft}
                    >
                      <Ionicons name="download-outline" size={14} color="#111827" />
                      <Text style={styles.addAppBtnText}>Add App</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={[styles.runButtonInline, { backgroundColor: accentColor }]}
                    onPress={() => draftApp && openInstalledRuntime(draftApp)}
                  >
                    <Ionicons name="play" size={13} color="white" />
                    <Text style={styles.runInlineText}>Run in Chat</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <>
                <Text style={styles.examplesTitle}>TRY THESE EXAMPLES</Text>
                <View style={styles.examplesGrid}>
                  {GENERATOR_EXAMPLES.map((item) => (
                    <Pressable
                      key={`example_${item.id}`}
                      style={styles.exampleCard}
                      onPress={() => setPromptInput(item.prompt)}
                    >
                      <View style={styles.exampleIconWrap}>
                        <Ionicons name={item.icon} size={14} color="white" />
                      </View>
                      <Text style={styles.exampleTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.exampleDesc} numberOfLines={3}>
                        {item.desc}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <ScrollView style={styles.previewScroll} showsVerticalScrollIndicator={false}>
              {draftApp ? <AppPreviewCard app={draftApp} /> : null}
            </ScrollView>
          </View>
        </View>
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

            {activeRuntimeApp ? <MiniAppRuntime app={activeRuntimeApp} /> : null}

            <Pressable
              style={[styles.runtimeFooterBtn, { backgroundColor: accentColor }]}
              onPress={handleRuntimeWriteback}
            >
              <Ionicons name="return-up-forward-outline" size={14} color="white" />
              <Text style={styles.runtimeFooterBtnText}>回写摘要到聊天</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 32,
    padding: 12,
    backgroundColor: "rgba(26,30,40,0.75)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    gap: 10,
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
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  createIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
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
  createSub: {
    fontSize: 11,
    color: "rgba(226,232,240,0.72)",
  },
  createArrowWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  minusButton: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionRow: {
    gap: 8,
    paddingRight: 2,
  },
  actionCard: {
    width: 82,
    height: 78,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 4,
  },
  actionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconWrapActive: {
    backgroundColor: "rgba(34,197,94,0.55)",
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f8fafc",
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
  taskEmpty: {
    color: "rgba(203,213,225,0.6)",
    fontSize: 11,
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
  installActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  discardText: {
    color: "rgba(226,232,240,0.72)",
    fontSize: 14,
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
  examplesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
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
  exampleIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f8fafc",
  },
  exampleDesc: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    color: "rgba(203,213,225,0.74)",
  },
  previewScroll: {
    maxHeight: 420,
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
});
