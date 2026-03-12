import type { ChatThread } from "@/src/types";

export type SocialChatRouteMode = "direct" | "group";

type SocialChatRouteInput = {
  id: string;
  name?: string;
  avatar?: string;
  isGroup?: boolean;
  highlightMessageId?: string;
};

function normalizeRouteMode(isGroup?: boolean): SocialChatRouteMode {
  return isGroup ? "group" : "direct";
}

export function resolveSocialChatRouteMode(
  thread?: Pick<ChatThread, "isGroup" | "targetType"> | null
): SocialChatRouteMode {
  const targetType = (thread?.targetType || "").trim().toLowerCase();
  return normalizeRouteMode(Boolean(thread?.isGroup) || targetType === "group");
}

export function resolveSocialChatRoutePath(mode: SocialChatRouteMode) {
  return mode === "group" ? "/group-chat/[id]" : "/chat/[id]";
}

export function buildSocialChatRoute(input: SocialChatRouteInput) {
  const mode = normalizeRouteMode(input.isGroup);
  return {
    pathname: resolveSocialChatRoutePath(mode) as "/chat/[id]" | "/group-chat/[id]",
    params: {
      id: input.id,
      name: input.name || "",
      avatar: input.avatar || "",
      isGroup: mode === "group" ? "true" : "false",
      highlightMessageId: input.highlightMessageId || "",
    },
  };
}
