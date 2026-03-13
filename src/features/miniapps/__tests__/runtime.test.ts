import { extractMiniAppRuntimeContent, getMiniAppRuntimeType, mergeMiniAppRuntimeContent } from "@/src/features/miniapps/runtime";
import { MiniApp } from "@/src/types";

function baseApp(overrides?: Partial<MiniApp>): MiniApp {
  return {
    id: "mini_runtime",
    name: "Runtime App",
    summary: "Summary",
    query: "query",
    sources: [],
    category: "generative_app",
    type: "generative_app",
    status: "generated",
    installed: true,
    progress: 100,
    content: {
      widgets: [{ type: "stat", label: "Ideas", value: 4 }],
    },
    preview: {},
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("miniapps runtime helpers", () => {
  it("extracts explicit content patch and legacy top-level fields", () => {
    const result = extractMiniAppRuntimeContent({
      content: {
        widgets: [{ type: "stat", label: "Ideas", value: 6 }],
      },
      blocks: [{ id: "b1", kind: "json" }],
    });

    expect(result.widgets).toEqual([{ type: "stat", label: "Ideas", value: 6 }]);
    expect(result.blocks).toEqual([{ id: "b1", kind: "json" }]);
  });

  it("merges runtime content into existing app content", () => {
    const merged = mergeMiniAppRuntimeContent(baseApp(), {
      content: {
        widgets: [{ type: "toggle", label: "Auto Mode", value: true }],
        blocks: [{ id: "run_blocks", kind: "json" }],
      },
    });

    expect(merged.widgets).toEqual([{ type: "toggle", label: "Auto Mode", value: true }]);
    expect(merged.blocks).toEqual([{ id: "run_blocks", kind: "json" }]);
  });

  it("prefers output uiType when available", () => {
    expect(getMiniAppRuntimeType(baseApp(), { uiType: "task_list" })).toBe("task_list");
    expect(getMiniAppRuntimeType(baseApp(), {})).toBe("generative_app");
  });
});
