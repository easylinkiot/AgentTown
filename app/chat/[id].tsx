import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  GestureResponderEvent,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { GiftedChat, IMessage, MessageProps, SystemMessageProps } from "react-native-gifted-chat";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { KeyframeBackground } from "@/src/components/KeyframeBackground";
import { EmptyState, LoadingSkeleton, StateBanner } from "@/src/components/StateBlocks";
import { APP_SAFE_AREA_EDGES } from "@/src/constants/safe-area";
import { tx } from "@/src/i18n/translate";
import {
  aiText,
  discoverUsers as discoverUsersApi,
  formatApiError,
  listAgents as listAgentsApi,
  listFriends as listFriendsApi,
  type DiscoverUser,
} from "@/src/lib/api";
import { useAgentTown } from "@/src/state/agenttown-context";
import { useAuth } from "@/src/state/auth-context";
import { Agent, ConversationMessage, Friend, ThreadMember } from "@/src/types";

type MemberFilter = "all" | "human" | "agent" | "role";
type GiftedMessage = IMessage & { raw: ConversationMessage };
type SystemMessageRenderProps = { currentMessage?: GiftedMessage | null };

const MESSAGE_FALLBACK_GAP = 1000;
const DEV_STREAM_CHUNK_SIZE = 1;
const DEV_STREAM_INTERVAL_MS = 50;

function mentionMemberIDs(text: string, members: ThreadMember[]) {
  const safe = text.trim();
  if (!safe) return [] as string[];

  const ids: string[] = [];
  for (const member of members) {
    const name = member.name?.trim();
    if (!name) continue;
    if (safe.includes(`@${name}`)) {
      ids.push(member.id);
    }
  }
  return ids;
}

function toGiftedMessage(
  message: ConversationMessage,
  currentUserId: string,
  fallbackTime: number
): GiftedMessage {
  const senderID = (message.senderId || "").trim();
  const isMe = senderID !== "" && currentUserId ? senderID === currentUserId : Boolean(message.isMe);
  const parsedTime = message.time ? Date.parse(message.time) : Number.NaN;
  const createdAt = Number.isFinite(parsedTime) ? new Date(parsedTime) : new Date(fallbackTime);

  return {
    _id: message.id || `${fallbackTime}`,
    text: message.content || "",
    createdAt,
    user: {
      _id: isMe ? currentUserId || "me" : message.senderId || message.senderName || "other",
      name: message.senderName,
      avatar: message.senderAvatar,
    },
    system: message.type === "system",
    raw: message,
  };
}

function isCurrentUserMessage(message: ConversationMessage, currentUserId: string) {
  const senderID = (message.senderId || "").trim();
  if (senderID !== "" && currentUserId) {
    return senderID === currentUserId;
  }
  return Boolean(message.isMe);
}

function isLikelySameMessage(a: GiftedMessage, b: GiftedMessage) {
  if (a.text !== b.text) return false;
  const aSender = a.raw.senderId || a.user._id;
  const bSender = b.raw.senderId || b.user._id;
  if (aSender && bSender && aSender !== bSender) return false;
  const diff = Math.abs(new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return diff < 120000;
}

function normalizeDisplayedContent(content: string, senderName?: string) {
  const text = (content || "").trim();
  const speaker = (senderName || "").trim();
  if (!text || !speaker) return text;

  const lowerText = text.toLowerCase();
  const lowerSpeaker = speaker.toLowerCase();
  const prefixes = [lowerSpeaker + ":", lowerSpeaker + "：", "**" + lowerSpeaker + ":**", "**" + lowerSpeaker + "：**"];

  for (const prefix of prefixes) {
    if (lowerText.startsWith(prefix) && text.length >= prefix.length) {
      const next = text.slice(prefix.length).trim();
      if (next) return next;
    }
  }
  return text;
}

function isBotLikeName(value?: string) {
  const name = (value || "").trim();
  if (!name) return false;
  return /\bbot\b/i.test(name) || name.includes("助理");
}

function inferAvatarTagFromSender(message: ConversationMessage): "NPC" | "Bot" | null {
  const senderType = (message.senderType || "").trim().toLowerCase();
  const senderID = (message.senderId || "").trim().toLowerCase();
  const senderName = (message.senderName || "").trim();

  if (senderType === "human") return null;
  if (senderType.includes("bot")) return "Bot";
  if (senderType.includes("agent") || senderType.includes("npc") || senderType.includes("role")) {
    return "NPC";
  }
  if (senderID === "agent_mybot" || senderID.startsWith("agent_userbot_")) return "Bot";
  if (senderID.startsWith("agent_")) return "NPC";
  if (isBotLikeName(senderName)) return "Bot";
  if (/\bnpc\b/i.test(senderName)) return "NPC";
  return null;
}

function inferAvatarTagFromMember(member: ThreadMember): "NPC" | "Bot" | null {
  if (member.memberType === "human") return null;
  if (member.memberType === "role") return "NPC";
  if (member.memberType === "agent") {
    const agentID = (member.agentId || "").trim().toLowerCase();
    if (agentID === "agent_mybot" || agentID.startsWith("agent_userbot_")) return "Bot";
    if (isBotLikeName(member.name)) return "Bot";
    return "NPC";
  }
  return null;
}

export default function ChatDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isDraggingRef = useRef(false);
  const bubbleHeightsRef = useRef<Record<string, number>>({});
  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    avatar?: string;
    isGroup?: string;
    highlightMessageId?: string;
  }>();

  const chatId = String(params.id || "");
  const highlightMessageId = String(params.highlightMessageId || "");

  const {
    chatThreads,
    messagesByThread,
    threadMembers,
    friends,
    agents,
    botConfig,
    language,
    refreshThreadMessages,
    loadOlderMessages,
    sendMessage,
    createTaskFromMessage,
    createFriend,
    listMembers,
    addMember,
    removeMember,
    removeFriend,
    removeChatThread,
    generateRoleReplies,
  } = useAgentTown();
  const messagesByThreadRef = useRef(messagesByThread);

  const tr = (zh: string, en: string) => tx(language, zh, en);

  const openEntityConfig = useCallback(
    (entity: { entityType: "human" | "bot" | "npc"; entityId?: string; name?: string; avatar?: string }) => {
      const currentUser = (user?.id || "").trim();
      if (entity.entityType === "human" && entity.entityId && entity.entityId === currentUser) {
        router.push("/config" as never);
        return;
      }
      router.push({
        pathname: "/entity-config",
        params: {
          entityType: entity.entityType,
          entityId: entity.entityId || "",
          name: entity.name || "",
          avatar: entity.avatar || "",
        },
      });
    },
    [router, user?.id]
  );

  const thread = useMemo(() => {
    const found = chatThreads.find((t) => t.id === chatId);
    if (found) return found;

    return {
      id: chatId,
      name: params.name || tr("未知会话", "Unknown chat"),
      avatar: params.avatar || botConfig.avatar,
      message: "",
      time: "Now",
      isGroup: params.isGroup === "true",
      supportsVideo: true,
    };
  }, [botConfig.avatar, chatId, chatThreads, params.avatar, params.isGroup, params.name, tr]);

  const members = threadMembers[chatId] || [];
  const messages = messagesByThread[chatId] || [];
  const linkedFriend = useMemo(() => friends.find((item) => item.threadId === chatId), [chatId, friends]);
  const currentUserId = (user?.id || "").trim();
  const giftedUserId = currentUserId || "me";
  useEffect(() => {
    messagesByThreadRef.current = messagesByThread;
  }, [messagesByThread]);

  const keyboardPadding = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const isIOS = Platform.OS === "ios";
    const animateTo = (toValue: number, duration: number) => {
      Animated.timing(keyboardPadding, {
        toValue,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    };
    const handleFrame = (event?: { endCoordinates?: { height?: number }; duration?: number }) => {
      const height = Math.max(0, event?.endCoordinates?.height ?? 0);
      const target = isIOS ? Math.max(0, height - insets.bottom) : height;
      animateTo(target, event?.duration ?? (isIOS ? 250 : 200));
    };
    const handleHide = (event?: { duration?: number }) => {
      animateTo(0, event?.duration ?? (isIOS ? 200 : 180));
    };
    const showEvent = isIOS ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = isIOS ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, handleFrame);
    const hideSub = Keyboard.addListener(hideEvent, handleHide);
    const changeSub = isIOS
      ? Keyboard.addListener("keyboardWillChangeFrame", handleFrame)
      : null;
    return () => {
      showSub.remove();
      hideSub.remove();
      changeSub?.remove();
    };
  }, [insets.bottom, keyboardPadding]);

  const [devStreamEnabled, setDevStreamEnabled] = useState(__DEV__);
  const [streamingById, setStreamingById] = useState<Record<string, string>>({});
  const streamInitRef = useRef(false);
  const streamTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const streamedIdsRef = useRef<Set<string>>(new Set());

  const [pendingMessages, setPendingMessages] = useState<GiftedMessage[]>([]);

  const baseGiftedMessages = useMemo(() => {
    const baseTime = Date.now();
    const reversed = [...messages].reverse();
    return reversed.map((message, index) =>
      toGiftedMessage(message, currentUserId, baseTime - index * MESSAGE_FALLBACK_GAP)
    );
  }, [currentUserId, messages]);

  useEffect(() => {
    if (pendingMessages.length === 0) return;
    setPendingMessages((prev) =>
      prev.filter((pending) => !baseGiftedMessages.some((msg) => isLikelySameMessage(pending, msg)))
    );
  }, [baseGiftedMessages, pendingMessages.length]);

  const giftedMessages = useMemo(() => {
    if (pendingMessages.length === 0) return baseGiftedMessages;
    const filteredPending = pendingMessages.filter(
      (pending) => !baseGiftedMessages.some((msg) => isLikelySameMessage(pending, msg))
    );
    return GiftedChat.append(baseGiftedMessages, filteredPending);
  }, [baseGiftedMessages, pendingMessages]);

  const [loading, setLoading] = useState(() => messages.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failedDraft, setFailedDraft] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);

  useEffect(() => {
    setHasMore(true);
    setLoadingOlder(false);
    setPendingMessages([]);
    setHasUserScrolled(false);
  }, [chatId]);

  const stopAllStreams = useCallback(() => {
    Object.values(streamTimersRef.current).forEach((timer) => clearTimeout(timer));
    streamTimersRef.current = {};
    setStreamingById({});
  }, []);

  useEffect(() => {
    streamInitRef.current = false;
    streamedIdsRef.current = new Set();
    stopAllStreams();
  }, [chatId, stopAllStreams]);

  useEffect(() => {
    if (devStreamEnabled) return;
    streamInitRef.current = false;
    streamedIdsRef.current = new Set();
    stopAllStreams();
  }, [devStreamEnabled, stopAllStreams]);

  useEffect(() => {
    if (!devStreamEnabled || streamInitRef.current || loading) return;
    streamedIdsRef.current = new Set(messages.map((message) => message.id).filter(Boolean));
    streamInitRef.current = true;
  }, [devStreamEnabled, loading, messages]);

  const startDevStream = useCallback(
    (message: ConversationMessage) => {
      if (!devStreamEnabled) return;
      const id = message.id;
      if (!id) return;
      if (streamTimersRef.current[id]) return;
      const fullText = message.content || "";
      if (!fullText.trim()) return;

      let index = 0;
      const tick = () => {
        index = Math.min(fullText.length, index + DEV_STREAM_CHUNK_SIZE);
        const partial = fullText.slice(0, index);
        setStreamingById((prev) => {
          if (prev[id] === partial) return prev;
          return { ...prev, [id]: partial };
        });
        if (index >= fullText.length) {
          delete streamTimersRef.current[id];
          setStreamingById((prev) => {
            if (!(id in prev)) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
          });
          return;
        }
        streamTimersRef.current[id] = setTimeout(tick, DEV_STREAM_INTERVAL_MS);
      };

      tick();
    },
    [devStreamEnabled]
  );

  useEffect(() => {
    if (!devStreamEnabled || !streamInitRef.current) return;
    if (messages.length === 0) return;

    const tailIds = new Set(
      messages
        .slice(-3)
        .map((message) => message.id)
        .filter(Boolean)
    );
    if (tailIds.size === 0) return;

    const seen = streamedIdsRef.current;
    for (const message of messages) {
      const id = message.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      if (!tailIds.has(id)) continue;
      if (isCurrentUserMessage(message, currentUserId)) continue;
      if (!(message.content || "").trim()) continue;
      startDevStream(message);
    }
  }, [currentUserId, devStreamEnabled, messages, startDevStream]);

  const [actionModal, setActionModal] = useState(false);
  const [actionMessage, setActionMessage] = useState<ConversationMessage | null>(null);
  const [actionAnchor, setActionAnchor] = useState<{
    yTop: number;
    yBottom: number;
    align: "left" | "right";
  } | null>(null);
  const [aiCardHeight, setAiCardHeight] = useState(164);
  const [askAI, setAskAI] = useState("");
  const [askAIAnswer, setAskAIAnswer] = useState<string | null>(null);
  const [askAIError, setAskAIError] = useState<string | null>(null);
  const [askAIBusy, setAskAIBusy] = useState(false);
  const [myBotPanel, setMyBotPanel] = useState(false);
  const [memberNameListModal, setMemberNameListModal] = useState(false);
  const [myBotQuestion, setMyBotQuestion] = useState("");
  const [myBotAnswer, setMyBotAnswer] = useState<string | null>(null);
  const [myBotError, setMyBotError] = useState<string | null>(null);
  const [myBotBusy, setMyBotBusy] = useState(false);

  const [memberModal, setMemberModal] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all");
  const [memberPoolFriends, setMemberPoolFriends] = useState<Friend[]>([]);
  const [memberPoolAgents, setMemberPoolAgents] = useState<Agent[]>([]);
  const [memberPoolDiscover, setMemberPoolDiscover] = useState<DiscoverUser[]>([]);
  const [memberPoolBusy, setMemberPoolBusy] = useState(false);
  const [memberPoolError, setMemberPoolError] = useState<string | null>(null);
  const [memberPoolNonce, setMemberPoolNonce] = useState(0);
  const [pendingMemberAdds, setPendingMemberAdds] = useState<
    Array<{ key: string; label: string; onAdd: () => Promise<void> }>
  >([]);
  const [memberApplyBusy, setMemberApplyBusy] = useState(false);
  const [threadMenuModal, setThreadMenuModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!chatId) return;
      const prefetched = (messagesByThreadRef.current[chatId] || []).length > 0;
      setLoading(!prefetched);
      setLoadError(null);
      try {
        await refreshThreadMessages(chatId);
        if (thread.isGroup) {
          await listMembers(chatId);
        }
      } catch (err) {
        if (mounted) setLoadError(formatApiError(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [chatId, listMembers, refreshThreadMessages, thread.isGroup]);

  useEffect(() => {
    if (!memberModal) return;
    if (!chatId) return;

    let alive = true;
    setMemberPoolBusy(true);
    setMemberPoolError(null);

    // Keep the current member list fresh when the modal is opened.
    void listMembers(chatId);

    Promise.all([
      listFriendsApi(),
      listAgentsApi(),
      discoverUsersApi(memberQuery.trim() ? memberQuery : undefined),
    ])
      .then(([nextFriends, nextAgents, nextDiscover]) => {
        if (!alive) return;
        setMemberPoolFriends(Array.isArray(nextFriends) ? nextFriends : []);
        setMemberPoolAgents(Array.isArray(nextAgents) ? nextAgents : []);
        setMemberPoolDiscover(Array.isArray(nextDiscover) ? nextDiscover : []);
      })
      .catch((err) => {
        if (!alive) return;
        setMemberPoolError(formatApiError(err));
      })
      .finally(() => {
        if (!alive) return;
        setMemberPoolBusy(false);
      });

    return () => {
      alive = false;
    };
  }, [chatId, listMembers, memberModal, memberPoolNonce, memberQuery]);

  const candidates = useMemo(() => {
    const friendPool = memberPoolFriends.length ? memberPoolFriends : friends;
    const agentPool = memberPoolAgents.length ? memberPoolAgents : agents;
    const usedFriendIds = new Set(
      members
        .map((m) => (m.friendId || "").trim())
        .filter(Boolean)
    );
    const usedHumanUserIDs = new Set(
      members
        .filter((m) => m.memberType === "human")
        .map((m) => (m.friendId || "").trim())
        .filter(Boolean)
    );
    const usedAgentIds = new Set(members.map((m) => m.agentId).filter(Boolean));

    const friendItems = friendPool
      // Hide personal/member bots from group add-member candidates.
      // Group should add real users (friends) or explicit Agent/NPC entries.
      .filter((f) => f.kind === "human")
      .filter((f) => {
        const uid = (f.userId || "").trim();
        if (uid && usedHumanUserIDs.has(uid)) return false;
        return !usedFriendIds.has(f.id);
      })
      .map((f) => ({
        key: `friend:${f.id}`,
        type: "human" as const,
        label: f.name,
        desc: f.role || f.company || "Human",
        onAdd: async () => {
          await addMember(chatId, { friendId: f.id, memberType: "human" });
        },
      }));

    const agentItems = agentPool
      .filter((a) => !usedAgentIds.has(a.id))
      .map((a) => ({
        key: `agent:${a.id}`,
        type: "agent" as const,
        label: a.name,
        desc: a.persona || a.description || "Agent",
        onAdd: async () => {
          await addMember(chatId, { agentId: a.id, memberType: "agent" });
        },
      }));

    const friendUserIDs = new Set(
      friendPool
        .map((f) => (f.userId || "").trim())
        .filter(Boolean)
    );
    const discoverItems = memberPoolDiscover
      .filter((u) => {
        const uid = (u.id || "").trim();
        if (!uid) return false;
        if (friendUserIDs.has(uid)) return false;
        if (usedHumanUserIDs.has(uid)) return false;
        return true;
      })
      .map((u) => ({
        key: `discover:${u.id}`,
        type: "human" as const,
        label: u.displayName || "User",
        desc: [u.email, u.provider].filter(Boolean).join(" · ") || "User",
        onAdd: async () => {
          setMemberPoolError(null);
          try {
            let friend: Friend | null | undefined = friendPool.find((f) => (f.userId || "").trim() === u.id);
            if (!friend) {
              friend = await createFriend({
                userId: u.id,
                name: u.displayName,
                kind: "human",
              });
            }
            if (!friend) {
              setMemberPoolError(
                tr(
                  "好友邀请已发送。请等待对方接受后再加入群聊。",
                  "Friend invite sent. Add them to the group after they accept."
                )
              );
              return;
            }
            await addMember(chatId, { friendId: friend.id, memberType: "human" });
          } catch (err) {
            setMemberPoolError(formatApiError(err));
            throw err;
          }
        },
      }));

    const all = [...friendItems, ...agentItems, ...discoverItems];
    const keyword = memberQuery.trim().toLowerCase();

    return all.filter((item) => {
      if (memberFilter !== "all" && item.type !== memberFilter) return false;
      if (!keyword) return true;
      return item.label.toLowerCase().includes(keyword) || item.desc.toLowerCase().includes(keyword);
    });
  }, [
    addMember,
    agents,
    chatId,
    createFriend,
    friends,
    listMembers,
    memberFilter,
    memberPoolAgents,
    memberPoolDiscover,
    memberPoolFriends,
    memberQuery,
    members,
  ]);

  const selectedMemberKeys = useMemo(
    () => new Set(pendingMemberAdds.map((item) => item.key)),
    [pendingMemberAdds]
  );

  const requestOlder = async () => {
    if (!hasUserScrolled || loadingOlder || !hasMore || !chatId) return;
    setLoadingOlder(true);
    try {
      const added = await loadOlderMessages(chatId);
      if (!added) setHasMore(false);
    } catch {
      // ignore
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleSend = async (override?: string) => {
    const content = (override ?? input).trim();
    if (!content || submitting || !chatId) return;

    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const localMessage: ConversationMessage = {
      id: localId,
      threadId: chatId,
      senderId: user?.id,
      senderName: user?.displayName || "Me",
      senderAvatar: user?.avatar || botConfig.avatar,
      senderType: "human",
      content,
      type: "text",
      isMe: true,
      time: tr("刚刚", "Now"),
    };
    setPendingMessages((prev) => GiftedChat.append(prev, [toGiftedMessage(localMessage, currentUserId, Date.now())]));

    setSubmitting(true);
    setFailedDraft(null);
    setInput("");

    let ok = false;
    try {
      if (thread.isGroup) {
        const ids = mentionMemberIDs(content, members);
        await generateRoleReplies(chatId, content, ids.length ? ids : undefined);
        ok = true;
      } else {
        const result = await sendMessage(chatId, {
          content,
          type: "text",
          senderId: user?.id,
          senderName: user?.displayName || "Me",
          senderAvatar: botConfig.avatar,
          senderType: "human",
          isMe: true,
          requestAI: chatId === "mybot",
          systemInstruction: botConfig.systemInstruction,
        });
        if (!result) {
          setFailedDraft(content);
        } else {
          ok = true;
        }
      }
    } catch (err) {
      setFailedDraft(content);
    } finally {
      setSubmitting(false);
      if (!ok) {
        setPendingMessages((prev) => prev.filter((msg) => msg._id !== localId));
      }
    }
  };

  const handleLongPress = (message: ConversationMessage) => {
    setActionMessage(message);
    setActionModal(true);
  };

  const handleMessagePress = (message: ConversationMessage, ev?: GestureResponderEvent) => {
    if (isDraggingRef.current) return;
    setActionMessage(message);
    setAskAI("");
    setAskAIAnswer(null);
    setAskAIError(null);
    if (ev?.nativeEvent) {
      const h = bubbleHeightsRef.current[message.id] || 56;
      const top = ev.nativeEvent.pageY - ev.nativeEvent.locationY;
      const bottom = top + h;
      const meFinal =
        isCurrentUserMessage(message, currentUserId);
      setActionAnchor({
        yTop: top,
        yBottom: bottom,
        align: meFinal ? "right" : "left",
      });
    } else {
      setActionAnchor(null);
    }
    setActionModal(true);
  };

  const runAskAI = async () => {
    if (!actionMessage) return;
    const question = askAI.trim();
    if (!question || askAIBusy) return;
    setAskAIError(null);
    setAskAIAnswer(null);
    setAskAIBusy(true);
    try {
      const prompt = `${tr("用户问题：", "User question: ")}${question}\n\n${tr("消息内容：", "Message: ")}${actionMessage.content}`;
      const result = await aiText({
        prompt,
        systemInstruction: botConfig.systemInstruction || undefined,
        fallback: "Noted.",
      });
      setAskAIAnswer((result.text || "").trim() || "Noted.");
    } catch (err) {
      setAskAIError(formatApiError(err));
    } finally {
      setAskAIBusy(false);
    }
  };

  const runGroupMyBot = async () => {
    const question = myBotQuestion.trim();
    if (!question || myBotBusy) return;
    setMyBotBusy(true);
    setMyBotError(null);
    try {
      const transcript = messages
        .slice(-40)
        .map((m) => {
          const sender = (m.senderName || (m.isMe ? "Me" : "Member")).trim();
          const content = normalizeDisplayedContent(m.content || "", m.senderName);
          const text = (content || "").trim();
          if (!text) return "";
          return `${sender}: ${text}`;
        })
        .filter(Boolean)
        .join("\n");

      const prompt = [
        `Group: ${thread.name}`,
        "",
        "Latest context:",
        transcript || "(empty)",
        "",
        `User question: ${question}`,
        "",
        "Answer as the user's private assistant. Keep concise and actionable.",
      ].join("\n");

      const result = await aiText({
        prompt,
        systemInstruction:
          (botConfig.systemInstruction || "You are MyBot.") +
          "\nYou are private to the current user. Never reveal private guidance as if it were a group message.",
        fallback: "Noted. I recommend one concrete next step: summarize the latest decision and assign an owner.",
      });
      setMyBotAnswer((result.text || "").trim() || "Noted.");
    } catch (err) {
      setMyBotError(formatApiError(err));
    } finally {
      setMyBotBusy(false);
    }
  };

  const runAddToTask = async () => {
    if (!actionMessage) return;
    try {
      const fallbackTitle = tr("来自聊天的任务", "Task from chat");
      const created = await createTaskFromMessage(
        chatId,
        actionMessage.id,
        (actionMessage.content || "").slice(0, 80) || fallbackTitle
      );
      Alert.alert(tr("已添加任务", "Task added"), created.title || tr("任务已创建", "Task created"));
      setActionModal(false);
    } catch (err) {
      Alert.alert(
        tr("添加任务失败", "Add task failed"),
        err instanceof Error ? err.message : tr("请稍后重试", "Please try again")
      );
    }
  };

  const runReplyDraft = async () => {
    if (!actionMessage || askAIBusy) return;
    setAskAIError(null);
    setAskAIBusy(true);
    try {
      const prompt = `${tr("请帮我写一个简短得体的回复。仅输出回复正文。", "Write a short, polite reply. Output only the reply text.")}\n\n${tr("对方消息：", "Incoming message: ")}${actionMessage.content}`;
      const result = await aiText({
        prompt,
        systemInstruction: botConfig.systemInstruction || undefined,
        fallback: "OK.",
      });
      const draft = (result.text || "").trim();
      if (draft) {
        const targetName = (actionMessage.senderName || "").trim();
        if (thread.isGroup && targetName) {
          const mention = `@${targetName}`;
          const hasMentionPrefix = draft.toLowerCase().startsWith(mention.toLowerCase());
          setInput(hasMentionPrefix ? draft : `${mention} ${draft}`);
        } else {
          setInput(draft);
        }
      }
      setActionModal(false);
    } catch (err) {
      setAskAIError(formatApiError(err));
    } finally {
      setAskAIBusy(false);
    }
  };

  const insertMention = (name?: string) => {
    const safeName = (name || "").trim();
    if (!safeName) return;
    const mention = `@${safeName}`;
    const current = (input || "").trim();
    if (!current) {
      setInput(`${mention} `);
      return;
    }
    if (current.toLowerCase().includes(mention.toLowerCase())) return;
    const spacer = input.endsWith(" ") ? "" : " ";
    setInput(`${input}${spacer}${mention} `);
  };

  const confirmDeleteFriend = () => {
    if (!linkedFriend) return;
    Alert.alert(
      tr("删除好友", "Delete Friend"),
      tr("将删除该好友及当前私聊记录，无法撤销。", "This deletes the friend and this direct chat. This cannot be undone."),
      [
        { text: tr("取消", "Cancel"), style: "cancel" },
        {
          text: tr("删除", "Delete"),
          style: "destructive",
          onPress: () => {
            setThreadMenuModal(false);
            void removeFriend(linkedFriend.id).finally(() => router.back());
          },
        },
      ]
    );
  };

  const confirmDeleteThread = () => {
    Alert.alert(
      tr(thread.isGroup ? "删除群聊" : "删除聊天", thread.isGroup ? "Delete Group Chat" : "Delete Chat"),
      tr("将删除该会话全部消息，无法撤销。", "This deletes all messages in this thread. This cannot be undone."),
      [
        { text: tr("取消", "Cancel"), style: "cancel" },
        {
          text: tr("删除", "Delete"),
          style: "destructive",
          onPress: () => {
            setThreadMenuModal(false);
            void removeChatThread(chatId).finally(() => router.back());
          },
        },
      ]
    );
  };

  const confirmRemoveThreadMember = (member: ThreadMember) => {
    Alert.alert(
      tr("移除成员", "Remove member"),
      tr(
        `确认移除 ${member.name || tr("该成员", "this member")} 吗？`,
        `Remove ${member.name || "this member"} from this chat?`
      ),
      [
        { text: tr("取消", "Cancel"), style: "cancel" },
        {
          text: tr("移除", "Remove"),
          style: "destructive",
          onPress: () => {
            void removeMember(chatId, member.id).catch((err) =>
              setMemberPoolError(formatApiError(err))
            );
          },
        },
      ]
    );
  };

  const renderSystemMessage = useCallback((props: SystemMessageProps<IMessage>) => {
    const text = props.currentMessage?.text?.trim();
    if (!text) return <></>;
    return (
      <View style={styles.sysRow}>
        <View style={styles.sysPill}>
          <Text style={styles.sysText}>{text}</Text>
        </View>
      </View>
    );
  }, []);

  const renderMessage = useCallback(
    (props: MessageProps<GiftedMessage>) => {
      const current = props.currentMessage;
      if (!current) return <></>;
      const raw = current.raw;
      const actorID = currentUserId;
      const meFinal = isCurrentUserMessage(raw, actorID);
      const highlighted = highlightMessageId !== "" && raw.id === highlightMessageId;
      const streamText = devStreamEnabled ? streamingById[raw.id] : undefined;
      const displayText = normalizeDisplayedContent((streamText ?? raw.content) || "", raw.senderName);
      const ownAvatar = (user?.avatar || botConfig.avatar || "").trim();
      const avatarTag = meFinal ? null : inferAvatarTagFromSender(raw);
      const avatarEntityType: "human" | "bot" | "npc" = meFinal
        ? "human"
        : avatarTag === "Bot"
          ? "bot"
          : avatarTag === "NPC"
            ? "npc"
            : "human";
      const messageAvatar = (() => {
        const senderAvatar = (raw.senderAvatar || "").trim();
        if (senderAvatar) return senderAvatar;
        if (meFinal) return ownAvatar;
        return (thread.avatar || botConfig.avatar || ownAvatar || "").trim();
      })();
      const handleAvatarPress = () => {
        openEntityConfig({
          entityType: avatarEntityType,
          entityId: meFinal ? currentUserId : (raw.senderId || "").trim(),
          name: meFinal ? (user?.displayName || tr("我", "Me")) : (raw.senderName || ""),
          avatar: messageAvatar || undefined,
        });
      };

      const messageBody = () => {
        if (raw.type === "voice") {
          const voiceLabel = raw.voiceDuration
            ? tr(`语音 · ${raw.voiceDuration}`, `Voice · ${raw.voiceDuration}`)
            : tr("语音消息", "Voice message");
          return (
            <View style={styles.voiceRow}>
              <Ionicons
                name="mic-outline"
                size={14}
                color={meFinal ? "rgba(248,250,252,0.95)" : "rgba(226,232,240,0.92)"}
              />
              <Text style={[styles.voiceText, meFinal && styles.msgTextMe]}>{voiceLabel}</Text>
            </View>
          );
        }

        return (
          <View style={styles.messageBody}>
            {raw.replyContext ? (
              <View style={styles.replyContext}>
                <Text style={styles.replyText} numberOfLines={2}>
                  {raw.replyContext}
                </Text>
              </View>
            ) : null}
            {raw.imageUri ? (
              <View style={styles.imageWrap}>
                <Image source={{ uri: raw.imageUri }} style={styles.imagePreview} />
                {raw.imageName ? <Text style={styles.imageLabel}>{raw.imageName}</Text> : null}
              </View>
            ) : null}
            {displayText ? (
              <Text style={[styles.msgText, meFinal && styles.msgTextMe]}>{displayText}</Text>
            ) : null}
          </View>
        );
      };

      return (
        <View style={[styles.msgRow, meFinal && styles.msgRowMe]}>
          {!meFinal ? (
            <Pressable style={styles.msgAvatarWrap} onPress={handleAvatarPress}>
              {messageAvatar ? (
                <Image source={{ uri: messageAvatar }} style={styles.msgAvatar} />
              ) : (
                <View style={[styles.msgAvatar, styles.msgAvatarFallback]}>
                  <Ionicons name="person-outline" size={14} color="rgba(226,232,240,0.86)" />
                </View>
              )}
              {avatarTag ? (
                <View style={[styles.avatarTag, avatarTag === "NPC" ? styles.avatarTagNpc : styles.avatarTagBot]}>
                  <Text style={styles.avatarTagText}>{avatarTag}</Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
          <Pressable
            onLayout={(e) => {
              bubbleHeightsRef.current[raw.id] = e.nativeEvent.layout.height;
            }}
            onPress={(e) => handleMessagePress(raw, e)}
            onLongPress={() => handleLongPress(raw)}
            style={[
              styles.bubble,
              meFinal ? styles.bubbleMe : styles.bubbleOther,
              highlighted && styles.bubbleHighlight,
            ]}
          >
            {!meFinal && raw.senderName ? (
              <Text style={styles.sender} numberOfLines={1}>
                {raw.senderName}
              </Text>
            ) : null}
            {messageBody()}
            {raw.time ? <Text style={styles.time}>{raw.time}</Text> : null}
          </Pressable>
          {meFinal ? (
            <Pressable style={styles.msgAvatarWrap} onPress={handleAvatarPress}>
              {messageAvatar ? (
                <Image source={{ uri: messageAvatar }} style={styles.msgAvatar} />
              ) : (
                <View style={[styles.msgAvatar, styles.msgAvatarFallback]}>
                  <Ionicons name="person-outline" size={14} color="rgba(226,232,240,0.86)" />
                </View>
              )}
              {avatarTag ? (
                <View style={[styles.avatarTag, avatarTag === "NPC" ? styles.avatarTagNpc : styles.avatarTagBot]}>
                  <Text style={styles.avatarTagText}>{avatarTag}</Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
        </View>
      );
    },
    [
      botConfig.avatar,
      currentUserId,
      devStreamEnabled,
      handleLongPress,
      handleMessagePress,
      highlightMessageId,
      openEntityConfig,
      streamingById,
      thread.avatar,
      tr,
      user?.avatar,
      user?.displayName,
    ]
  );

  const ContainerView = Animated.View;
  const containerStyle = [styles.container, { paddingBottom: keyboardPadding }];

  return (
    <KeyframeBackground>
      <SafeAreaView edges={APP_SAFE_AREA_EDGES} style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
          enabled={false}
        >
        <ContainerView style={containerStyle}>
          <View style={styles.headerRow}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={18} color="#e2e8f0" />
            </Pressable>
            <Pressable
              style={styles.headerMain}
              onPress={() => {
                if (!thread.isGroup) return;
                setMemberNameListModal(true);
              }}
            >
              <Text style={styles.title} numberOfLines={1}>
                {thread.name}
              </Text>
              <Text style={styles.subtitle}>
                {thread.isGroup
                  ? tr(`${Math.max(thread.memberCount || 0, members.length)} people active`, `${Math.max(thread.memberCount || 0, members.length)} people active`)
                  : tr("Direct", "Direct")}
              </Text>
            </Pressable>
              <View style={styles.headerActions}>
                {thread.isGroup ? (
                  <Pressable
                    style={[
                      styles.headerIcon,
                      {
                        width: "auto",
                        paddingHorizontal: 10,
                        flexDirection: "row",
                        gap: 6,
                      },
                    ]}
                    onPress={() => {
                      setMyBotQuestion("");
                      setMyBotAnswer(null);
                      setMyBotError(null);
                      setMyBotPanel(true);
                    }}
                  >
                    <Ionicons name="sparkles-outline" size={16} color="rgba(191,219,254,0.95)" />
                    <Text style={{ color: "rgba(191,219,254,0.95)", fontSize: 12, fontWeight: "800" }}>MyBot</Text>
                  </Pressable>
                ) : null}
                {thread.isGroup ? (
                <Pressable
                  style={styles.headerIcon}
                  onPress={() => {
                    setMemberQuery("");
                    setMemberFilter("all");
                    setMemberPoolError(null);
                    setPendingMemberAdds([]);
                    setMemberApplyBusy(false);
                    setMemberModal(true);
                  }}
                >
                  <Ionicons name="person-add-outline" size={16} color="rgba(226,232,240,0.92)" />
                </Pressable>
              ) : null}
              <Pressable style={styles.headerIcon} onPress={() => setThreadMenuModal(true)}>
                <Ionicons name="ellipsis-horizontal" size={16} color="rgba(226,232,240,0.92)" />
              </Pressable>
            </View>
          </View>

          {failedDraft ? (
            <StateBanner
              variant="error"
              title={tr("发送失败", "Send failed")}
              message={tr("可以点右侧重试", "Tap retry to send again")}
              actionLabel={tr("重试", "Retry")}
              onAction={() => setInput(failedDraft)}
            />
          ) : null}

          {loadError ? (
            <StateBanner
              variant="error"
              title={tr("消息加载失败", "Failed to load messages")}
              message={loadError}
              actionLabel={tr("重试", "Retry")}
              onAction={() => {
                setLoadError(null);
                setLoading(true);
                void refreshThreadMessages(chatId)
                  .catch((err) => setLoadError(formatApiError(err)))
                  .finally(() => setLoading(false));
              }}
            />
          ) : null}

          {loading ? (
            <LoadingSkeleton kind="messages" />
          ) : giftedMessages.length === 0 ? (
            <EmptyState
              title={tr("暂无消息", "No messages yet")}
              hint={tr("从底部输入开始对话", "Start typing below")}
              icon="chatbox-ellipses-outline"
            />
          ) : (
            <GiftedChat
              messages={giftedMessages}
              user={{ _id: giftedUserId, name: user?.displayName || "Me" }}
              renderInputToolbar={() => null}
              minInputToolbarHeight={0}
              isKeyboardInternallyHandled={false}
              renderMessage={renderMessage}
              renderSystemMessage={renderSystemMessage}
              messagesContainerStyle={styles.messageContainer}
              listViewProps={
                {
                  keyboardShouldPersistTaps: "never",
                  onEndReachedThreshold: 0.2,
                  onEndReached: () => void requestOlder(),
                  onScrollBeginDrag: () => {
                    isDraggingRef.current = true;
                    setHasUserScrolled(true);
                  },
                  onScrollEndDrag: () => {
                    setTimeout(() => {
                      isDraggingRef.current = false;
                    }, 120);
                  },
                  onMomentumScrollEnd: () => {
                    isDraggingRef.current = false;
                  },
                  ListFooterComponent: loadingOlder ? (
                    <Text style={styles.listFooterHint}>{tr("加载更早消息...", "Loading older...")}</Text>
                  ) : hasMore && hasUserScrolled ? (
                    <Text style={styles.listFooterHint}>{tr("上滑加载更早消息", "Scroll up to load older")}</Text>
                  ) : null,
                } as any
              }
            />
          )}

          <View style={styles.inputRow}>
            <Pressable style={styles.inputIcon} onPress={() => null}>
              <Ionicons name="add" size={18} color="rgba(226,232,240,0.85)" />
            </Pressable>
            <View style={styles.inputBox}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={
                  thread.isGroup
                    ? tr("Message (@name to mention)", "Message (@name to mention)")
                    : tr("Message", "Message")
                }
                placeholderTextColor="rgba(148,163,184,0.9)"
                style={styles.input}
                multiline
              />
            </View>
            <Pressable style={styles.inputIcon} onPress={() => null}>
              <Ionicons name="mic-outline" size={18} color="rgba(226,232,240,0.78)" />
            </Pressable>
            <Pressable
              style={[styles.sendBtn, (submitting || !input.trim()) && styles.sendBtnDisabled]}
              onPress={() => void handleSend()}
              disabled={submitting || !input.trim()}
            >
              <Ionicons name="arrow-up" size={18} color="#0b1220" />
            </Pressable>
          </View>
        </ContainerView>
        </KeyboardAvoidingView>

        <Modal visible={actionModal} transparent animationType="fade" onRequestClose={() => setActionModal(false)}>
          <Pressable style={styles.actionOverlay} onPress={() => setActionModal(false)}>
            <Pressable
              style={[
                styles.aiCard,
                (() => {
                  const { height: winH, width: winW } = Dimensions.get("window");
                  const width = Math.min(360, Math.max(240, winW - 28));
                  const marginH = 14;

                  const anchor = actionAnchor;
                  const preferBelow = anchor ? anchor.yBottom + 10 : winH - insets.bottom - 12 - aiCardHeight;
                  const maxTop = winH - Math.max(insets.bottom, 0) - 12 - aiCardHeight;
                  let top = Math.min(preferBelow, maxTop);

                  if (anchor && preferBelow > maxTop) {
                    const above = anchor.yTop - 10 - aiCardHeight;
                    const minTop = Math.max(insets.top, 0) + 12;
                    if (above >= minTop) {
                      top = above;
                    }
                  }

                  const minTop = Math.max(insets.top, 0) + 12;
                  if (top < minTop) top = minTop;

                  return {
                    position: "absolute" as const,
                    top,
                    width,
                    left: actionAnchor?.align === "left" ? marginH : undefined,
                    right: actionAnchor?.align === "right" ? marginH : undefined,
                  };
                })(),
              ]}
              onLayout={(e) => setAiCardHeight(e.nativeEvent.layout.height)}
              onPress={() => null}
            >
              <View style={styles.aiAskRow}>
                <Ionicons name="sparkles-outline" size={16} color="rgba(191,219,254,0.95)" />
                <TextInput
                  value={askAI}
                  onChangeText={setAskAI}
                  placeholder={tr("Ask AI...", "Ask AI...")}
                  placeholderTextColor="rgba(148,163,184,0.9)"
                  style={styles.aiAskInput}
                  editable={!askAIBusy}
                />
                <Pressable
                  style={[styles.aiSend, (askAIBusy || !askAI.trim() || !actionMessage) && styles.aiSendDisabled]}
                  onPress={() => void runAskAI()}
                >
                  <Ionicons name="arrow-up" size={16} color="#0b1220" />
                </Pressable>
              </View>

              {askAIError ? <Text style={styles.aiError}>{askAIError}</Text> : null}
              {askAIAnswer ? (
                <View style={styles.aiAnswerBox}>
                  <Text style={styles.aiAnswerText}>{askAIAnswer}</Text>
                </View>
              ) : null}

              <View style={styles.aiButtonsRow}>
                <Pressable
                  style={[styles.aiBtn, askAIBusy && styles.aiBtnDisabled]}
                  onPress={() => void runReplyDraft()}
                >
                  <Text style={styles.aiBtnText}>{tr("回复", "Reply")}</Text>
                </Pressable>
                <Pressable
                  style={[styles.aiBtn, styles.aiBtnSecondary, askAIBusy && styles.aiBtnDisabled]}
                  onPress={() => void runAddToTask()}
                >
                  <Text style={styles.aiBtnText}>{tr("任务", "Task")}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={myBotPanel} transparent animationType="fade" onRequestClose={() => setMyBotPanel(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setMyBotPanel(false)}>
            <Pressable style={styles.memberCard} onPress={() => null}>
              <View style={styles.memberHeader}>
                <Text style={styles.memberTitle}>MyBot</Text>
                <Pressable style={styles.closeTiny} onPress={() => setMyBotPanel(false)}>
                  <Ionicons name="close" size={16} color="rgba(226,232,240,0.85)" />
                </Pressable>
              </View>
              <Text style={[styles.memberHint, { marginBottom: 10 }]}>
                {tr("只对你可见，基于当前群聊上下文回答。", "Private to you, answers with current group context.")}
              </Text>
              <TextInput
                value={myBotQuestion}
                onChangeText={setMyBotQuestion}
                placeholder={tr("问 MyBot 当前群聊的问题", "Ask MyBot about this group")}
                placeholderTextColor="rgba(148,163,184,0.9)"
                multiline
                style={{
                  minHeight: 72,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.14)",
                  backgroundColor: "rgba(15,23,42,0.55)",
                  color: "rgba(241,245,249,0.96)",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 15,
                  textAlignVertical: "top",
                  marginBottom: 10,
                }}
                editable={!myBotBusy}
              />
              {myBotError ? <Text style={styles.aiError}>{myBotError}</Text> : null}
              {myBotAnswer ? (
                <ScrollView style={{ maxHeight: 220, marginBottom: 10 }}>
                  <View style={styles.aiAnswerBox}>
                    <Text style={styles.aiAnswerText}>{myBotAnswer}</Text>
                  </View>
                </ScrollView>
              ) : null}
              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10 }}>
                <Pressable
                  style={[
                    styles.filterBtn,
                    { minHeight: 42, minWidth: 96, alignItems: "center", justifyContent: "center" },
                  ]}
                  onPress={() => setMyBotPanel(false)}
                >
                  <Text style={styles.filterText}>{tr("关闭", "Close")}</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.filterBtn,
                    {
                      minHeight: 42,
                      minWidth: 108,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor:
                        myBotBusy || !myBotQuestion.trim()
                          ? "rgba(51,65,85,0.45)"
                          : "rgba(147,197,253,0.28)",
                    },
                  ]}
                  onPress={() => void runGroupMyBot()}
                  disabled={myBotBusy || !myBotQuestion.trim()}
                >
                  <Text style={[styles.filterText, { color: "rgba(219,234,254,0.98)" }]}>
                    {myBotBusy ? tr("思考中...", "Thinking...") : tr("询问", "Ask")}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={memberNameListModal}
          transparent
          animationType="fade"
          onRequestClose={() => setMemberNameListModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setMemberNameListModal(false)}>
            <Pressable style={styles.memberCard} onPress={() => null}>
              <View style={styles.memberHeader}>
                <Text style={styles.memberTitle}>{tr("成员列表", "Member list")}</Text>
                <Pressable style={styles.closeTiny} onPress={() => setMemberNameListModal(false)}>
                  <Ionicons name="close" size={16} color="rgba(226,232,240,0.85)" />
                </Pressable>
              </View>

              <ScrollView style={styles.memberList} contentContainerStyle={styles.memberListContent}>
                {members.length === 0 ? (
                  <Text style={styles.memberHint}>{tr("暂无成员", "No members")}</Text>
                ) : (
                  members.map((m) => {
                    const memberTag = inferAvatarTagFromMember(m);
                    return (
                      <Pressable
                        key={m.id}
                        style={styles.memberItem}
                        onPress={() => {
                          insertMention(m.name);
                          setMemberNameListModal(false);
                        }}
                      >
                        <View style={styles.memberIdentity}>
                          <Pressable
                            style={styles.memberAvatarWrap}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              const memberTag = inferAvatarTagFromMember(m);
                              openEntityConfig({
                                entityType: memberTag === "Bot" ? "bot" : memberTag === "NPC" ? "npc" : "human",
                                entityId: m.memberType === "human" ? m.friendId || m.id : m.agentId || m.id,
                                name: m.name,
                                avatar: m.avatar,
                              });
                            }}
                          >
                            {m.avatar ? (
                              <Image source={{ uri: m.avatar }} style={styles.memberAvatar} />
                            ) : (
                              <View style={[styles.memberAvatar, styles.memberAvatarFallback]}>
                                <Ionicons name="person-outline" size={14} color="rgba(226,232,240,0.86)" />
                              </View>
                            )}
                            {memberTag ? (
                              <View
                                style={[
                                  styles.avatarTag,
                                  memberTag === "NPC" ? styles.avatarTagNpc : styles.avatarTagBot,
                                ]}
                              >
                                <Text style={styles.avatarTagText}>{memberTag}</Text>
                              </View>
                            ) : null}
                          </Pressable>
                          <View style={styles.memberMain}>
                            <Text style={styles.memberName}>{m.name}</Text>
                            <Text style={styles.memberDesc} numberOfLines={1}>
                              {m.memberType === "human"
                                ? tr("真人", "Human")
                                : m.memberType === "agent"
                                  ? "Agent"
                                  : tr("角色", "Role")}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={memberModal} transparent animationType="fade" onRequestClose={() => setMemberModal(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setMemberModal(false)}>
            <Pressable style={styles.memberCard} onPress={() => null}>
              <View style={styles.memberHeader}>
                <Text style={styles.memberTitle}>{tr("添加成员", "Add Member")}</Text>
                <Pressable style={styles.closeTiny} onPress={() => setMemberModal(false)}>
                  <Ionicons name="close" size={16} color="rgba(226,232,240,0.85)" />
                </Pressable>
              </View>

              <View style={styles.searchWrap}>
                <Ionicons name="search" size={14} color="rgba(148,163,184,0.9)" />
                <TextInput
                  value={memberQuery}
                  onChangeText={setMemberQuery}
                  placeholder={tr("搜索成员", "Search members")}
                  placeholderTextColor="rgba(148,163,184,0.9)"
                  style={styles.searchInput}
                />
              </View>

              <View style={styles.filterRow}>
                {([
                  { key: "all", zh: "全部", en: "All" },
                  { key: "human", zh: "真人", en: "Human" },
                  { key: "agent", zh: "Agent", en: "Agent" },
                  { key: "role", zh: "角色", en: "Role" },
                ] as const).map((item) => (
                  <Pressable
                    key={item.key}
                    style={[styles.filterBtn, memberFilter === item.key && styles.filterBtnActive]}
                    onPress={() => setMemberFilter(item.key)}
                  >
                    <Text style={[styles.filterText, memberFilter === item.key && styles.filterTextActive]}>
                      {tr(item.zh, item.en)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <ScrollView style={styles.memberList} contentContainerStyle={styles.memberListContent}>
                {memberPoolError ? (
                  <StateBanner
                    variant="error"
                    title={tr("加载失败", "Load failed")}
                    message={memberPoolError}
                    actionLabel={tr("重试", "Retry")}
                    onAction={() => setMemberPoolNonce((n) => n + 1)}
                  />
                ) : null}
                {memberPoolBusy && candidates.length === 0 ? (
                  <Text style={styles.memberHint}>{tr("加载中...", "Loading...")}</Text>
                ) : null}
                {candidates.map((c) => (
                  <Pressable
                    key={c.key}
                    style={[
                      styles.memberItem,
                      selectedMemberKeys.has(c.key) && styles.memberItemSelected,
                    ]}
                    onPress={() => {
                      setMemberPoolError(null);
                      setPendingMemberAdds((prev) => {
                        const exists = prev.some((item) => item.key === c.key);
                        if (exists) {
                          return prev.filter((item) => item.key !== c.key);
                        }
                        return [...prev, { key: c.key, label: c.label, onAdd: c.onAdd }];
                      });
                    }}
                  >
                    <View style={styles.memberMain}>
                      <Text style={styles.memberName}>{c.label}</Text>
                      <Text style={styles.memberDesc} numberOfLines={1}>{c.desc}</Text>
                    </View>
                    <Ionicons
                      name={selectedMemberKeys.has(c.key) ? "checkmark-circle" : "add-circle-outline"}
                      size={18}
                      color="#93c5fd"
                    />
                  </Pressable>
                ))}
                {candidates.length === 0 ? (
                  <View style={{ gap: 10 }}>
                    <EmptyState
                      title={tr("没有可添加对象", "No candidates")}
                      hint={tr(
                        "可直接搜索系统用户并添加；若仍为空，请检查对方是否已注册。",
                        "You can search and add any registered user directly. If still empty, check whether the user has signed up."
                      )}
                      icon="person-add-outline"
                    />
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <Pressable
                        style={[styles.filterBtn, { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center" }]}
                        onPress={() => {
                          setMemberModal(false);
                          router.push("/" as never);
                        }}
                      >
                        <Text style={[styles.filterText, styles.filterTextActive]}>{tr("去添加好友", "Go add friend")}</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.filterBtn, { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center" }]}
                        onPress={() => setMemberPoolNonce((n) => n + 1)}
                      >
                        <Text style={styles.filterText}>{tr("刷新候选", "Refresh candidates")}</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </ScrollView>

              <View style={styles.currentRow}>
                {pendingMemberAdds.length > 0 ? (
                  <>
                    <Text style={styles.currentTitle}>{tr("待添加", "Pending add")}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.currentChips}>
                      {pendingMemberAdds.map((item) => (
                        <View key={item.key} style={styles.currentChip}>
                          <Text style={styles.currentChipText}>{item.label}</Text>
                          <Pressable
                            onPress={() =>
                              setPendingMemberAdds((prev) =>
                                prev.filter((entry) => entry.key !== item.key)
                              )
                            }
                          >
                            <Ionicons name="close" size={12} color="rgba(248,113,113,0.95)" />
                          </Pressable>
                        </View>
                      ))}
                    </ScrollView>
                  </>
                ) : null}
                <Text style={styles.currentTitle}>{tr("当前成员", "Members")}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.currentChips}>
                  {members.map((m) => (
                    <View key={m.id} style={styles.currentChip}>
                      <Text style={styles.currentChipText}>{m.name}</Text>
                      <Pressable onPress={() => confirmRemoveThreadMember(m)}>
                        <Ionicons name="close" size={12} color="rgba(248,113,113,0.95)" />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.memberFooter}>
                  <Pressable
                    style={styles.memberFooterGhost}
                    onPress={() => setMemberModal(false)}
                    disabled={memberApplyBusy}
                  >
                    <Text style={styles.memberFooterGhostText}>{tr("取消", "Cancel")}</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.memberFooterCta,
                      (pendingMemberAdds.length === 0 || memberApplyBusy) && styles.memberFooterCtaDisabled,
                    ]}
                    disabled={pendingMemberAdds.length === 0 || memberApplyBusy}
                    onPress={() => {
                      Alert.alert(
                        tr("确认创建 Group", "Confirm create Group"),
                        tr(
                          "确定要创建Group并添加所选成员吗？",
                          "Are you sure you want to create Group and add selected members?"
                        ),
                        [
                          { text: tr("取消", "Cancel"), style: "cancel" },
                          {
                            text: tr("确定", "OK"),
                            style: "default",
                            onPress: () => {
                              void (async () => {
                                setMemberApplyBusy(true);
                                setMemberPoolError(null);
                                try {
                                  for (const item of pendingMemberAdds) {
                                    await item.onAdd();
                                  }
                                  await listMembers(chatId);
                                  setMemberPoolNonce((n) => n + 1);
                                  setPendingMemberAdds([]);
                                  setMemberModal(false);
                                } catch (err) {
                                  setMemberPoolError(formatApiError(err));
                                } finally {
                                  setMemberApplyBusy(false);
                                }
                              })();
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={styles.memberFooterCtaText}>
                      {memberApplyBusy ? tr("处理中...", "Applying...") : "OK"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={threadMenuModal} transparent animationType="fade" onRequestClose={() => setThreadMenuModal(false)}>
          <Pressable style={styles.modalOverlayBottom} onPress={() => setThreadMenuModal(false)}>
            <Pressable style={styles.actionSheet} onPress={() => null}>
              {__DEV__ ? (
                <Pressable
                  style={styles.menuItem}
                  onPress={() => setDevStreamEnabled((prev) => !prev)}
                >
                  <Ionicons
                    name={devStreamEnabled ? "sparkles-outline" : "sparkles"}
                    size={16}
                    color={devStreamEnabled ? "rgba(147,197,253,0.95)" : "rgba(148,163,184,0.9)"}
                  />
                  <Text style={styles.menuText}>
                    {devStreamEnabled
                      ? tr("流式输出：开", "Streaming: On")
                      : tr("流式输出：关", "Streaming: Off")}
                  </Text>
                </Pressable>
              ) : null}
              {linkedFriend ? (
                <Pressable style={styles.menuItem} onPress={confirmDeleteFriend}>
                  <Ionicons name="person-remove-outline" size={16} color="rgba(248,113,113,0.95)" />
                  <Text style={styles.menuDangerText}>{tr("删除好友", "Delete Friend")}</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.menuItem} onPress={confirmDeleteThread}>
                <Ionicons name="trash-outline" size={16} color="rgba(248,113,113,0.95)" />
                <Text style={styles.menuDangerText}>
                  {tr(thread.isGroup ? "删除群聊" : "删除聊天", thread.isGroup ? "Delete Group Chat" : "Delete Chat")}
                </Text>
              </Pressable>
              <Pressable style={styles.menuItem} onPress={() => setThreadMenuModal(false)}>
                <Ionicons name="close-outline" size={16} color="rgba(226,232,240,0.92)" />
                <Text style={styles.menuText}>{tr("取消", "Cancel")}</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </KeyframeBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerMain: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: "#e2e8f0",
    fontSize: 18,
    fontWeight: "900",
  },
  subtitle: {
    color: "rgba(148,163,184,0.95)",
    fontSize: 13,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    gap: 10,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  messageList: {
    flex: 1,
    marginTop: 4,
  },
  messageContainer: {
    flex: 1,
  },
  messageContent: {
    paddingVertical: 8,
    gap: 10,
  },
  sysRow: {
    alignItems: "center",
    marginBottom: 10,
  },
  sysPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  sysText: {
    color: "rgba(226,232,240,0.78)",
    fontSize: 14,
    fontWeight: "700",
  },
  msgRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 10,
  },
  msgRowMe: {
    justifyContent: "flex-end",
  },
  msgAvatarWrap: {
    width: 30,
    height: 30,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  msgAvatar: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  msgAvatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTag: {
    position: "absolute",
    left: 3,
    right: 3,
    bottom: -7,
    height: 11,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  avatarTagBot: {
    backgroundColor: "rgba(37,99,235,0.96)",
    borderColor: "rgba(191,219,254,0.78)",
  },
  avatarTagNpc: {
    backgroundColor: "rgba(15,118,110,0.96)",
    borderColor: "rgba(167,243,208,0.78)",
  },
  avatarTagText: {
    color: "#f8fafc",
    fontSize: 7,
    lineHeight: 8,
    fontWeight: "900",
    letterSpacing: 0.25,
  },
  bubble: {
    maxWidth: "86%",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  bubbleOther: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  bubbleMe: {
    backgroundColor: "rgba(37,99,235,0.80)",
    borderColor: "rgba(59,130,246,0.35)",
  },
  bubbleHighlight: {
    borderColor: "rgba(250,204,21,0.45)",
  },
  sender: {
    color: "rgba(226,232,240,0.86)",
    fontSize: 13,
    fontWeight: "900",
  },
  messageBody: {
    gap: 6,
  },
  replyContext: {
    borderLeftWidth: 2,
    borderLeftColor: "rgba(148,163,184,0.7)",
    paddingLeft: 8,
  },
  replyText: {
    color: "rgba(203,213,225,0.9)",
    fontSize: 13,
    fontWeight: "700",
  },
  voiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  voiceText: {
    color: "rgba(226,232,240,0.92)",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
  },
  imageWrap: {
    gap: 6,
  },
  imagePreview: {
    width: 200,
    height: 130,
    borderRadius: 12,
  },
  imageLabel: {
    color: "rgba(148,163,184,0.9)",
    fontSize: 12,
    fontWeight: "700",
  },
  msgText: {
    color: "rgba(226,232,240,0.92)",
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "600",
  },
  msgTextMe: {
    color: "#f8fafc",
  },
  time: {
    color: "rgba(148,163,184,0.9)",
    fontSize: 12,
    fontWeight: "700",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingBottom: 6,
  },
  inputIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  inputBox: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(15,23,42,0.55)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    color: "#e2e8f0",
    fontSize: 17,
    lineHeight: 24,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.55,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 18,
    justifyContent: "center",
  },
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 18,
    justifyContent: "flex-end",
  },
  actionOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  actionSheet: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(15,23,42,0.92)",
    padding: 14,
    gap: 10,
  },
  menuItem: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  menuText: {
    color: "rgba(226,232,240,0.92)",
    fontSize: 13,
    fontWeight: "800",
  },
  menuDangerText: {
    color: "rgba(248,113,113,0.98)",
    fontSize: 13,
    fontWeight: "900",
  },
  aiCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(15,23,42,0.92)",
    padding: 12,
    gap: 10,
  },
  aiAskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  aiAskInput: {
    flex: 1,
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "800",
    paddingVertical: 0,
  },
  aiSend: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  aiSendDisabled: {
    opacity: 0.5,
  },
  aiButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  aiBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  aiBtnSecondary: {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  aiBtnDisabled: {
    opacity: 0.6,
  },
  aiBtnText: {
    color: "rgba(226,232,240,0.92)",
    fontSize: 13,
    fontWeight: "900",
  },
  aiError: {
    color: "rgba(248,113,113,0.95)",
    fontSize: 11,
    fontWeight: "800",
  },
  aiAnswerBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  aiAnswerText: {
    color: "rgba(226,232,240,0.92)",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  sheetTitle: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "900",
  },
  sheetItem: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  sheetText: {
    color: "rgba(226,232,240,0.92)",
    fontSize: 13,
    fontWeight: "800",
  },
  sheetClose: {
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  sheetCloseText: {
    color: "rgba(226,232,240,0.9)",
    fontSize: 13,
    fontWeight: "900",
  },
  memberCard: {
    width: "92%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(15,23,42,0.92)",
    padding: 14,
    gap: 10,
    minHeight: 360,
    maxHeight: "92%",
  },
  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  memberTitle: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "900",
  },
  closeTiny: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: "#e2e8f0",
    fontSize: 13,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  filterBtnActive: {
    borderColor: "rgba(59,130,246,0.35)",
    backgroundColor: "rgba(30,64,175,0.22)",
  },
  filterText: {
    color: "rgba(203,213,225,0.78)",
    fontSize: 11,
    fontWeight: "900",
  },
  filterTextActive: {
    color: "#e2e8f0",
  },
  memberList: {
    minHeight: 160,
    maxHeight: 320,
  },
  memberListContent: {
    gap: 10,
    paddingBottom: 10,
    flexGrow: 1,
  },
  memberHint: {
    color: "rgba(148,163,184,0.95)",
    fontSize: 12,
    fontWeight: "800",
    paddingVertical: 8,
  },
  listFooterHint: {
    color: "rgba(148,163,184,0.95)",
    fontSize: 12,
    fontWeight: "800",
    paddingVertical: 8,
    textAlign: "center",
    alignSelf: "center",
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  memberItemSelected: {
    borderColor: "rgba(59,130,246,0.42)",
    backgroundColor: "rgba(30,64,175,0.20)",
  },
  memberIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  memberAvatarWrap: {
    width: 34,
    height: 34,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(15,23,42,0.55)",
  },
  memberAvatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  memberMain: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "900",
  },
  memberDesc: {
    color: "rgba(148,163,184,0.95)",
    fontSize: 11,
    fontWeight: "700",
  },
  currentRow: {
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  currentTitle: {
    color: "rgba(148,163,184,0.95)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  currentChips: {
    gap: 8,
    paddingBottom: 4,
  },
  currentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  currentChipText: {
    color: "rgba(226,232,240,0.88)",
    fontSize: 11,
    fontWeight: "900",
  },
  memberFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingTop: 4,
  },
  memberFooterGhost: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  memberFooterGhostText: {
    color: "rgba(226,232,240,0.86)",
    fontSize: 12,
    fontWeight: "800",
  },
  memberFooterCta: {
    minHeight: 38,
    minWidth: 82,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  memberFooterCtaDisabled: {
    opacity: 0.55,
  },
  memberFooterCtaText: {
    color: "#0b1220",
    fontSize: 12,
    fontWeight: "900",
  },
});
