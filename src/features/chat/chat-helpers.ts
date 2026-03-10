import { CHAT_DATA, DEFAULT_MYBOT_AVATAR, POWERHOO_MESSAGES } from "@/src/constants/chat";
import { BotConfig, ChatThread, ConversationMessage } from "@/src/types";

const RELATIVE_CONVERSATION_TIME_LABELS = new Set(["now", "just now", "刚刚"]);

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

function isRelativeConversationTime(value: string) {
  return RELATIVE_CONVERSATION_TIME_LABELS.has((value || "").trim().toLowerCase());
}

function isTimeOnlyConversationValue(value: string) {
  return /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.test((value || "").trim());
}

export function normalizeConversationDateTime(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || isRelativeConversationTime(trimmed) || isTimeOnlyConversationValue(trimmed)) {
      return "";
    }
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value > 1_000_000_000_000 ? value : value * 1000;
    const parsed = new Date(millis);
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : "";
  }

  return "";
}

export function normalizeConversationMessageTimestamps(message: ConversationMessage): ConversationMessage {
  const raw = message as ConversationMessage & {
    created_at?: unknown;
    updated_at?: unknown;
    received_at?: unknown;
    sentAt?: unknown;
  };
  const time = typeof message.time === "string" ? message.time.trim() : "";
  const createdAt =
    normalizeConversationDateTime(message.createdAt) ||
    normalizeConversationDateTime(raw.created_at);
  const updatedAt =
    normalizeConversationDateTime(message.updatedAt) ||
    normalizeConversationDateTime(raw.updated_at);
  const receivedAt =
    normalizeConversationDateTime(message.receivedAt) ||
    normalizeConversationDateTime(raw.received_at) ||
    normalizeConversationDateTime(raw.sentAt) ||
    createdAt ||
    updatedAt;

  return {
    ...message,
    time: time || undefined,
    createdAt: createdAt || undefined,
    updatedAt: updatedAt || undefined,
    receivedAt: receivedAt || undefined,
  };
}

export function resolveConversationDisplayTimeValue(message: Pick<ConversationMessage, "time" | "createdAt" | "updatedAt" | "receivedAt">) {
  const normalized = normalizeConversationMessageTimestamps(message as ConversationMessage);
  return normalized.createdAt || normalized.updatedAt || normalized.receivedAt || normalized.time || "";
}

export function formatConversationMessageDisplayTime(
  message: Pick<ConversationMessage, "time" | "createdAt" | "updatedAt" | "receivedAt">
) {
  return formatConversationDisplayTime(resolveConversationDisplayTimeValue(message));
}

export function formatConversationDisplayTime(value: string) {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";

  if (isRelativeConversationTime(trimmed)) {
    return trimmed;
  }

  const parsed = Date.parse(trimmed);
  if (Number.isFinite(parsed)) {
    const date = new Date(parsed);
    const now = new Date();
    const sameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    if (sameDay) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    const sameYear = date.getFullYear() === now.getFullYear();
    return date.toLocaleString([], sameYear
      ? {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      : {
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  }

  const timeOnlyMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (timeOnlyMatch) {
    const hours = Number(timeOnlyMatch[1]);
    const minutes = Number(timeOnlyMatch[2]);
    const seconds = Number(timeOnlyMatch[3] || "0");
    const local = new Date();
    local.setHours(hours, minutes, seconds, 0);
    return local.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return trimmed;
}

export function parseConversationTimestamp(value: string): number | null {
  const trimmed = (value || "").trim();
  if (!trimmed) return null;
  if (isRelativeConversationTime(trimmed)) return null;

  const parsed = Date.parse(trimmed);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  const timeOnlyMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (!timeOnlyMatch) return null;

  const hours = Number(timeOnlyMatch[1]);
  const minutes = Number(timeOnlyMatch[2]);
  const seconds = Number(timeOnlyMatch[3] || "0");
  if (![hours, minutes, seconds].every((part) => Number.isFinite(part))) {
    return null;
  }

  const date = new Date();
  date.setHours(hours, minutes, seconds, 0);
  return date.getTime();
}

export function resolveConversationSortTimestamp(
  message: Pick<ConversationMessage, "time" | "createdAt" | "updatedAt" | "receivedAt">
): number | null {
  const normalized = normalizeConversationMessageTimestamps(message as ConversationMessage);
  const candidates = [
    normalized.receivedAt,
    normalized.createdAt,
    normalized.updatedAt,
    normalized.time,
  ];
  for (const candidate of candidates) {
    const parsed = parseConversationTimestamp(candidate || "");
    if (typeof parsed === "number") {
      return parsed;
    }
  }
  return null;
}

export function sortConversationMessagesChronologically(messages: ConversationMessage[]): ConversationMessage[] {
  return [...messages]
    .map((message, index) => ({
      index,
      message: normalizeConversationMessageTimestamps(message),
    }))
    .sort((left, right) => {
      const at = resolveConversationSortTimestamp(left.message);
      const bt = resolveConversationSortTimestamp(right.message);
      if (typeof at === "number" && typeof bt === "number" && at !== bt) {
        return at - bt;
      }
      if (typeof at === "number" && typeof bt !== "number") return -1;
      if (typeof bt === "number" && typeof at !== "number") return 1;

      const aSeq = typeof left.message.seqNo === "number" ? left.message.seqNo : null;
      const bSeq = typeof right.message.seqNo === "number" ? right.message.seqNo : null;
      if (aSeq !== null && bSeq !== null && aSeq !== bSeq) {
        return aSeq - bSeq;
      }
      if (aSeq !== null && bSeq === null) return -1;
      if (bSeq !== null && aSeq === null) return 1;

      const idCompare = String(left.message.id || "").localeCompare(String(right.message.id || ""));
      if (idCompare !== 0) return idCompare;

      return left.index - right.index;
    })
    .map((entry) => entry.message);
}
