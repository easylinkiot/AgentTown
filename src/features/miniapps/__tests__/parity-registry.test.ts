import { findInstalledAppForDescriptor, getMiniToolQuickActions, getMiniToolStoreEntries } from "@/src/features/miniapps/parity-registry";
import { MiniApp } from "@/src/types";

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

describe("mini tool parity registry", () => {
  it("exposes mybot-style store entries and quick actions", () => {
    expect(getMiniToolStoreEntries()).toHaveLength(16);
    expect(getMiniToolQuickActions()).toHaveLength(7);
  });

  it("matches preset-based quick actions against installed apps", () => {
    const quickNews = getMiniToolQuickActions().find((item) => item.id === "quick_news");
    const installed = findInstalledAppForDescriptor([app({ presetKey: "news" })], quickNews?.install);
    expect(installed?.id).toBe("mini_1");
  });

  it("matches query-based store apps against generated apps", () => {
    const weather = getMiniToolStoreEntries().find((item) => item.id === "app_weather");
    const installed = findInstalledAppForDescriptor(
      [
        app({
          id: "mini_weather",
          query: weather?.install.query || "",
          status: "generated",
          installed: false,
        }),
      ],
      weather?.install
    );
    expect(installed?.id).toBe("mini_weather");
  });
});
