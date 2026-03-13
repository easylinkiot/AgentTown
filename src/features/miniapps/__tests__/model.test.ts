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

  it("prefers direct type and content fields over preview", () => {
    const app = baseApp({
      type: "task_list",
      icon: "checkmark-done-outline",
      color: "#22c55e",
      description: "Direct task content",
      content: {
        items: [
          {
            id: "task_1",
            title: "Review parity shell",
            assignee: "Jason",
            priority: "High",
            status: "In Progress",
          },
        ],
      },
      preview: {
        uiType: "news_feed",
        content: {
          items: [{ id: "news_1", title: "Ignore me" }],
        },
      },
    });

    const vm = buildMiniAppViewModel(app);

    expect(vm.uiType).toBe("task_list");
    expect(vm.description).toBe("Direct task content");
    expect(vm.taskItems[0]?.title).toBe("Review parity shell");
    expect(vm.taskItems).toHaveLength(1);
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

  it("supports task list and generative widget payloads", () => {
    const app = baseApp({
      category: "task_list",
      preview: {
        uiType: "task_list",
        content: {
          items: [
            {
              id: "task_1",
              title: "Draft launch note",
              assignee: "Owner",
              priority: "High",
              status: "Pending",
            },
          ],
        },
        lastRun: {
          outputData: {
            uiType: "generative_app",
            widgets: [{ type: "stat", label: "Ideas", value: 12, subValue: "+2" }],
          },
        },
      },
    });

    const vm = buildMiniAppViewModel(app);
    expect(vm.uiType).toBe("task_list");
    expect(vm.taskItems[0]?.title).toBe("Draft launch note");
    expect(vm.widgets[0]?.label).toBe("Ideas");
  });

  it("supports fashion designer and car caring payloads", () => {
    const fashionApp = baseApp({
      category: "fashion_designer",
      preview: {
        uiType: "fashion_designer",
        content: {
          design: {
            title: "Concept Capsule",
            inspiration: "Editorial tailoring with soft drape.",
            palette: ["Rose Smoke"],
            materials: ["Wool blend"],
            steps: ["Sketch silhouettes"],
            looks: [{ label: "Hero Look", description: "Relaxed jacket with drape skirt." }],
            renders: [{ label: "Board", image: "https://example.com/board.png" }],
          },
        },
      },
    });
    const carApp = baseApp({
      category: "car_caring",
      preview: {
        uiType: "car_caring",
        content: {
          game: {
            carName: "City Coupe",
            message: "Ready to care.",
            actions: ["Wash"],
            stats: { cleanliness: 44, fuel: 55, health: 88 },
          },
        },
      },
    });

    const fashionVM = buildMiniAppViewModel(fashionApp);
    const carVM = buildMiniAppViewModel(carApp);
    expect(fashionVM.fashionDesigner.looks[0]?.label).toBe("Hero Look");
    expect(fashionVM.fashionDesigner.renders[0]?.image).toBe("https://example.com/board.png");
    expect(carVM.carCaring.carName).toBe("City Coupe");
    expect(carVM.carCaring.stats.health).toBe(88);
  });

  it("prefers lastRun outputData.content when runtime patch is provided", () => {
    const app = baseApp({
      type: "generative_app",
      content: {
        widgets: [{ type: "stat", label: "Ideas", value: 3 }],
      },
      preview: {
        lastRun: {
          outputData: {
            uiType: "generative_app",
            content: {
              widgets: [{ type: "toggle", label: "Auto Mode", value: true }],
            },
          },
        },
      },
    });

    const vm = buildMiniAppViewModel(app);
    expect(vm.widgets[0]?.type).toBe("toggle");
    expect(vm.widgets[0]?.label).toBe("Auto Mode");
  });
});
