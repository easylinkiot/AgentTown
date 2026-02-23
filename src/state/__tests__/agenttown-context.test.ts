import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";

import { BotConfig, ChatThread } from "@/src/types";

import { isMyBotThreadId, syncMyBotThreads } from "../agenttown-context";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

const config: BotConfig = {
  name: "Nova",
  avatar: "https://example.com/nova.png",
  systemInstruction: "You are Nova.",
  documents: [],
  installedSkillIds: [],
  knowledgeKeywords: [],
};

describe("agenttown-context bot thread sync helpers", () => {
  it("detects mybot thread ids", () => {
    expect(isMyBotThreadId("mybot")).toBe(true);
    expect(isMyBotThreadId("agent_mybot")).toBe(true);
    expect(isMyBotThreadId("agent_userbot_123")).toBe(true);
    expect(isMyBotThreadId("thread_abc")).toBe(false);
  });

  it("syncs mybot thread name and avatar from bot config", () => {
    const threads: ChatThread[] = [
      { id: "mybot", name: "MyBot", avatar: "old-avatar", message: "", time: "Now" },
      { id: "thread_1", name: "General", avatar: "group-avatar", message: "", time: "Now", isGroup: true },
    ];

    const next = syncMyBotThreads(threads, config);

    expect(next[0].name).toBe("Nova");
    expect(next[0].avatar).toBe("https://example.com/nova.png");
    expect(next[1]).toEqual(threads[1]);
  });

  it("returns the original array when no mybot thread fields changed", () => {
    const threads: ChatThread[] = [
      {
        id: "mybot",
        name: "Nova",
        avatar: "https://example.com/nova.png",
        message: "",
        time: "Now",
      },
    ];

    const next = syncMyBotThreads(threads, config);
    expect(next).toBe(threads);
  });
});
