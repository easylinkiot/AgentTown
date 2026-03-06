import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { listV2ChatSessionMessages } from "@/src/lib/api";

import { useAuth } from "../auth-context";
import { AiChatProvider, useAiChat } from "../ai-chat-context";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

jest.mock("../auth-context", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/src/lib/api", () => ({
  listV2ChatSessionMessages: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedListV2ChatSessionMessages = listV2ChatSessionMessages as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  return <AiChatProvider>{children}</AiChatProvider>;
}

describe("ai-chat-context", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.clear();
    mockedUseAuth.mockReturnValue({
      isSignedIn: true,
      user: {
        id: "u_owner",
        displayName: "Owner",
      },
    });
  });

  it("stores v2 session messages in the ai-chat domain only", async () => {
    mockedListV2ChatSessionMessages.mockResolvedValue([
      {
        id: "msg_1",
        role: "user",
        content: "hello",
        created_at: "2026-03-06T00:00:00Z",
      },
      {
        id: "msg_2",
        role: "assistant",
        content: "hi there",
        created_at: "2026-03-06T00:00:01Z",
      },
    ]);

    const { result } = renderHook(() => useAiChat(), { wrapper });

    await act(async () => {
      await result.current.refreshSessionMessages("sess_ai_1");
    });

    await waitFor(() => expect(result.current.messagesBySession["sess_ai_1"]).toHaveLength(2));
    expect(result.current.messagesBySession["sess_ai_1"]?.[0]).toMatchObject({
      id: "msg_1",
      threadId: "sess_ai_1",
      isMe: true,
      senderType: "human",
    });
    expect(result.current.messagesBySession["sess_ai_1"]?.[1]).toMatchObject({
      id: "msg_2",
      threadId: "sess_ai_1",
      isMe: false,
      senderType: "agent",
    });
  });

  it("persists ai-chat language preferences under a separate storage namespace", async () => {
    const { result } = renderHook(() => useAiChat(), { wrapper });

    await waitFor(() =>
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(
        "agenttown.ai-chat.session.display.language:u_owner"
      )
    );

    await act(async () => {
      await result.current.updateSessionLanguage("sess_ai_1", "de");
    });

    await waitFor(() => expect(result.current.sessionLanguageById["sess_ai_1"]).toBe("de"));
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      "agenttown.ai-chat.session.display.language:u_owner",
      JSON.stringify({ sess_ai_1: "de" })
    );
  });
});
