import { createChatThread, markThreadRead, sendThreadMessage, setAuthToken } from "../api";
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

  it("keeps group metadata on create thread request body", async () => {
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
      groupNpcName: "Ops NPC",
      groupCommanderUserId: "user_1",
    };

    await createChatThread(payload);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/v1/chat/threads");
    expect(init.method).toBe("POST");
    const body = JSON.parse((init.body as string) || "{}") as Record<string, unknown>;
    expect(body.groupNpcName).toBe("Ops NPC");
    expect(body.groupCommanderUserId).toBe("user_1");
    expect(body.groupType).toBe("toc");
    expect(body.groupSubCategory).toBe("ops");
  });

  it("sends thread message request body with only documented fields", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({
        threadId: "thread_1",
        userMessage: { id: "msg_1", content: "hello", senderAvatar: "", type: "text", isMe: true },
      })
    );

    await sendThreadMessage("thread_1", {
      content: "hello",
      type: "image",
      imageUri: "https://cdn.example.com/a.jpg",
      imageName: "a.jpg",
      senderId: "u_1",
      senderName: "Tester",
      senderAvatar: "https://cdn.example.com/u.jpg",
      senderType: "human",
      isMe: true,
      requestAI: false,
      systemInstruction: "ignore",
      history: [{ role: "user", text: "h" }],
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/v1/chat/threads/thread_1/messages");
    expect(init.method).toBe("POST");
    const body = JSON.parse((init.body as string) || "{}") as Record<string, unknown>;
    expect(body).toEqual({
      content: "hello",
      type: "image",
      imageUri: "https://cdn.example.com/a.jpg",
      imageName: "a.jpg",
    });
  });

  it("sends mention metadata and supports mark-read", async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockResponse({
          threadId: "thread_1",
          userMessage: { id: "msg_1", content: "@All hello", senderAvatar: "", type: "text", isMe: true },
        })
      )
      .mockResolvedValueOnce(
        mockResponse({
          ok: true,
          threadId: "thread_1",
          lastReadSeqNo: 12,
          unreadCount: 0,
          mentionUnreadCount: 0,
        })
      );

    await sendThreadMessage("thread_1", {
      content: "@All hello",
      type: "text",
      mentionedMemberIds: ["member_1", "member_2"],
      mentionedAll: true,
    });
    await markThreadRead("thread_1", { lastReadSeqNo: 12 });

    const [messageUrl, messageInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(messageUrl).toBe("https://api.example.com/v1/chat/threads/thread_1/messages");
    expect(JSON.parse((messageInit.body as string) || "{}")).toEqual({
      content: "@All hello",
      type: "text",
      mentionedMemberIds: ["member_1", "member_2"],
      mentionedAll: true,
    });

    const [readUrl, readInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(readUrl).toBe("https://api.example.com/v1/chat/threads/thread_1/read");
    expect(readInit.method).toBe("POST");
    expect(JSON.parse((readInit.body as string) || "{}")).toEqual({
      lastReadSeqNo: 12,
    });
  });
});
