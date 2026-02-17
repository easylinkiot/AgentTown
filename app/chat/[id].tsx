import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
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
import { tx } from "@/src/i18n/translate";
import { generateGeminiJson, generateGeminiText } from "@/src/lib/gemini";
import { useAgentTown } from "@/src/state/agenttown-context";
import { AiContextState, ConversationMessage, TaskItem } from "@/src/types";

interface PickedImageAsset {
  uri: string;
  name: string;
}

const GROUP_MEMBER_CANDIDATES = [
  "Alice",
  "Mia",
  "Logan",
  "Noah",
  "Sarah",
  "Tony",
  "Rina",
];

function toHistory(messages: ConversationMessage[]) {
  return messages.slice(-10).map((msg) => {
    const normalizedText =
      msg.type === "image"
        ? `[image] ${msg.content || msg.imageName || "photo"}`
        : msg.type === "voice"
          ? `[voice] ${msg.content || "voice message"}`
          : msg.type === "system"
            ? `[system] ${msg.content}`
            : msg.content;

    return {
      role: msg.isMe ? ("user" as const) : ("model" as const),
      text: `${msg.senderName ? `${msg.senderName}: ` : ""}${normalizedText}`,
    };
  });
}

export default function ChatDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    avatar?: string;
    isGroup?: string;
    memberCount?: string;
    phoneNumber?: string;
    supportsVideo?: string;
  }>();
  const chatId = String(params.id || "");

  const { botConfig, addTask, language } = useAgentTown();
  const tr = (zh: string, en: string) => tx(language, zh, en);
  const thread = useMemo(() => {
    const routeName = typeof params.name === "string" ? params.name : "";
    const routeAvatar = typeof params.avatar === "string" ? params.avatar : "";

    if (routeName || routeAvatar) {
      const parsedMemberCount =
        typeof params.memberCount === "string" && params.memberCount
          ? Number(params.memberCount)
          : undefined;
      return {
        id: chatId,
        name: routeName || (language === "zh" ? "未知聊天" : "Unknown Chat"),
        avatar: routeAvatar || DEFAULT_MYBOT_AVATAR,
        message: "",
        time: language === "zh" ? "现在" : "Now",
        isGroup: params.isGroup === "true",
        memberCount: Number.isFinite(parsedMemberCount) ? parsedMemberCount : undefined,
        phoneNumber:
          typeof params.phoneNumber === "string" && params.phoneNumber
            ? params.phoneNumber
            : undefined,
        supportsVideo: params.supportsVideo !== "false",
      };
    }

    return resolveChatThread(chatId, botConfig);
  }, [botConfig, chatId, language, params.avatar, params.isGroup, params.memberCount, params.name, params.phoneNumber, params.supportsVideo]);
  const isGroupChat = Boolean(thread.isGroup || chatId.startsWith("group_"));

  const [messages, setMessages] = useState<ConversationMessage[]>(() =>
    getInitialConversation(chatId, thread)
  );
  const [inputValue, setInputValue] = useState("");
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [addedTaskIndexes, setAddedTaskIndexes] = useState<Set<number>>(new Set());
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiContext, setAiContext] = useState<AiContextState>({ mode: "idle", data: null });
  const [attachmentPanelVisible, setAttachmentPanelVisible] = useState(false);
  const [pendingImage, setPendingImage] = useState<PickedImageAsset | null>(null);
  const [groupMemberCount, setGroupMemberCount] = useState(
    thread.memberCount ?? (isGroupChat ? 6 : 2)
  );
  const [inviteCursor, setInviteCursor] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const inputRef = useRef<TextInput>(null);
  const focusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    setMessages(getInitialConversation(chatId, thread));
    setActiveMessageId(null);
    setCustomPrompt("");
    setAiContext({ mode: "idle", data: null });
    setAddedTaskIndexes(new Set());
    setAttachmentPanelVisible(false);
    setPendingImage(null);
    setGroupMemberCount(thread.memberCount ?? (isGroupChat ? 6 : 2));
  }, [chatId, isGroupChat, thread]);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 40);
  }, [isAiThinking, messages.length, pendingImage]);

  const systemInstruction =
    chatId === "mybot"
      ? botConfig.systemInstruction
      : `You are participating in ${isGroupChat ? "a group chat" : "a private chat"} named "${thread.name}". Reply naturally as a helpful colleague. Keep it brief.`;

  const appendSystemMessage = (content: string) => {
    const systemMessage: ConversationMessage = {
      id: `${Date.now()}-system-${Math.random().toString(16).slice(2, 6)}`,
      senderName: tr("系统", "System"),
      senderAvatar: DEFAULT_MYBOT_AVATAR,
      content,
      type: "system",
      isMe: false,
      time: formatNowTime(),
    };

    setMessages((prev) => [...prev, systemMessage]);
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text) {
      focusInput();
      return;
    }

    setInputValue("");
    setAttachmentPanelVisible(false);
    focusInput();

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

    const reply = await generateGeminiText({
      prompt: `User message: ${text}`,
      systemInstruction,
      history: toHistory([...messages, userMessage]),
    });

    const aiMessage: ConversationMessage = {
      id: `${Date.now()}-ai`,
      senderName: thread.name,
      senderAvatar: thread.avatar,
      content: reply ?? tr("我先记下了，稍后给你完整答复。", "Noted. I will get back with a full response shortly."),
      type: "text",
      isMe: false,
      time: formatNowTime(),
    };

    setMessages((prev) => [...prev, aiMessage]);
    setIsAiThinking(false);
  };

  const sendImageMessage = async () => {
    if (!pendingImage) return;

    const caption = inputValue.trim();
    setInputValue("");
    setAttachmentPanelVisible(false);
    focusInput();

    const userImageMessage: ConversationMessage = {
      id: `${Date.now()}-img`,
      senderAvatar: botConfig.avatar || DEFAULT_MYBOT_AVATAR,
      content: caption || pendingImage.name,
      type: "image",
      imageUri: pendingImage.uri,
      imageName: pendingImage.name,
      isMe: true,
      time: formatNowTime(),
    };

    setPendingImage(null);
    setMessages((prev) => [...prev, userImageMessage]);
    setIsAiThinking(true);

    const reply = await generateGeminiText({
      prompt: caption
        ? `User sent an image with caption: ${caption}. Reply briefly.`
        : `User sent an image named ${pendingImage.name}. Reply briefly.`,
      systemInstruction,
      history: toHistory([...messages, userImageMessage]),
    });

    const aiMessage: ConversationMessage = {
      id: `${Date.now()}-ai-img`,
      senderName: thread.name,
      senderAvatar: thread.avatar,
      content: reply ?? tr("图片收到了，我会结合内容继续处理。", "Image received. I will process it with context."),
      type: "text",
      isMe: false,
      time: formatNowTime(),
    };

    setMessages((prev) => [...prev, aiMessage]);
    setIsAiThinking(false);
  };

  const openImagePicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setPendingImage({
        uri: asset.uri,
        name: asset.name || "photo",
      });
      setAttachmentPanelVisible(false);
    } catch {
      appendSystemMessage(tr("选择图片失败，请稍后重试。", "Failed to pick image. Please try again."));
    }
  };

  const startVoiceCall = () => {
    appendSystemMessage(
      language === "zh"
        ? `已与 ${thread.name} 发起语音通话（演示模式）。`
        : `Voice call started with ${thread.name} (demo mode).`
    );
  };

  const startVideoCall = () => {
    appendSystemMessage(
      language === "zh"
        ? `已与 ${thread.name} 发起视频通话（演示模式）。`
        : `Video call started with ${thread.name} (demo mode).`
    );
  };

  const addMemberToGroup = () => {
    if (!isGroupChat) return;

    const member = GROUP_MEMBER_CANDIDATES[inviteCursor % GROUP_MEMBER_CANDIDATES.length];
    setInviteCursor((prev) => prev + 1);
    setGroupMemberCount((prev) => prev + 1);
    appendSystemMessage(
      language === "zh" ? `${member} 已加入群聊。` : `${member} joined the group.`
    );
  };

  const openMoreActions = () => {
    if (isGroupChat) {
      Alert.alert(tr("群聊操作", "Group Actions"), tr("是否添加一个模拟成员到该群？", "Add one mock member to this group?"), [
        { text: tr("取消", "Cancel"), style: "cancel" },
        { text: tr("添加成员", "Add Member"), onPress: addMemberToGroup },
      ]);
      return;
    }

    Alert.alert(tr("聊天操作", "Chat Actions"), tr("在此聊天中打开通话选项？", "Open call options in this chat?"), [
      { text: tr("取消", "Cancel"), style: "cancel" },
      { text: tr("语音通话", "Voice Call"), onPress: startVoiceCall },
      { text: tr("视频通话", "Video Call"), onPress: startVideoCall },
    ]);
  };

  const runReplySuggestions = async (msg: ConversationMessage) => {
    setAiContext({ mode: "loading", data: null });

    const fallback =
      language === "zh"
        ? ["收到，我来处理", "好的，稍后给你结果", "明白，我马上推进"]
        : ["Got it, I will handle it.", "Okay, I will send updates shortly.", "Understood, I will move it forward now."];
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
      tr("先明确目标与验收标准", "Clarify the target and acceptance criteria first."),
      tr("列出 3 个可执行的短期动作", "List 3 short-term executable actions."),
      tr("同步相关成员并设定截止时间", "Align owners and set clear deadlines."),
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
      data: text ?? tr("当前无法访问 AI，请检查 EXPO_PUBLIC_GEMINI_API_KEY。", "AI is unavailable now. Please check EXPO_PUBLIC_GEMINI_API_KEY."),
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

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {thread.name}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {isGroupChat
                ? language === "zh"
                  ? `${groupMemberCount} 人 · 群聊`
                  : `${groupMemberCount} members · Group chat`
                : thread.phoneNumber || tr("私聊", "Direct chat")}
            </Text>
          </View>

          <View style={styles.headerActionGroup}>
            <Pressable style={styles.headerMiniBtn} onPress={startVoiceCall}>
              <Ionicons name="call-outline" size={18} color="#111827" />
            </Pressable>
            <Pressable
              style={styles.headerMiniBtn}
              onPress={startVideoCall}
              disabled={thread.supportsVideo === false}
            >
              <Ionicons
                name="videocam-outline"
                size={18}
                color={thread.supportsVideo === false ? "#9ca3af" : "#111827"}
              />
            </Pressable>
            <Pressable style={styles.headerMiniBtn} onPress={openMoreActions}>
              <Ionicons name="ellipsis-horizontal" size={18} color="#111827" />
            </Pressable>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
        >
          {messages.map((msg, index) => {
            const showTime = msg.time && (index === 0 || messages[index - 1].time !== msg.time);
            const canOpenAiPanel =
              msg.type === "text" || msg.type === "reply" || msg.type === "summary";

            if (msg.type === "system") {
              return (
                <View key={msg.id}>
                  {showTime ? <Text style={styles.timeText}>{msg.time}</Text> : null}
                  <View style={styles.systemRow}>
                    <Text style={styles.systemText}>{msg.content}</Text>
                  </View>
                </View>
              );
            }

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
                      disabled={!canOpenAiPanel}
                      onPress={() =>
                        canOpenAiPanel
                          ? setActiveMessageId((prev) => (prev === msg.id ? null : msg.id))
                          : undefined
                      }
                      style={[
                        styles.bubble,
                        msg.isMe ? styles.bubbleMe : styles.bubbleOther,
                        !canOpenAiPanel && styles.bubblePassive,
                      ]}
                    >
                      {msg.type === "voice" ? (
                        <Text style={styles.bubbleText}>
                          {tr("语音", "Voice")} · {msg.voiceDuration ?? "--"}
                        </Text>
                      ) : msg.type === "image" && msg.imageUri ? (
                        <View style={styles.imageBubbleWrap}>
                          <Image source={{ uri: msg.imageUri }} style={styles.imageBubble} />
                          {msg.content ? (
                            <Text style={styles.imageCaption} numberOfLines={2}>
                              {msg.content}
                            </Text>
                          ) : null}
                        </View>
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

                {activeMessageId === msg.id && canOpenAiPanel ? (
                  <View style={styles.aiPanel}>
                    <View style={styles.aiInputRow}>
                      <Ionicons name="sparkles" size={14} color="#2563eb" />
                      <TextInput
                        style={styles.aiInput}
                        value={customPrompt}
                        onChangeText={setCustomPrompt}
                        placeholder={tr("向 AI 提问...", "Ask AI...")}
                        onSubmitEditing={() => runCustomPrompt(msg)}
                      />
                      <Pressable
                        onPress={() => runCustomPrompt(msg)}
                        disabled={!customPrompt.trim()}
                        style={[
                          styles.sendMiniBtn,
                          !customPrompt.trim() && styles.sendMiniBtnDisabled,
                        ]}
                      >
                        <Ionicons name="arrow-up" size={12} color="white" />
                      </Pressable>
                    </View>

                    <View style={styles.aiActions}>
                      <Pressable style={styles.aiChip} onPress={() => runReplySuggestions(msg)}>
                        <Text style={styles.aiChipText}>{tr("回复", "Reply")}</Text>
                      </Pressable>
                      <Pressable style={styles.aiChip} onPress={() => runTaskExtraction(msg)}>
                        <Text style={styles.aiChipText}>{tr("任务", "Task")}</Text>
                      </Pressable>
                      <Pressable style={styles.aiChip} onPress={() => runBrainstorm(msg)}>
                        <Text style={styles.aiChipText}>{tr("想法", "Ideas")}</Text>
                      </Pressable>
                    </View>

                    {aiContext.mode !== "idle" ? (
                      <View style={styles.aiResultWrap}>
                        {aiContext.mode === "loading" ? (
                          <Text style={styles.aiMuted}>{tr("思考中...", "Thinking...")}</Text>
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
                                      style={[
                                        styles.taskActionBtn,
                                        added && styles.taskActionBtnDone,
                                      ]}
                                      onPress={() => !added && addToTask(task, idx)}
                                    >
                                      <Text style={styles.taskActionText}>
                                        {added ? tr("已添加", "Added") : tr("添加", "Add")}
                                      </Text>
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
              <Text style={styles.aiMuted}>
                {language === "zh" ? `${thread.name} 输入中...` : `${thread.name} is typing...`}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {pendingImage ? (
          <View style={styles.pendingImageWrap}>
            <Image source={{ uri: pendingImage.uri }} style={styles.pendingImagePreview} />
            <View style={styles.pendingImageMeta}>
              <Text style={styles.pendingImageTitle} numberOfLines={1}>
                {pendingImage.name}
              </Text>
              <Text style={styles.pendingImageHint}>
                {tr("添加描述后发送", "Add a caption, then send")}
              </Text>
            </View>
            <Pressable style={styles.pendingImageCloseBtn} onPress={() => setPendingImage(null)}>
              <Ionicons name="close" size={18} color="#4b5563" />
            </Pressable>
          </View>
        ) : null}

        {attachmentPanelVisible ? (
          <View style={styles.attachPanel}>
            <Pressable style={styles.attachItem} onPress={openImagePicker}>
              <View style={styles.attachIconBubble}>
                <Ionicons name="images-outline" size={18} color="#111827" />
              </View>
              <Text style={styles.attachText}>{tr("相册", "Photo")}</Text>
            </Pressable>
            <Pressable
              style={styles.attachItem}
              onPress={() => {
                setAttachmentPanelVisible(false);
                appendSystemMessage(
                  tr("拍照功能即将上线。", "Camera capture is coming soon.")
                );
              }}
            >
              <View style={styles.attachIconBubble}>
                <Ionicons name="camera-outline" size={18} color="#111827" />
              </View>
              <Text style={styles.attachText}>{tr("相机", "Camera")}</Text>
            </Pressable>
            <Pressable
              style={styles.attachItem}
              onPress={() => {
                setAttachmentPanelVisible(false);
                startVoiceCall();
              }}
            >
              <View style={styles.attachIconBubble}>
                <Ionicons name="call-outline" size={18} color="#111827" />
              </View>
              <Text style={styles.attachText}>{tr("通话", "Call")}</Text>
            </Pressable>
            <Pressable
              style={styles.attachItem}
              onPress={() => {
                setAttachmentPanelVisible(false);
                startVideoCall();
              }}
            >
              <View style={styles.attachIconBubble}>
                <Ionicons name="videocam-outline" size={18} color="#111827" />
              </View>
              <Text style={styles.attachText}>{tr("视频", "Video")}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.inputBar}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => setAttachmentPanelVisible((prev) => !prev)}
          >
            <Ionicons
              name={attachmentPanelVisible ? "close" : "add"}
              size={22}
              color="#374151"
            />
          </Pressable>
          <TextInput
            ref={inputRef}
            style={styles.mainInput}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder={pendingImage ? tr("添加图片描述", "Add image caption") : tr("输入消息", "Type a message")}
            onSubmitEditing={() => (pendingImage ? sendImageMessage() : handleSend())}
            blurOnSubmit={false}
            autoFocus
          />
          <Pressable
            style={styles.sendBtn}
            onPress={() => (pendingImage ? sendImageMessage() : handleSend())}
          >
            <Ionicons name={pendingImage ? "image" : "send"} size={18} color="white" />
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
    minHeight: 56,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ededed",
    gap: 6,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    color: "#111827",
    maxWidth: "100%",
  },
  headerSubtitle: {
    marginTop: 1,
    fontSize: 10,
    color: "#6b7280",
  },
  headerActionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  headerMiniBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
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
  systemRow: {
    alignItems: "center",
    marginVertical: 4,
  },
  systemText: {
    fontSize: 11,
    color: "#475569",
    backgroundColor: "rgba(255,255,255,0.72)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
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
  bubblePassive: {
    opacity: 0.96,
  },
  bubbleText: {
    fontSize: 14,
    color: "#111827",
    lineHeight: 20,
  },
  imageBubbleWrap: {
    gap: 6,
  },
  imageBubble: {
    width: 180,
    height: 180,
    borderRadius: 10,
    backgroundColor: "#d1d5db",
  },
  imageCaption: {
    fontSize: 12,
    color: "#1f2937",
    lineHeight: 17,
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
  pendingImageWrap: {
    marginHorizontal: 10,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pendingImagePreview: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#d1d5db",
  },
  pendingImageMeta: {
    flex: 1,
  },
  pendingImageTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  pendingImageHint: {
    marginTop: 2,
    fontSize: 11,
    color: "#6b7280",
  },
  pendingImageCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e5e7eb",
  },
  attachPanel: {
    marginHorizontal: 10,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f8fafc",
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  attachItem: {
    alignItems: "center",
    gap: 6,
    width: "24%",
  },
  attachIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e2e8f0",
  },
  attachText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#334155",
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
