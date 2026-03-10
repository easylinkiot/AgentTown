import {
  applyMentionSelection,
  buildMentionPickerItems,
  filterMentionPickerItems,
  formatMentionValue,
  shouldOpenMentionPicker,
} from "@/src/features/chat/mention-picker";
import type { Friend, NPC } from "@/src/types";

describe("mention picker helpers", () => {
  it("opens while an @ mention token is actively being typed", () => {
    expect(shouldOpenMentionPicker("@")).toBe(true);
    expect(shouldOpenMentionPicker("@hello")).toBe(true);
    expect(shouldOpenMentionPicker("hello @world")).toBe(true);
    expect(shouldOpenMentionPicker(" @hello")).toBe(true);
    expect(shouldOpenMentionPicker("请找@小爱")).toBe(true);
    expect(shouldOpenMentionPicker("@hello thanks")).toBe(false);
    expect(shouldOpenMentionPicker("@2244661996 感谢您的请求")).toBe(false);
    expect(shouldOpenMentionPicker("test@example.com")).toBe(false);
  });

  it("builds a merged user and npc list while excluding bot friends", () => {
    const friends: Friend[] = [
      { id: "friend_1", name: "小明", avatar: "user://1", kind: "human" },
      { id: "friend_2", name: "Bot Friend", avatar: "bot://1", kind: "bot" },
    ];
    const npcs: NPC[] = [
      {
        id: "npc_1",
        name: "NPC-A",
        avatarUrl: "npc://1",
        intro: "",
        systemPrompt: "",
        skillBindings: [],
        knowledgeIds: [],
        createdAt: "",
        updatedAt: "",
        scope: "user",
      },
    ];
    const items = buildMentionPickerItems(
      friends,
      npcs
    );

    expect(items).toEqual([
      {
        key: "user:friend_1",
        id: "friend_1",
        name: "小明",
        avatar: "user://1",
        type: "user",
        subtitle: "",
      },
      {
        key: "npc:npc_1",
        id: "npc_1",
        name: "NPC-A",
        avatar: "npc://1",
        type: "npc",
        subtitle: "",
      },
    ]);
  });

  it("filters mention items by fuzzy name matching", () => {
    const items = [
      { key: "user:1", id: "1", name: "小明", type: "user" as const },
      { key: "user:2", id: "2", name: "Alice Chen", type: "user" as const },
      { key: "npc:1", id: "3", name: "NPC-A", type: "npc" as const },
    ];

    expect(filterMentionPickerItems(items, "")).toEqual(items);
    expect(filterMentionPickerItems(items, "小")).toEqual([items[0]]);
    expect(filterMentionPickerItems(items, "chen")).toEqual([items[1]]);
    expect(filterMentionPickerItems(items, "npc")).toEqual([items[2]]);
  });

  it("formats a single mention without trailing spaces", () => {
    expect(formatMentionValue(["小明"])).toBe("@小明");
  });

  it("formats multiple mentions with single spaces", () => {
    expect(formatMentionValue(["小明", "小红", "NPC-A"])).toBe("@小明 @小红 @NPC-A");
  });

  it("replaces the current @ draft with selected mention names", () => {
    expect(
      applyMentionSelection("@hello", [
        { name: "小明" },
        { name: "小红" },
      ])
    ).toBe("@小明 @小红");
  });
});
