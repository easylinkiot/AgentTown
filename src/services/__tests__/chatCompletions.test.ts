/* eslint-disable import/first */

let latestClientConfig: any;

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
      this.config.onCustomEvent?.("message_delta", {
        data: JSON.stringify({ delta: { text: "Hel" } }),
      });
      this.config.onCustomEvent?.("message_delta", {
        data: JSON.stringify({ delta: { text: "lo" } }),
      });
      this.config.onCustomEvent?.("done", {
        data: JSON.stringify({ ok: true }),
      });
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
    expect(latestClientConfig?.url).toContain("/v1/chat/completions");
    expect(latestClientConfig?.method).toBe("POST");
  });
});
