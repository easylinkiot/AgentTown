import { MiniApp } from "@/src/types";

export type MiniToolStoreAppId =
  | "app_weather"
  | "app_calendar"
  | "app_map"
  | "app_music"
  | "app_health"
  | "app_food"
  | "app_coffee"
  | "app_shopping"
  | "app_work"
  | "app_game"
  | "app_fitness"
  | "app_video"
  | "app_camera"
  | "app_read"
  | "app_tools"
  | "app_star";

export type MiniToolQuickActionId =
  | "quick_fashion"
  | "quick_tasks"
  | "quick_news"
  | "quick_price"
  | "quick_words"
  | "quick_food"
  | "quick_ai_terms";

type InstallDescriptor = {
  presetKey?: "news" | "price" | "words";
  query?: string;
  sources?: string[];
};

export type MiniToolStoreEntry = {
  id: MiniToolStoreAppId;
  name: string;
  description: string;
  icon: string;
  accentColor: string;
  surfaceColor: string;
  install: InstallDescriptor;
};

export type MiniToolQuickAction = {
  id: MiniToolQuickActionId;
  label: string;
  icon: string;
  accentColor: string;
  actionType: "create" | "toggle_tasks";
  param: string;
  install?: InstallDescriptor;
};

const STORE_APPS: MiniToolStoreEntry[] = [
  {
    id: "app_weather",
    name: "天气预报",
    description: "实时天气与未来预报",
    icon: "cloud-outline",
    accentColor: "#334155",
    surfaceColor: "#334155",
    install: {
      query: "生成一个天气预报 Mini App：展示当前位置实时天气、未来 24 小时气温趋势、未来 7 天天气变化、穿衣建议和天气提醒卡片。",
      sources: ["weather", "forecast"],
    },
  },
  {
    id: "app_calendar",
    name: "日程安排",
    description: "管理你的每日行程",
    icon: "calendar-outline",
    accentColor: "#27272a",
    surfaceColor: "#27272a",
    install: {
      query: "生成一个日程安排 Mini App：按时间线展示今天的重要安排、提醒、冲突提示和空闲时段建议。",
      sources: ["calendar", "schedule"],
    },
  },
  {
    id: "app_map",
    name: "周边探索",
    description: "发现附近的好去处",
    icon: "map-outline",
    accentColor: "#44403c",
    surfaceColor: "#44403c",
    install: {
      query: "生成一个周边探索 Mini App：基于当前位置推荐附近值得去的地点，展示距离、评分、标签和路线建议。",
      sources: ["maps", "local"],
    },
  },
  {
    id: "app_music",
    name: "音乐电台",
    description: "根据心情推荐音乐",
    icon: "musical-notes-outline",
    accentColor: "#171717",
    surfaceColor: "#171717",
    install: {
      query: "生成一个音乐电台 Mini App：根据心情推荐音乐，展示风格、推荐曲目、节奏分布和播放建议。",
      sources: ["music", "mood"],
    },
  },
  {
    id: "app_health",
    name: "健康打卡",
    description: "记录每日运动与饮食",
    icon: "heart-outline",
    accentColor: "#1e293b",
    surfaceColor: "#1e293b",
    install: {
      query: "生成一个健康打卡 Mini App：记录每日运动、饮食、饮水和睡眠情况，输出打卡卡片和目标进度。",
      sources: ["health", "fitness"],
    },
  },
  {
    id: "app_food",
    name: "美食推荐",
    description: "不知道吃什么？问我",
    icon: "restaurant-outline",
    accentColor: "#3f3f46",
    surfaceColor: "#3f3f46",
    install: {
      query: "生成一个美食推荐 Mini App：根据当前时间、口味偏好和预算给出菜品或餐厅建议，展示推荐理由与备选项。",
      sources: ["food", "lifestyle"],
    },
  },
  {
    id: "app_coffee",
    name: "咖啡助手",
    description: "记录你的咖啡因摄入",
    icon: "cafe-outline",
    accentColor: "#57534e",
    surfaceColor: "#57534e",
    install: {
      query: "生成一个咖啡助手 Mini App：记录咖啡因摄入、推荐下次饮用时间，并展示今日摄入趋势。",
      sources: ["coffee", "health"],
    },
  },
  {
    id: "app_shopping",
    name: "购物清单",
    description: "买买买不遗漏",
    icon: "bag-handle-outline",
    accentColor: "#404040",
    surfaceColor: "#404040",
    install: {
      query: "生成一个购物清单 Mini App：整理待购商品、购买优先级、预算和提醒事项。",
      sources: ["shopping", "productivity"],
    },
  },
  {
    id: "app_work",
    name: "番茄钟",
    description: "专注工作与学习",
    icon: "briefcase-outline",
    accentColor: "#0f172a",
    surfaceColor: "#0f172a",
    install: {
      query: "生成一个番茄钟 Mini App：展示当前专注周期、休息提醒、番茄统计和今日专注目标。",
      sources: ["productivity", "focus"],
    },
  },
  {
    id: "app_game",
    name: "摸鱼小游戏",
    description: "放松一下大脑",
    icon: "game-controller-outline",
    accentColor: "#18181b",
    surfaceColor: "#18181b",
    install: {
      query: "生成一个摸鱼小游戏 Mini App：提供轻量互动小游戏、分数、记录和今日挑战。",
      sources: ["games", "fun"],
    },
  },
  {
    id: "app_fitness",
    name: "健身计划",
    description: "定制你的锻炼目标",
    icon: "barbell-outline",
    accentColor: "#1c1917",
    surfaceColor: "#1c1917",
    install: {
      query: "生成一个健身计划 Mini App：按目标生成锻炼安排、每周计划、训练动作和恢复建议。",
      sources: ["fitness", "health"],
    },
  },
  {
    id: "app_video",
    name: "短视频精选",
    description: "每日热门短视频",
    icon: "videocam-outline",
    accentColor: "#171717",
    surfaceColor: "#171717",
    install: {
      query: "生成一个短视频精选 Mini App：汇总今日热门短视频主题，展示分类、热度和观看建议。",
      sources: ["video", "trending"],
    },
  },
  {
    id: "app_camera",
    name: "AI相机",
    description: "智能滤镜与修图",
    icon: "camera-outline",
    accentColor: "#334155",
    surfaceColor: "rgba(51,65,85,0.55)",
    install: {
      query: "生成一个 AI 相机 Mini App：展示智能滤镜、修图建议、拍摄参数和场景推荐。",
      sources: ["camera", "ai"],
    },
  },
  {
    id: "app_read",
    name: "每日阅读",
    description: "精选文章与书籍推荐",
    icon: "book-outline",
    accentColor: "#27272a",
    surfaceColor: "rgba(39,39,42,0.55)",
    install: {
      query: "生成一个每日阅读 Mini App：推荐精选文章与书籍，输出摘要、主题标签和阅读时间建议。",
      sources: ["reading", "books"],
    },
  },
  {
    id: "app_tools",
    name: "实用工具箱",
    description: "计算器、汇率等小工具",
    icon: "flash-outline",
    accentColor: "#44403c",
    surfaceColor: "rgba(68,64,60,0.55)",
    install: {
      query: "生成一个实用工具箱 Mini App：集合汇率、计算器、单位换算和常用效率工具卡片。",
      sources: ["tools", "utility"],
    },
  },
  {
    id: "app_star",
    name: "星座运势",
    description: "查看今日星座运势",
    icon: "star-outline",
    accentColor: "#262626",
    surfaceColor: "rgba(38,38,38,0.55)",
    install: {
      query: "生成一个星座运势 Mini App：展示今日运势、爱情、工作、幸运色和建议行动。",
      sources: ["astro", "daily"],
    },
  },
];

const QUICK_ACTIONS: MiniToolQuickAction[] = [
  {
    id: "quick_fashion",
    label: "设计",
    icon: "shirt-outline",
    accentColor: "#db2777",
    actionType: "create",
    param: "fashion",
    install: {
      query: "生成一个服装设计 Mini App：用于输入设计需求、上传参考图并输出效果图和生产方案。",
      sources: ["fashion", "design"],
    },
  },
  {
    id: "quick_tasks",
    label: "待办",
    icon: "checkmark-done-outline",
    accentColor: "#22c55e",
    actionType: "toggle_tasks",
    param: "",
  },
  {
    id: "quick_news",
    label: "情报中心",
    icon: "eye-outline",
    accentColor: "#6366f1",
    actionType: "create",
    param: "news",
    install: {
      presetKey: "news",
    },
  },
  {
    id: "quick_price",
    label: "比价",
    icon: "pricetag-outline",
    accentColor: "#f97316",
    actionType: "create",
    param: "price",
    install: {
      presetKey: "price",
    },
  },
  {
    id: "quick_words",
    label: "单词",
    icon: "book-outline",
    accentColor: "#8b5cf6",
    actionType: "create",
    param: "words",
    install: {
      presetKey: "words",
    },
  },
  {
    id: "quick_food",
    label: "点餐",
    icon: "restaurant-outline",
    accentColor: "#ef4444",
    actionType: "create",
    param: "food",
    install: {
      query: "生成一个点餐 Mini App：根据人数、预算和口味快速推荐菜品组合、热销菜和下单建议。",
      sources: ["food", "ordering"],
    },
  },
  {
    id: "quick_ai_terms",
    label: "AI术语",
    icon: "hardware-chip-outline",
    accentColor: "#2563eb",
    actionType: "create",
    param: "ai_terms",
    install: {
      query: "生成一个 AI 术语 Mini App：用卡片解释常见 AI 术语、场景、相近概念和记忆提示。",
      sources: ["ai", "learning"],
    },
  },
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function getMiniToolStoreEntries() {
  return STORE_APPS;
}

export function getMiniToolQuickActions() {
  return QUICK_ACTIONS;
}

export function findInstalledAppForDescriptor(miniApps: MiniApp[], install?: InstallDescriptor) {
  if (!install) return null;
  const normalizedQuery = normalize(install.query || "");
  const matches = miniApps.filter((app) => {
    if (install.presetKey && normalize(app.presetKey || "") === install.presetKey) {
      return true;
    }
    if (!normalizedQuery) return false;
    return normalize(app.query || "") === normalizedQuery;
  });
  if (matches.length === 0) return null;
  const installed = matches.find((item) => item.installed);
  if (installed) return installed;
  return matches
    .slice()
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))[0] || null;
}
