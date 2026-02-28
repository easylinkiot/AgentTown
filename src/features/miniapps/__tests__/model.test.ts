import { buildMiniAppViewModel } from "@/src/features/miniapps/model";
import { MiniApp } from "@/src/types";

function baseApp(overrides?: Partial<MiniApp>): MiniApp {
  return {
    id: "mini_1",
    name: "Test App",
    summary: "Summary",
    query: "test query",
    sources: ["github"],
    category: "dashboard",
    status: "generated",
    installed: false,
    progress: 100,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    preview: {},
    ...overrides,
  };
}

describe("buildMiniAppViewModel", () => {
  it("parses preview uiType and content", () => {
    const app = baseApp({
      preview: {
        uiType: "news_feed",
        content: {
          items: [
            {
              id: "n1",
              title: "headline",
              source: "Tech",
              time: "1h",
              summary: "quick summary",
            },
          ],
        },
      },
    });

    const vm = buildMiniAppViewModel(app);
    expect(vm.uiType).toBe("news_feed");
    expect(vm.newsItems).toHaveLength(1);
    expect(vm.newsItems[0]?.title).toBe("headline");
  });

  it("falls back to category type when preview type missing", () => {
    const app = baseApp({
      category: "price_tracker",
      preview: {
        content: {
          items: [{ id: "p1", product: "Item", price: 99, originalPrice: 129, trend: "down", retailer: "Store" }],
        },
      },
    });

    const vm = buildMiniAppViewModel(app);
    expect(vm.uiType).toBe("price_tracker");
    expect(vm.priceItems[0]?.product).toBe("Item");
  });

  it("supports custom block rendering payload", () => {
    const app = baseApp({
      category: "custom",
      preview: {
        uiType: "custom",
        content: {
          blocks: [
            { id: "b1", kind: "title", text: "My Custom App" },
            { id: "b2", kind: "paragraph", text: "This comes from free-form prompt." },
          ],
        },
      },
    });

    const vm = buildMiniAppViewModel(app);
    expect(vm.uiType).toBe("generic");
    expect(vm.genericBlocks).toHaveLength(2);
    expect(vm.genericBlocks[0]?.kind).toBe("title");
  });

  it("parses richer poster fields for typed miniapps", () => {
    const app = baseApp({
      category: "price_tracker",
      preview: {
        uiType: "price_tracker",
        content: {
          items: [
            {
              id: "p2",
              product: "Keyboard",
              price: 79,
              originalPrice: 119,
              trend: "down",
              retailer: "Amazon",
              discountPct: 34,
              note: "Weekend deal",
            },
          ],
        },
        lastRun: {
          outputData: {
            card: {
              word: "Resilient",
              pronunciation: "/rɪˈzɪliənt/",
              definition: "Able to recover quickly.",
              memoryTip: "Think 're-silient' = bounce back.",
              collocations: ["resilient system"],
            },
          },
        },
      },
    });

    const vm = buildMiniAppViewModel(app);
    expect(vm.priceItems[0]?.discountPct).toBe(34);
    expect(vm.priceItems[0]?.note).toBe("Weekend deal");
    expect(vm.flashcard.memoryTip).toBe("Think 're-silient' = bounce back.");
    expect(vm.flashcard.collocations[0]).toBe("resilient system");
  });
});
