import { buildMiniToolCatalog, filterMiniToolCatalog } from "@/src/features/miniapps/catalog";
import { MiniApp, MiniAppTemplate } from "@/src/types";

function app(overrides?: Partial<MiniApp>): MiniApp {
  return {
    id: "mini_1",
    name: "AI Brief",
    summary: "Summary",
    query:
      "生成一个新闻早报 Mini App：每2小时采集 Reddit、TechCrunch、GitHub Trending 的 AI 热点。海报包含头条主卡（热度分）、4条快讯、主题标签、关键洞察和今日行动建议。",
    sources: ["reddit", "github"],
    category: "news_feed",
    status: "installed",
    installed: true,
    progress: 100,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    preview: {},
    ...overrides,
  };
}

describe("mini tool catalog", () => {
  it("merges presets with backend templates", () => {
    const templates: MiniAppTemplate[] = [
      {
        id: "tpl_code",
        name: "Code Helper",
        category: "engineering",
        description: "Generate coding assistant mini app.",
        icon: "code-slash-outline",
        accentColor: "#38bdf8",
        query: "生成一个 Code Helper Mini App：聚合代码片段、命令建议、调试检查清单和今日开发重点，输出卡片化工程助手面板。",
        sources: ["github", "docs"],
        previewUiType: "dashboard",
      },
    ];

    const items = buildMiniToolCatalog("zh", [], templates);
    expect(items.some((item) => item.id === "preset:news")).toBe(true);
    expect(items.some((item) => item.id === "template:tpl_code")).toBe(true);
  });

  it("matches installed app by presetKey first", () => {
    const items = buildMiniToolCatalog("zh", [app({ presetKey: "news" })], []);
    const news = items.find((item) => item.id === "preset:news");
    expect(news?.installedApp?.id).toBe("mini_1");
  });

  it("matches template by exact query and supports search", () => {
    const templates: MiniAppTemplate[] = [
      {
        id: "tpl_follow_up",
        name: "Follow-up Radar",
        category: "productivity",
        description: "Find threads with no reply.",
        query: "生成一个未回复随访 Mini App：识别超过 3 天未回复的重要对话，输出优先级、建议话术和最佳跟进时间窗口，采用海报卡片展示。",
      },
    ];
    const items = buildMiniToolCatalog(
      "zh",
      [
        app({
          id: "mini_follow",
          presetKey: undefined,
          query: "生成一个未回复随访 Mini App：识别超过 3 天未回复的重要对话，输出优先级、建议话术和最佳跟进时间窗口，采用海报卡片展示。",
          installed: false,
          status: "generated",
        }),
      ],
      templates
    );
    const follow = items.find((item) => item.id === "template:tpl_follow_up");
    expect(follow?.linkedApp?.id).toBe("mini_follow");

    const filtered = filterMiniToolCatalog(items, "随访");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("template:tpl_follow_up");
  });
});
