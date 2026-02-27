import { createChatThread, setAuthToken } from "../api";
import type { ChatThread } from "@/src/types";

function mockResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
    headers: {
      get: () => null,
    },
  } as unknown as Response;
}

describe("chat thread api", () => {
  const originalBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://api.example.com";
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    setAuthToken("access-token");
  });

  afterEach(() => {
    setAuthToken(null);
    fetchMock.mockReset();
    process.env.EXPO_PUBLIC_API_BASE_URL = originalBaseUrl;
  });

  it("removes groupCommanderUserId from create thread request body", async () => {
    fetchMock.mockResolvedValue(mockResponse({ id: "thread_1", name: "Team Group" }));

    const payload: ChatThread = {
      id: "thread_1",
      name: "Team Group",
      avatar: "",
      message: "",
      time: "Now",
      isGroup: true,
      groupType: "toc",
      groupSubCategory: "ops",
      groupCommanderUserId: "user_1",
    };

    await createChatThread(payload);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/v1/chat/threads");
    expect(init.method).toBe("POST");
    const body = JSON.parse((init.body as string) || "{}") as Record<string, unknown>;
    expect(body.groupCommanderUserId).toBeUndefined();
    expect(body.groupType).toBe("toc");
    expect(body.groupSubCategory).toBe("ops");
  });
});
