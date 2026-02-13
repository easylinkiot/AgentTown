import { CHAT_DATA, DEFAULT_MYBOT_AVATAR, POWERHOO_MESSAGES } from "@/src/constants/chat";
import { BotConfig, ChatThread, ConversationMessage } from "@/src/types";

export function resolveChatThread(id: string, botConfig: BotConfig): ChatThread {
  if (id === "mybot") {
    return {
      id: "mybot",
      name: botConfig.name,
      avatar: botConfig.avatar || DEFAULT_MYBOT_AVATAR,
      message: "",
      time: "Now",
    };
  }

  return (
    CHAT_DATA.find((item) => item.id === id) ?? {
      id,
      name: "Unknown Chat",
      avatar: DEFAULT_MYBOT_AVATAR,
      message: "",
      time: "Now",
    }
  );
}

export function getInitialConversation(
  id: string,
  thread: ChatThread
): ConversationMessage[] {
  if (id === "group_14") {
    return POWERHOO_MESSAGES;
  }

  return [
    {
      id: "init",
      senderName: thread.name,
      senderAvatar: thread.avatar,
      content: "Hello! How can I help you today?",
      type: "text",
      isMe: false,
      time: "Just now",
    },
  ];
}

export function formatNowTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
