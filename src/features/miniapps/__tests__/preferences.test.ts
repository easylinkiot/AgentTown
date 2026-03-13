import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";

import { loadHiddenMiniToolQuickActions, saveHiddenMiniToolQuickActions } from "@/src/features/miniapps/preferences";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

describe("miniapps preferences", () => {
  beforeEach(() => {
    mockAsyncStorage.clear();
  });

  it("persists hidden quick action ids per user", async () => {
    await saveHiddenMiniToolQuickActions("user_1", ["quick_news", "quick_price", "quick_news"]);
    expect(await loadHiddenMiniToolQuickActions("user_1")).toEqual(["quick_news", "quick_price"]);
  });

  it("falls back to guest scope and tolerates invalid data", async () => {
    await mockAsyncStorage.setItem("agenttown:miniapps:hidden-quick-actions:guest", "{bad-json");
    expect(await loadHiddenMiniToolQuickActions()).toEqual([]);
  });
});
