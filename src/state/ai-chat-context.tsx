import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { listV2ChatSessionMessages, type V2ChatSessionMessage } from "@/src/lib/api";
import { ConversationMessage, ThreadDisplayLanguage } from "@/src/types";

import { useAuth } from "@/src/state/auth-context";

interface AiChatContextValue {
  messagesBySession: Record<string, ConversationMessage[]>;
  sessionLanguageById: Record<string, ThreadDisplayLanguage>;
  refreshSessionMessages: (sessionId: string) => Promise<ConversationMessage[]>;
  updateSessionLanguage: (sessionId: string, next: ThreadDisplayLanguage) => Promise<void>;
}

const AI_THREAD_LANGUAGE_STORAGE_PREFIX = "agenttown.ai-chat.session.display.language";

const AiChatContext = createContext<AiChatContextValue | null>(null);

function isThreadDisplayLanguage(value: unknown): value is ThreadDisplayLanguage {
  return value === "zh" || value === "en" || value === "de";
}

function normalizeThreadLanguageMap(value: unknown): Record<string, ThreadDisplayLanguage> {
  if (!value || typeof value !== "object") return {};
  const normalized: Record<string, ThreadDisplayLanguage> = {};
  for (const [sessionId, language] of Object.entries(value as Record<string, unknown>)) {
    const id = sessionId.trim();
    if (!id || !isThreadDisplayLanguage(language)) continue;
    normalized[id] = language;
  }
  return normalized;
}

function safeUserKey(userId: string) {
  const key = userId.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  return key || "anonymous";
}

function threadLanguageStorageKey(userId: string) {
  return `${AI_THREAD_LANGUAGE_STORAGE_PREFIX}:${safeUserKey(userId)}`;
}

function normalizeLooseDateTime(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value > 1_000_000_000_000 ? value : value * 1000;
    const parsed = new Date(millis);
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : "";
  }
  return "";
}

function sortMessagesByTime(messages: ConversationMessage[]) {
  return [...messages].sort((a, b) => {
    const at = Date.parse(a.time || "");
    const bt = Date.parse(b.time || "");
    if (Number.isFinite(at) && Number.isFinite(bt)) return at - bt;
    return 0;
  });
}

function mapV2SessionMessageToConversation(
  row: V2ChatSessionMessage,
  currentUserId: string,
  sessionId: string,
  index: number
): ConversationMessage {
  const role = (row.role || "").trim().toLowerCase();
  const isUserRole = role === "user";
  const senderName = isUserRole ? "Me" : role === "assistant" ? "Assistant" : "System";
  const senderType = isUserRole ? "human" : role === "assistant" ? "agent" : "system";
  const timestamp = normalizeLooseDateTime(row.updated_at ?? row.created_at) || new Date().toISOString();
  const fallbackId = `${sessionId}_v2_${index}_${Date.now()}`;
  return {
    id: (row.id || "").trim() || fallbackId,
    threadId: sessionId,
    senderId: isUserRole ? currentUserId : role === "assistant" ? "assistant" : "system",
    senderName,
    senderAvatar: "",
    senderType,
    content: (row.content || "").trim(),
    type: (row.message_type || "text").trim() || "text",
    isMe: isUserRole && Boolean(currentUserId),
    time: timestamp,
  };
}

export function AiChatProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, user } = useAuth();
  const userId = (user?.id || "").trim();
  const [messagesBySession, setMessagesBySession] = useState<Record<string, ConversationMessage[]>>({});
  const [sessionLanguageById, setSessionLanguageById] = useState<Record<string, ThreadDisplayLanguage>>({});

  useEffect(() => {
    let cancelled = false;

    if (!isSignedIn || !userId) {
      setMessagesBySession({});
      setSessionLanguageById({});
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(threadLanguageStorageKey(userId));
        if (cancelled) return;
        setSessionLanguageById(stored ? normalizeThreadLanguageMap(JSON.parse(stored)) : {});
      } catch {
        if (!cancelled) {
          setSessionLanguageById({});
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, userId]);

  const refreshSessionMessages = useCallback(
    async (sessionId: string) => {
      const id = sessionId.trim();
      if (!id) return [];
      const rows = await listV2ChatSessionMessages(id);
      const next = sortMessagesByTime(
        rows.map((row, index) => mapV2SessionMessageToConversation(row, userId, id, index))
      );
      setMessagesBySession((prev) => ({
        ...prev,
        [id]: next,
      }));
      return next;
    },
    [userId]
  );

  const updateSessionLanguage = useCallback(
    async (sessionId: string, nextLanguage: ThreadDisplayLanguage) => {
      const id = sessionId.trim();
      if (!id) return;
      if (sessionLanguageById[id] === nextLanguage) return;
      const nextMap = {
        ...sessionLanguageById,
        [id]: nextLanguage,
      };
      setSessionLanguageById(nextMap);
      if (!userId) return;
      try {
        await AsyncStorage.setItem(threadLanguageStorageKey(userId), JSON.stringify(nextMap));
      } catch {
        // Keep in-memory preference even if persistence fails.
      }
    },
    [sessionLanguageById, userId]
  );

  const value = useMemo<AiChatContextValue>(
    () => ({
      messagesBySession,
      sessionLanguageById,
      refreshSessionMessages,
      updateSessionLanguage,
    }),
    [messagesBySession, refreshSessionMessages, sessionLanguageById, updateSessionLanguage]
  );

  return <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>;
}

export function useAiChat() {
  const context = useContext(AiChatContext);
  if (!context) {
    throw new Error("useAiChat must be used within AiChatProvider");
  }
  return context;
}
