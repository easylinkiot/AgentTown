import {
  listChatSessionMessages,
  listChatSessions,
  mapATMessageToConversation,
  queryChatHistory,
  queryChatTargetHistory,
  setAuthToken,
} from "../api";

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

describe("chat history api", () => {
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

  it("lists chat sessions with query params", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({
        list: [
          { id: "sess_1", title: "S1", target_type: "user", target_id: "u_1" },
        ],
      })
    );

    const sessions = await listChatSessions({ targetType: "user", targetId: "u_1", limit: 20 });
    expect(sessions).toHaveLength(1);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/v1/chat/sessions?target_type=user&target_id=u_1&limit=20");
  });

  it("lists session messages with seq pagination params", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({
        list: [{ id: "m1", seq_no: 9, role: "user", content: "hi" }],
      })
    );

    const rows = await listChatSessionMessages("sess_1", {
      limit: 10,
      beforeSeqNo: 20,
      messageType: "text",
    });

    expect(rows).toHaveLength(1);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://api.example.com/v1/chat/sessions/sess_1/messages?message_type=text&before_seq_no=20&limit=10"
    );
  });

  it("queries chat history and returns pagination", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({
        list: [{ id: "m_1", role: "assistant", content: "ok" }],
        pagination: { next_cursor: "next_1" },
      })
    );

    const result = await queryChatHistory({
      targetType: "user",
      targetId: "u_1",
      pageSize: 15,
      cursor: "c_1",
    });

    expect(result.list).toHaveLength(1);
    expect(result.pagination?.next_cursor).toBe("next_1");
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/v1/chat/history?target_type=user&target_id=u_1&cursor=c_1&page_size=15");
  });

  it("queries target history with encoded path", async () => {
    fetchMock.mockResolvedValue(mockResponse({ list: [], pagination: {} }));

    await queryChatTargetHistory("user_bot", "u/1", { pageSize: 5 });
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/v1/chat/targets/user_bot/u%2F1/history?page_size=5");
  });

  it("maps AT message into conversation message shape", () => {
    const mapped = mapATMessageToConversation(
      {
        id: "m1",
        session_id: "sess_1",
        seq_no: 12,
        role: "user",
        message_type: "text",
        content: "hello",
        created_at: "2026-02-27T12:00:00Z",
      },
      "u_1"
    );

    expect(mapped).toMatchObject({
      id: "m1",
      threadId: "sess_1",
      seqNo: 12,
      isMe: true,
      content: "hello",
      type: "text",
    });
  });
});
