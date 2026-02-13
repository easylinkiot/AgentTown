import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { DEFAULT_MYBOT_AVATAR } from "@/src/constants/chat";
import {
  formatNowTime,
  getInitialConversation,
  resolveChatThread,
} from "@/src/features/chat/chat-helpers";
import { generateGeminiJson, generateGeminiText } from "@/src/lib/gemini";
import { useAgentTown } from "@/src/state/agenttown-context";
import { AiContextState, ConversationMessage, TaskItem } from "@/src/types";

function toHistory(messages: ConversationMessage[]) {
  return messages.slice(-10).map((msg) => ({
    role: msg.isMe ? ("user" as const) : ("model" as const),
    text: `${msg.senderName ? `${msg.senderName}: ` : ""}${msg.content}`,
  }));
}

export default function ChatDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const chatId = String(params.id || "");

  const { botConfig, addTask } = useAgentTown();
  const thread = useMemo(() => resolveChatThread(chatId, botConfig), [botConfig, chatId]);

  const [messages, setMessages] = useState<ConversationMessage[]>(() =>
    getInitialConversation(chatId, thread)
  );
  const [inputValue, setInputValue] = useState("");
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [addedTaskIndexes, setAddedTaskIndexes] = useState<Set<number>>(new Set());
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiContext, setAiContext] = useState<AiContextState>({ mode: "idle", data: null });
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    setMessages(getInitialConversation(chatId, thread));
    setActiveMessageId(null);
    setCustomPrompt("");
    setAiContext({ mode: "idle", data: null });
    setAddedTaskIndexes(new Set());
  }, [chatId, thread]);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 40);
  }, [isAiThinking, messages.length]);

  const systemInstruction =
    chatId === "mybot"
      ? botConfig.systemInstruction
      : `You are participating in a group chat named "${thread.name}". Reply naturally as a helpful colleague. Keep it brief.`;

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text) return;

    setInputValue("");

    const userMessage: ConversationMessage = {
      id: `${Date.now()}`,
      senderAvatar: botConfig.avatar || DEFAULT_MYBOT_AVATAR,
      content: text,
      type: "text",
      isMe: true,
      time: formatNowTime(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsAiThinking(true);

    const prompt = `User message: ${text}`;
    const reply = await generateGeminiText({
      prompt,
      systemInstruction,
      history: toHistory([...messages, userMessage]),
    });

    const aiMessage: ConversationMessage = {
      id: `${Date.now()}-ai`,
      senderName: thread.name,
      senderAvatar: thread.avatar,
      content: reply ?? "我先记下了，稍后给你完整答复。",
      type: "text",
      isMe: false,
      time: formatNowTime(),
    };

    setMessages((prev) => [...prev, aiMessage]);
    setIsAiThinking(false);
  };

  const runReplySuggestions = async (msg: ConversationMessage) => {
    setAiContext({ mode: "loading", data: null });

    const fallback = ["收到，我来处理", "好的，稍后给你结果", "明白，我马上推进"];
    const data = await generateGeminiJson<string[]>(
      `Context chat history:\n${messages
        .slice(-6)
        .map((m) => `${m.senderName || (m.isMe ? "Me" : "Colleague")}: ${m.content}`)
        .join("\n")}\n\nGenerate 3 concise reply suggestions for this message: "${msg.content}". Return JSON array only.`,
      fallback,
      systemInstruction
    );

    setAiContext({ mode: "reply", data: Array.isArray(data) ? data.slice(0, 3) : fallback });
  };

  const runTaskExtraction = async (msg: ConversationMessage) => {
    setAiContext({ mode: "loading", data: null });

    const fallback: TaskItem[] = [
      {
        title: "Follow up this thread",
        assignee: "Jason",
        priority: "Medium",
        status: "Pending",
      },
    ];

    const data = await generateGeminiJson<TaskItem[]>(
      `Analyze this conversation and extract actionable tasks related to: "${msg.content}".\nReturn JSON array only.\nEach item schema: {"title":string,"assignee":string,"priority":"High|Medium|Low","status":"Pending"}`,
      fallback,
      systemInstruction,
      toHistory(messages)
    );

    const tasks = Array.isArray(data) ? data : fallback;
    setAiContext({ mode: "task", data: tasks });
    setAddedTaskIndexes(new Set());
  };

  const runBrainstorm = async (msg: ConversationMessage) => {
    setAiContext({ mode: "loading", data: null });

    const fallback = [
      "先明确目标与验收标准",
      "列出 3 个可执行的短期动作",
      "同步相关成员并设定截止时间",
    ];

    const data = await generateGeminiJson<string[]>(
      `Brainstorm 3 actionable ideas for this message: "${msg.content}". Return JSON array only.`,
      fallback,
      systemInstruction,
      toHistory(messages)
    );

    setAiContext({ mode: "brainstorm", data: Array.isArray(data) ? data : fallback });
  };

  const runCustomPrompt = async (msg: ConversationMessage) => {
    const query = customPrompt.trim();
    if (!query) return;

    setCustomPrompt("");
    setAiContext({ mode: "loading", data: null });

    const text = await generateGeminiText({
      prompt: `Regarding this message: "${msg.content}"\nUser request: ${query}`,
      systemInstruction,
      history: toHistory(messages),
    });

    setAiContext({
      mode: "custom",
      data: text ?? "当前无法访问 AI，请检查 EXPO_PUBLIC_GEMINI_API_KEY。",
    });
  };

  const addToTask = (task: TaskItem, index: number) => {
    addTask(task);
    setAddedTaskIndexes((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable style={styles.headerIconBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {thread.name}
          </Text>
          <View style={styles.headerIconBtn}>
            <Ionicons name="ellipsis-horizontal" size={18} color="#111827" />
          </View>
        </View>

        <ScrollView ref={scrollRef} style={styles.messageList} contentContainerStyle={styles.messageContent}>
          {messages.map((msg, index) => {
            const showTime = msg.time && (index === 0 || messages[index - 1].time !== msg.time);

            return (
              <View key={msg.id}>
                {showTime ? <Text style={styles.timeText}>{msg.time}</Text> : null}

                <View style={[styles.rowWrap, msg.isMe ? styles.rowMe : styles.rowOther]}>
                  <Image source={{ uri: msg.senderAvatar }} style={styles.msgAvatar} />
                  <View style={[styles.bubbleWrap, msg.isMe && styles.bubbleWrapMe]}>
                    {!msg.isMe && msg.senderName ? (
                      <Text style={styles.senderName}>{msg.senderName}</Text>
                    ) : null}

                    <Pressable
                      onPress={() =>
                        setActiveMessageId((prev) => (prev === msg.id ? null : msg.id))
                      }
                      style={[styles.bubble, msg.isMe ? styles.bubbleMe : styles.bubbleOther]}
                    >
                      {msg.type === "voice" ? (
                        <Text style={styles.bubbleText}>Voice · {msg.voiceDuration ?? "--"}</Text>
                      ) : (
                        <Text style={styles.bubbleText}>{msg.content}</Text>
                      )}
                      {msg.type === "reply" && msg.replyContext ? (
                        <View style={styles.replyContextWrap}>
                          <Text style={styles.replyContext}>{msg.replyContext}</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  </View>
                </View>

                {activeMessageId === msg.id ? (
                  <View style={styles.aiPanel}>
                    <View style={styles.aiInputRow}>
                      <Ionicons name="sparkles" size={14} color="#2563eb" />
                      <TextInput
                        style={styles.aiInput}
                        value={customPrompt}
                        onChangeText={setCustomPrompt}
                        placeholder="Ask AI..."
                        onSubmitEditing={() => runCustomPrompt(msg)}
                      />
                      <Pressable
                        onPress={() => runCustomPrompt(msg)}
                        disabled={!customPrompt.trim()}
                        style={[styles.sendMiniBtn, !customPrompt.trim() && styles.sendMiniBtnDisabled]}
                      >
                        <Ionicons name="arrow-up" size={12} color="white" />
                      </Pressable>
                    </View>

                    <View style={styles.aiActions}>
                      <Pressable style={styles.aiChip} onPress={() => runReplySuggestions(msg)}>
                        <Text style={styles.aiChipText}>Reply</Text>
                      </Pressable>
                      <Pressable style={styles.aiChip} onPress={() => runTaskExtraction(msg)}>
                        <Text style={styles.aiChipText}>Task</Text>
                      </Pressable>
                      <Pressable style={styles.aiChip} onPress={() => runBrainstorm(msg)}>
                        <Text style={styles.aiChipText}>Ideas</Text>
                      </Pressable>
                    </View>

                    {aiContext.mode !== "idle" ? (
                      <View style={styles.aiResultWrap}>
                        {aiContext.mode === "loading" ? (
                          <Text style={styles.aiMuted}>Thinking...</Text>
                        ) : null}

                        {aiContext.mode === "reply" && Array.isArray(aiContext.data) ? (
                          <View style={styles.aiResultList}>
                            {(aiContext.data as string[]).map((item, idx) => (
                              <Pressable
                                key={`${item}-${idx}`}
                                style={styles.aiResultItemBtn}
                                onPress={() => {
                                  setInputValue(item);
                                  setActiveMessageId(null);
                                }}
                              >
                                <Text style={styles.aiResultText}>{item}</Text>
                              </Pressable>
                            ))}
                          </View>
                        ) : null}

                        {aiContext.mode === "task" && Array.isArray(aiContext.data) ? (
                          <View style={styles.aiResultList}>
                            {(aiContext.data as TaskItem[]).map((task, idx) => {
                              const added = addedTaskIndexes.has(idx);
                              return (
                                <View style={styles.taskCard} key={`${task.title}-${idx}`}>
                                  <View style={styles.taskTopRow}>
                                    <Text style={styles.taskTitle}>{task.title}</Text>
                                    <Pressable
                                      style={[styles.taskActionBtn, added && styles.taskActionBtnDone]}
                                      onPress={() => !added && addToTask(task, idx)}
                                    >
                                      <Text style={styles.taskActionText}>{added ? "Added" : "Add"}</Text>
                                    </Pressable>
                                  </View>
                                  <Text style={styles.taskMeta}>
                                    {task.assignee} · {task.priority}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        ) : null}

                        {aiContext.mode === "brainstorm" && Array.isArray(aiContext.data) ? (
                          <View style={styles.aiResultList}>
                            {(aiContext.data as string[]).map((item, idx) => (
                              <View style={styles.ideaItem} key={`${item}-${idx}`}>
                                <Text style={styles.ideaIndex}>{idx + 1}.</Text>
                                <Text style={styles.aiResultText}>{item}</Text>
                              </View>
                            ))}
                          </View>
                        ) : null}

                        {aiContext.mode === "custom" && typeof aiContext.data === "string" ? (
                          <Text style={styles.customText}>{aiContext.data}</Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}

          {isAiThinking ? (
            <View style={styles.typingRow}>
              <Text style={styles.aiMuted}>{thread.name} is typing...</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.inputBar}>
          <Pressable style={styles.iconBtn}>
            <Ionicons name="add" size={22} color="#374151" />
          </Pressable>
          <TextInput
            style={styles.mainInput}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="Type a message"
            onSubmitEditing={handleSend}
          />
          <Pressable style={styles.sendBtn} onPress={handleSend}>
            <Ionicons name="send" size={18} color="white" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ededed",
  },
  keyboardWrap: {
    flex: 1,
  },
  header: {
    height: 52,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ededed",
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    color: "#111827",
    marginHorizontal: 6,
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  timeText: {
    textAlign: "center",
    fontSize: 11,
    color: "#9ca3af",
    marginVertical: 4,
  },
  rowWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  rowOther: {
    justifyContent: "flex-start",
  },
  rowMe: {
    justifyContent: "flex-end",
    flexDirection: "row-reverse",
  },
  msgAvatar: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#d1d5db",
  },
  bubbleWrap: {
    maxWidth: "82%",
  },
  bubbleWrapMe: {
    alignItems: "flex-end",
  },
  senderName: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 3,
  },
  bubble: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  bubbleOther: {
    backgroundColor: "white",
  },
  bubbleMe: {
    backgroundColor: "#95EC69",
  },
  bubbleText: {
    fontSize: 14,
    color: "#111827",
    lineHeight: 20,
  },
  replyContextWrap: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 6,
  },
  replyContext: {
    fontSize: 11,
    color: "#6b7280",
  },
  aiPanel: {
    marginTop: 6,
    marginLeft: 42,
    marginRight: 10,
    backgroundColor: "#f3f4f6",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 8,
    gap: 8,
  },
  aiInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 8,
  },
  aiInput: {
    flex: 1,
    minHeight: 34,
    fontSize: 12,
  },
  sendMiniBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  sendMiniBtnDisabled: {
    backgroundColor: "#9ca3af",
  },
  aiActions: {
    flexDirection: "row",
    gap: 6,
  },
  aiChip: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "white",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  aiChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
  },
  aiResultWrap: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 8,
  },
  aiResultList: {
    gap: 6,
  },
  aiMuted: {
    fontSize: 11,
    color: "#6b7280",
  },
  aiResultItemBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  aiResultText: {
    fontSize: 12,
    color: "#374151",
    lineHeight: 17,
  },
  taskCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    backgroundColor: "#f9fafb",
    padding: 8,
    gap: 4,
  },
  taskTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  taskTitle: {
    flex: 1,
    fontSize: 12,
    color: "#111827",
    fontWeight: "700",
  },
  taskMeta: {
    fontSize: 10,
    color: "#6b7280",
  },
  taskActionBtn: {
    borderRadius: 999,
    backgroundColor: "#2563eb",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  taskActionBtnDone: {
    backgroundColor: "#16a34a",
  },
  taskActionText: {
    fontSize: 10,
    fontWeight: "700",
    color: "white",
  },
  ideaItem: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 3,
  },
  ideaIndex: {
    color: "#7c3aed",
    fontSize: 12,
    fontWeight: "700",
  },
  customText: {
    fontSize: 12,
    color: "#374151",
    lineHeight: 18,
  },
  typingRow: {
    marginLeft: 44,
    marginTop: 4,
  },
  inputBar: {
    minHeight: 56,
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
    backgroundColor: "#f7f7f7",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  mainInput: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "white",
    paddingHorizontal: 12,
    fontSize: 15,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#07c160",
  },
});
