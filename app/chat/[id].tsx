import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { KeyframeBackground } from "@/src/components/KeyframeBackground";
import { EmptyState, LoadingSkeleton, StateBanner } from "@/src/components/StateBlocks";
import { tx } from "@/src/i18n/translate";
import { useAgentTown } from "@/src/state/agenttown-context";
import { ConversationMessage, ThreadMember } from "@/src/types";

type MemberFilter = "all" | "human" | "agent" | "role";

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

export default function ChatDetailScreen() {
  const router = useRouter();
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
    sendMessage,
    createTaskFromMessage,
    listMembers,
    addMember,
    removeMember,
    generateRoleReplies,
  } = useAgentTown();

  const tr = (zh: string, en: string) => tx(language, zh, en);

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

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failedDraft, setFailedDraft] = useState<string | null>(null);

  const [actionModal, setActionModal] = useState(false);
  const [actionMessage, setActionMessage] = useState<ConversationMessage | null>(null);

  const [memberModal, setMemberModal] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!chatId) return;
      setLoading(true);
      setLoadError(null);
      try {
        await refreshThreadMessages(chatId);
        if (thread.isGroup) {
          await listMembers(chatId);
        }
      } catch (err) {
        if (mounted) setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [chatId, listMembers, refreshThreadMessages, thread.isGroup]);

  const candidates = useMemo(() => {
    const usedFriendIds = new Set(members.map((m) => m.friendId).filter(Boolean));
    const usedAgentIds = new Set(members.map((m) => m.agentId).filter(Boolean));

    const friendItems = friends
      .filter((f) => !usedFriendIds.has(f.id))
      .map((f) => ({
        key: `friend:${f.id}`,
        type: f.kind === "bot" ? ("role" as const) : ("human" as const),
        label: f.name,
        desc: f.role || f.company || (f.kind === "bot" ? "Bot" : "Human"),
        onAdd: async () => {
          await addMember(chatId, { friendId: f.id, memberType: f.kind === "bot" ? "role" : "human" });
          await listMembers(chatId);
          setMemberModal(false);
        },
      }));

    const agentItems = agents
      .filter((a) => !usedAgentIds.has(a.id))
      .map((a) => ({
        key: `agent:${a.id}`,
        type: "agent" as const,
        label: a.name,
        desc: a.persona || a.description || "Agent",
        onAdd: async () => {
          await addMember(chatId, { agentId: a.id, memberType: "agent" });
          await listMembers(chatId);
          setMemberModal(false);
        },
      }));

    const all = [...friendItems, ...agentItems];
    const keyword = memberQuery.trim().toLowerCase();

    return all.filter((item) => {
      if (memberFilter !== "all" && item.type !== memberFilter) return false;
      if (!keyword) return true;
      return item.label.toLowerCase().includes(keyword) || item.desc.toLowerCase().includes(keyword);
    });
  }, [addMember, agents, chatId, friends, listMembers, memberFilter, memberQuery, members]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || submitting || !chatId) return;

    setSubmitting(true);
    setFailedDraft(null);

    try {
      if (thread.isGroup) {
        const ids = mentionMemberIDs(content, members);
        await generateRoleReplies(chatId, content, ids.length ? ids : undefined);
      } else {
        const result = await sendMessage(chatId, {
          content,
          type: "text",
          senderName: "Me",
          senderAvatar: botConfig.avatar,
          senderType: "human",
          isMe: true,
          requestAI: true,
          systemInstruction: botConfig.systemInstruction,
        });
        if (!result) {
          setFailedDraft(content);
        }
      }
      setInput("");
    } catch (err) {
      setFailedDraft(content);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLongPress = (message: ConversationMessage) => {
    setActionMessage(message);
    setActionModal(true);
  };

  return (
    <KeyframeBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={18} color="#e2e8f0" />
            </Pressable>
            <View style={styles.headerMain}>
              <Text style={styles.title} numberOfLines={1}>
                {thread.name}
              </Text>
              <Text style={styles.subtitle}>
                {thread.isGroup
                  ? tr(`${Math.max(thread.memberCount || 0, members.length)} people active`, `${Math.max(thread.memberCount || 0, members.length)} people active`)
                  : tr("Direct", "Direct")}
              </Text>
            </View>
            <View style={styles.headerActions}>
              {thread.isGroup ? (
                <Pressable style={styles.headerIcon} onPress={() => setMemberModal(true)}>
                  <Ionicons name="person-add-outline" size={16} color="rgba(226,232,240,0.92)" />
                </Pressable>
              ) : null}
              <Pressable style={styles.headerIcon} onPress={() => null}>
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
                  .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)))
                  .finally(() => setLoading(false));
              }}
            />
          ) : null}

          {loading ? (
            <LoadingSkeleton kind="messages" />
          ) : messages.length === 0 ? (
            <EmptyState title={tr("暂无消息", "No messages yet")} hint={tr("从底部输入开始对话", "Start typing below")} icon="chatbox-ellipses-outline" />
          ) : (
            <ScrollView style={styles.messageList} contentContainerStyle={styles.messageContent}>
              {messages.map((msg) => {
                if (msg.type === "system") {
                  return (
                    <View key={msg.id} style={styles.sysRow}>
                      <View style={styles.sysPill}>
                        <Text style={styles.sysText}>{msg.content}</Text>
                      </View>
                    </View>
                  );
                }

                const me = !!msg.isMe;
                const highlighted = highlightMessageId !== "" && msg.id === highlightMessageId;
                return (
                  <View key={msg.id} style={[styles.msgRow, me && styles.msgRowMe]}>
                    <Pressable
                      onLongPress={() => handleLongPress(msg)}
                      delayLongPress={220}
                      style={[
                        styles.bubble,
                        me ? styles.bubbleMe : styles.bubbleOther,
                        highlighted && styles.bubbleHighlight,
                      ]}
                    >
                      {!me && msg.senderName ? (
                        <Text style={styles.sender} numberOfLines={1}>
                          {msg.senderName}
                        </Text>
                      ) : null}
                      <Text style={[styles.msgText, me && styles.msgTextMe]}>{msg.content}</Text>
                      {msg.time ? <Text style={styles.time}>{msg.time}</Text> : null}
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
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
            <Pressable style={[styles.sendBtn, submitting && styles.sendBtnDisabled]} onPress={handleSend}>
              <Ionicons name="arrow-up" size={18} color="#0b1220" />
            </Pressable>
          </View>
        </View>

        <Modal visible={actionModal} transparent animationType="fade" onRequestClose={() => setActionModal(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setActionModal(false)}>
            <Pressable style={styles.actionSheet} onPress={() => null}>
              <Text style={styles.sheetTitle}>{tr("操作", "Actions")}</Text>
              <Pressable
                style={styles.sheetItem}
                onPress={() => {
                  if (!actionMessage) return;
                  void createTaskFromMessage(chatId, actionMessage.id, actionMessage.content.slice(0, 80)).finally(() =>
                    setActionModal(false)
                  );
                }}
              >
                <Ionicons name="checkbox-outline" size={16} color="#bfdbfe" />
                <Text style={styles.sheetText}>{tr("转任务", "Convert to Task")}</Text>
              </Pressable>
              <Pressable
                style={styles.sheetItem}
                onPress={() => {
                  if (!actionMessage) return;
                  void sendMessage(chatId, {
                    content: `${tr("帮我回复：", "Draft reply: ")}${actionMessage.content}`,
                    type: "text",
                    senderName: "Me",
                    senderAvatar: botConfig.avatar,
                    senderType: "human",
                    isMe: true,
                    requestAI: true,
                    systemInstruction: botConfig.systemInstruction,
                  }).finally(() => setActionModal(false));
                }}
              >
                <Ionicons name="sparkles-outline" size={16} color="#bfdbfe" />
                <Text style={styles.sheetText}>{tr("自动回复", "Auto Reply")}</Text>
              </Pressable>
              <Pressable style={styles.sheetClose} onPress={() => setActionModal(false)}>
                <Text style={styles.sheetCloseText}>{tr("关闭", "Close")}</Text>
              </Pressable>
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
                {candidates.map((c) => (
                  <Pressable key={c.key} style={styles.memberItem} onPress={() => void c.onAdd()}>
                    <View style={styles.memberMain}>
                      <Text style={styles.memberName}>{c.label}</Text>
                      <Text style={styles.memberDesc} numberOfLines={1}>{c.desc}</Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={18} color="#93c5fd" />
                  </Pressable>
                ))}
                {candidates.length === 0 ? (
                  <EmptyState title={tr("没有可添加对象", "No candidates")} hint={tr("换个关键词试试", "Try another search")} icon="person-add-outline" />
                ) : null}
              </ScrollView>

              <View style={styles.currentRow}>
                <Text style={styles.currentTitle}>{tr("当前成员", "Members")}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.currentChips}>
                  {members.map((m) => (
                    <View key={m.id} style={styles.currentChip}>
                      <Text style={styles.currentChipText}>{m.name}</Text>
                      <Pressable onPress={() => void removeMember(chatId, m.id)}>
                        <Ionicons name="close" size={12} color="rgba(248,113,113,0.95)" />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              </View>
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
    fontSize: 16,
    fontWeight: "900",
  },
  subtitle: {
    color: "rgba(148,163,184,0.95)",
    fontSize: 11,
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
  messageContent: {
    paddingVertical: 8,
    gap: 10,
  },
  sysRow: {
    alignItems: "center",
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
    fontSize: 12,
    fontWeight: "700",
  },
  msgRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  msgRowMe: {
    justifyContent: "flex-end",
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
    fontSize: 11,
    fontWeight: "900",
  },
  msgText: {
    color: "rgba(226,232,240,0.92)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  msgTextMe: {
    color: "#f8fafc",
  },
  time: {
    color: "rgba(148,163,184,0.9)",
    fontSize: 10,
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
    fontSize: 13,
    lineHeight: 18,
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
  actionSheet: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(15,23,42,0.92)",
    padding: 14,
    gap: 10,
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(15,23,42,0.92)",
    padding: 14,
    gap: 10,
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
    flex: 1,
  },
  memberListContent: {
    gap: 10,
    paddingBottom: 10,
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
});

