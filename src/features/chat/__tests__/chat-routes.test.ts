import { buildSocialChatRoute, resolveSocialChatRouteMode, resolveSocialChatRoutePath } from "@/src/features/chat/chat-routes";

describe("chat-routes", () => {
  it("routes group threads to group-chat", () => {
    expect(resolveSocialChatRouteMode({ isGroup: true })).toBe("group");
    expect(resolveSocialChatRoutePath("group")).toBe("/group-chat/[id]");
    expect(
      buildSocialChatRoute({
        id: "thread_group_1",
        name: "General",
        avatar: "avatar",
        isGroup: true,
      })
    ).toEqual({
      pathname: "/group-chat/[id]",
      params: {
        id: "thread_group_1",
        name: "General",
        avatar: "avatar",
        isGroup: "true",
        highlightMessageId: "",
      },
    });
  });

  it("keeps direct threads on chat", () => {
    expect(resolveSocialChatRouteMode({ isGroup: false })).toBe("direct");
    expect(resolveSocialChatRoutePath("direct")).toBe("/chat/[id]");
    expect(
      buildSocialChatRoute({
        id: "thread_direct_1",
        name: "Alice",
        isGroup: false,
        highlightMessageId: "msg_1",
      })
    ).toEqual({
      pathname: "/chat/[id]",
      params: {
        id: "thread_direct_1",
        name: "Alice",
        avatar: "",
        isGroup: "false",
        highlightMessageId: "msg_1",
      },
    });
  });
});
