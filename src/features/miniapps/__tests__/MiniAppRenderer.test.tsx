import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { MiniAppRenderer } from "@/src/features/miniapps/MiniAppRenderer";
import { useAgentTown } from "@/src/state/agenttown-context";
import { MiniApp } from "@/src/types";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock("react-native-svg", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  const Mock = ({ children }: { children?: React.ReactNode }) => <View>{children}</View>;
  return {
    __esModule: true,
    default: Mock,
    Circle: Mock,
    Defs: Mock,
    LinearGradient: Mock,
    Polygon: Mock,
    Polyline: Mock,
    Stop: Mock,
  };
});

jest.mock("@/src/state/agenttown-context", () => ({
  useAgentTown: jest.fn(),
}));

jest.mock("@/src/lib/api", () => ({
  formatApiError: (error: unknown) => (error instanceof Error ? error.message : String(error)),
}));

const mockedUseAgentTown = useAgentTown as jest.Mock;
const mockRunMiniApp = jest.fn();

function baseApp(overrides?: Partial<MiniApp>): MiniApp {
  return {
    id: "mini_test",
    name: "Test App",
    summary: "Summary",
    query: "test query",
    sources: ["github"],
    category: "custom",
    status: "generated",
    installed: true,
    progress: 100,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    preview: {},
    ...overrides,
  };
}

describe("MiniAppRenderer", () => {
  beforeEach(() => {
    mockRunMiniApp.mockReset();
    mockRunMiniApp.mockResolvedValue(null);
    mockedUseAgentTown.mockReturnValue({
      runMiniApp: mockRunMiniApp,
    });
  });

  it("renders news feed parity layout", () => {
    render(
      <MiniAppRenderer
        app={baseApp({
          type: "news_feed",
          content: {
            items: [
              {
                id: "news_1",
                title: "Agent orchestration patterns",
                source: "TechCrunch",
                time: "2h",
                summary: "Covers routing, memory, and eval pipelines.",
                tag: "AI",
                heat: 94,
              },
            ],
          },
        })}
      />
    );

    expect(screen.getByText("Agent orchestration patterns")).toBeTruthy();
    expect(screen.getByText("热度指数")).toBeTruthy();
  });

  it("renders price tracker parity controls", () => {
    render(
      <MiniAppRenderer
        app={baseApp({
          type: "price_tracker",
          content: {
            items: [
              {
                id: "price_1",
                product: "Running Shoes",
                price: 119,
                originalPrice: 149,
                trend: "down",
                retailer: "Nike",
                discountPct: 20,
              },
            ],
          },
        })}
      />
    );

    expect(screen.getByText("全部")).toBeTruthy();
    expect(screen.getByText("鞋履")).toBeTruthy();
    expect(screen.getByText("查看详情")).toBeTruthy();
  });

  it("renders fashion designer input and result sections", () => {
    render(
      <MiniAppRenderer
        app={baseApp({
          type: "fashion_designer",
          content: {
            design: {
              title: "Concept Capsule",
              inspiration: "Editorial tailoring with soft drape.",
              palette: ["Rose Smoke"],
              materials: ["Wool blend"],
              steps: ["Sketch silhouettes"],
              looks: [{ label: "Hero Look", description: "Relaxed jacket with drape skirt." }],
              renders: [
                { label: "Board A", image: "https://example.com/board-a.png" },
                { label: "Board B", image: "https://example.com/board-b.png" },
              ],
            },
          },
        })}
      />
    );

    expect(screen.getByText("设计需求")).toBeTruthy();
    expect(screen.getByText("生产方案")).toBeTruthy();
    expect(screen.getByText("开始生成设计")).toBeTruthy();
  });

  it("routes flashcard next action through runtime api", async () => {
    render(
      <MiniAppRenderer
        app={baseApp({
          type: "flashcard",
          content: {
            card: {
              word: "Serendipity",
              pronunciation: "/ˌser.ənˈdɪp.ə.ti/",
              definition: "A fortunate discovery made by accident.",
              example: "We discovered the fix by pure serendipity.",
              synonyms: ["chance"],
              antonyms: ["design"],
              collocations: ["happy serendipity"],
            },
          },
        })}
      />
    );

    fireEvent.press(screen.getByText("下一个"));

    await waitFor(() => {
      expect(mockRunMiniApp).toHaveBeenCalledWith(
        "mini_test",
        "",
        expect.objectContaining({
          action: "next_flashcard",
          currentWord: "Serendipity",
        })
      );
    });
  });

  it("routes task toggle through runtime api", async () => {
    render(
      <MiniAppRenderer
        app={baseApp({
          type: "task_list",
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
        })}
      />
    );

    fireEvent.press(screen.getByText("Draft launch note"));

    await waitFor(() => {
      expect(mockRunMiniApp).toHaveBeenCalledWith(
        "mini_test",
        "Draft launch note",
        expect.objectContaining({
          action: "toggle_task",
          taskId: "task_1",
          nextStatus: "Done",
        })
      );
    });
  });

  it("routes widget toggle through runtime api", async () => {
    render(
      <MiniAppRenderer
        app={baseApp({
          type: "generative_app",
          content: {
            widgets: [{ type: "toggle", label: "Auto Mode", value: false, icon: "flash-outline" }],
          },
        })}
      />
    );

    fireEvent.press(screen.getByTestId("miniapp-widget-toggle-0"));

    await waitFor(() => {
      expect(mockRunMiniApp).toHaveBeenCalledWith(
        "mini_test",
        "",
        expect.objectContaining({
          action: "toggle_widget",
          widgetLabel: "Auto Mode",
          nextValue: true,
        })
      );
    });
  });
});
