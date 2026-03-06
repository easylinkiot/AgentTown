/* eslint-disable import/first */

let latestClientConfig: any;
let mockStreamEvents: Array<
  | { kind: "custom"; eventName: string; payload: unknown }
  | { kind: "message"; payload: unknown }
>;

jest.mock("@/src/lib/api", () => ({
  getAuthToken: jest.fn(() => null),
}));

jest.mock("@/src/lib/sse-client", () => ({
  SSEClient: class MockSSEClient {
    private config: any;
    constructor(config: any) {
      this.config = config;
      latestClientConfig = config;
    }
    start() {
      for (const event of mockStreamEvents) {
        if (event.kind === "message") {
          this.config.onMessage?.({
            data: JSON.stringify(event.payload),
          });
          continue;
        }
        this.config.onCustomEvent?.(event.eventName, {
          data: JSON.stringify(event.payload),
        });
      }
    }
    stop() {
      return undefined;
    }
  },
}));

import { runChatCompletions } from "../chatAssist";

describe("chat completions stream", () => {
  beforeEach(() => {
    latestClientConfig = null;
    mockStreamEvents = [
      { kind: "custom", eventName: "message_delta", payload: { delta: { text: "Hel" } } },
      { kind: "custom", eventName: "message_delta", payload: { delta: { text: "lo" } } },
      { kind: "custom", eventName: "done", payload: { ok: true } },
    ];
  });

  it("aggregates text from SSE delta events", async () => {
    let latest = "";
    await runChatCompletions(
      {
        input: "hello",
      },
      {
        onText: (text) => {
          latest = text;
        },
      }
    );

    expect(latest).toBe("Hello");
    expect(latestClientConfig?.url).toContain("/v2/chat/completions");
    expect(latestClientConfig?.method).toBe("POST");
    expect(JSON.parse(String(latestClientConfig?.body))).toEqual({
      message: { text: "hello" },
      knowledge_enabled: false,
      stream: true,
    });
  });

  it("does not duplicate text when a full message event arrives after deltas", async () => {
    mockStreamEvents = [
      { kind: "custom", eventName: "message_delta", payload: { delta: { text: "如果你有需求可以随时找我帮忙" } } },
      { kind: "custom", eventName: "message_delta", payload: { delta: { text: "噢;" } } },
      { kind: "message", payload: { text: "如果你有需求可以随时找我帮忙噢;" } },
      { kind: "custom", eventName: "done", payload: { ok: true } },
    ];

    const snapshots: string[] = [];
    await runChatCompletions(
      {
        input: "hello",
      },
      {
        onText: (text) => {
          snapshots.push(text);
        },
      }
    );

    expect(snapshots).toEqual([
      "如果你有需求可以随时找我帮忙",
      "如果你有需求可以随时找我帮忙噢;",
      "如果你有需求可以随时找我帮忙噢;",
    ]);
  });
});
