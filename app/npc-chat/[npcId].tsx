import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as VideoThumbnails from "expo-video-thumbnails";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import * as RNClipboardModule from "react-native/Libraries/Components/Clipboard/Clipboard";
import {
  Composer,
  type ComposerProps,
  GiftedChat,
  type IMessage,
  InputToolbar,
  type InputToolbarProps,
} from "react-native-gifted-chat";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { KeyframeBackground } from "@/src/components/KeyframeBackground";
import { EmptyState, LoadingSkeleton, StateBanner } from "@/src/components/StateBlocks";
import { APP_SAFE_AREA_EDGES } from "@/src/constants/safe-area";
import {
  inferUploadFilename,
  normalizeMediaAssetForUpload,
} from "@/src/features/chat/media-upload";
import { tx } from "@/src/i18n/translate";
import {
  formatApiError,
  getNPC,
  listNPCSessionMessages,
  listNPCSessions,
  uploadFileV2,
  type V2ChatSessionMessage,
} from "@/src/lib/api";
import { runChatCompletions } from "@/src/services/chatAssist";
import { useAgentTown } from "@/src/state/agenttown-context";
import { useAuth } from "@/src/state/auth-context";
import type { NPC } from "@/src/types";

type GiftedNPCMessage = IMessage & {
  role: "user" | "assistant";
};

type MediaPickerAsset = {
  id: string;
  type: "image" | "video";
  uri: string;
  thumbUri: string;
  duration?: number;
  filename?: string;
  width?: number;
  height?: number;
  fileSize?: number;
};

type KeyboardTarget = "chat";

const KEYBOARD_CLEARANCE = 25;
const KEYBOARD_CLEARANCE_IOS = 25;
const CHAT_COMPOSER_MIN_HEIGHT = 72;
const CHAT_COMPOSER_MAX_HEIGHT = 144;
type ClipboardLike = {
  setString(content: string): void;
};
const ClipboardCompat: ClipboardLike = (
  (RNClipboardModule as unknown as { default?: ClipboardLike; Clipboard?: ClipboardLike }).default ??
  (RNClipboardModule as unknown as { default?: ClipboardLike; Clipboard?: ClipboardLike }).Clipboard ??
  (RNClipboardModule as unknown as ClipboardLike)
);

async function toMediaPickerAsset(
  asset: ImagePicker.ImagePickerAsset,
  index: number
): Promise<MediaPickerAsset> {
  const type = asset.type === "video" ? "video" : "image";
  const uri = (asset.uri || "").trim();
  let thumbUri = uri;
  if (type === "video" && uri) {
    try {
      const thumbnail = await VideoThumbnails.getThumbnailAsync(uri, { time: 0 });
      if (thumbnail.uri) {
        thumbUri = thumbnail.uri;
      }
    } catch {
      thumbUri = uri;
    }
  }
  const fallbackName = `${type}_${Date.now()}_${index + 1}.${type === "video" ? "mp4" : "jpg"}`;
  return {
    id: (asset.assetId || `${type}_${Date.now()}_${index}`).trim(),
    type,
    uri,
    thumbUri: thumbUri || uri,
    duration: type === "video" && typeof asset.duration === "number" ? Math.max(0, Math.round(asset.duration)) : undefined,
    filename: (asset.fileName || fallbackName).trim() || fallbackName,
    width: typeof asset.width === "number" ? asset.width : undefined,
    height: typeof asset.height === "number" ? asset.height : undefined,
    fileSize: typeof asset.fileSize === "number" ? asset.fileSize : undefined,
  };
}

function parseSessionId(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const row = payload as { session_id?: unknown; sessionId?: unknown };
  if (typeof row.session_id === "string" && row.session_id.trim()) return row.session_id.trim();
  if (typeof row.sessionId === "string" && row.sessionId.trim()) return row.sessionId.trim();
  return "";
}

function toGiftedNPCMessage(
  row: V2ChatSessionMessage,
  currentUserId: string,
  npcName: string,
  index: number
): GiftedNPCMessage {
  const role = (row.role || "").trim().toLowerCase() === "user" ? "user" : "assistant";
  const messageType = (row.message_type || "text").trim().toLowerCase();
  const rawText = typeof row.content === "string" ? row.content : "";
  const normalizedImageUri =
    messageType === "image" && /^https?:\/\//i.test(rawText.trim()) ? rawText.trim() : "";
  const createdAtValue = row.created_at || row.updated_at;
  const parsedTime =
    typeof createdAtValue === "number"
      ? new Date(createdAtValue > 1_000_000_000_000 ? createdAtValue : createdAtValue * 1000)
      : new Date(Date.parse(String(createdAtValue || "")) || Date.now() + index);
  return {
    _id: row.id || `${role}_${index}_${parsedTime.getTime()}`,
    text: normalizedImageUri ? "" : rawText,
    image: normalizedImageUri || undefined,
    createdAt: parsedTime,
    user: {
      _id: role === "user" ? currentUserId || "me" : "npc_assistant",
      name: role === "user" ? "Me" : npcName || "NPC",
    },
    role,
  };
}

export default function NPCChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { npcId, name, sessionId: routeSessionId } = useLocalSearchParams<{
    npcId: string;
    name?: string;
    sessionId?: string;
  }>();
  const { language } = useAgentTown();
  const { user } = useAuth();
  const tr = (zh: string, en: string) => tx(language, zh, en);
  const currentUserId = (user?.id || "").trim();

  const [npc, setNpc] = useState<NPC | null>(null);
  const [messages, setMessages] = useState<GiftedNPCMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [mediaSending, setMediaSending] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [input, setInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const keyboardPadding = useRef(new Animated.Value(0)).current;
  const activeKeyboardTargetRef = useRef<KeyboardTarget | null>(null);
  const lastKeyboardHeightRef = useRef(0);
  const lastKeyboardDurationRef = useRef(0);

  const npcName = useMemo(() => npc?.name || name || tr("NPC 对话", "NPC Chat"), [name, npc?.name, tr]);
  const sendDisabled = sending || mediaSending || input.trim().length === 0;
  const ContainerView = Animated.View;
  const containerStyle = [styles.container, { paddingBottom: keyboardPadding }];
  const chatComposerMaxHeight = useMemo(
    () => Math.max(CHAT_COMPOSER_MIN_HEIGHT, Math.floor(windowHeight * 0.5)),
    [windowHeight]
  );
  const chatComposerTextMaxHeight = useMemo(
    () => Math.max(CHAT_COMPOSER_MIN_HEIGHT - 12, chatComposerMaxHeight - 12),
    [chatComposerMaxHeight]
  );

  const loadMessages = useCallback(
    async (nextSessionId: string, nextNpcName: string) => {
      if (!npcId || !nextSessionId) {
        setMessages([]);
        return;
      }
      const rows = await listNPCSessionMessages(npcId, nextSessionId);
      const mapped = rows
        .map((row, index) => toGiftedNPCMessage(row, currentUserId, nextNpcName, index))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMessages(mapped);
    },
    [currentUserId, npcId]
  );

  const loadConversation = useCallback(async () => {
    if (!npcId) return;
    setLoading(true);
    try {
      const [npcDetail, sessions] = await Promise.all([
        getNPC(npcId),
        listNPCSessions(npcId, { limit: 20 }),
      ]);
      const resolvedSessionId =
        String(routeSessionId || "").trim() || sessions[0]?.id || "";
      setNpc(npcDetail);
      setSessionId(resolvedSessionId);
      await loadMessages(resolvedSessionId, npcDetail.name || String(name || ""));
      setError(null);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [loadMessages, name, npcId, routeSessionId]);

  useEffect(() => {
    void loadConversation();
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [loadConversation]);

  const animateKeyboardValue = useCallback((value: Animated.Value, toValue: number, duration: number) => {
    Animated.timing(value, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, []);

  const resetKeyboardOffsets = useCallback(
    (duration: number) => {
      animateKeyboardValue(keyboardPadding, 0, duration);
    },
    [animateKeyboardValue, keyboardPadding]
  );

  const applyKeyboardAvoidance = useCallback(
    (keyboardHeight: number, duration: number) => {
      const target = activeKeyboardTargetRef.current;
      if (!target || keyboardHeight <= 0) {
        resetKeyboardOffsets(duration);
        return;
      }
      const clearance = Platform.OS === "ios" ? KEYBOARD_CLEARANCE_IOS : KEYBOARD_CLEARANCE;
      const usableKeyboardHeight =
        Platform.OS === "ios"
          ? Math.max(0, keyboardHeight - insets.bottom)
          : Math.max(0, keyboardHeight);
      animateKeyboardValue(keyboardPadding, usableKeyboardHeight + clearance, duration);
    },
    [animateKeyboardValue, insets.bottom, keyboardPadding, resetKeyboardOffsets]
  );

  useEffect(() => {
    const isIOS = Platform.OS === "ios";
    const handleFrame = (event?: { endCoordinates?: { height?: number }; duration?: number }) => {
      const height = Math.max(0, event?.endCoordinates?.height ?? 0);
      const duration = event?.duration ?? (isIOS ? 250 : 200);
      lastKeyboardHeightRef.current = height;
      lastKeyboardDurationRef.current = duration;
      applyKeyboardAvoidance(height, duration);
    };
    const handleHide = (event?: { duration?: number }) => {
      const duration = event?.duration ?? (isIOS ? 200 : 180);
      lastKeyboardHeightRef.current = 0;
      lastKeyboardDurationRef.current = duration;
      resetKeyboardOffsets(duration);
    };
    const showEvent = isIOS ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = isIOS ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, handleFrame);
    const hideSub = Keyboard.addListener(hideEvent, handleHide);
    const didHideSub = Keyboard.addListener("keyboardDidHide", handleHide);
    const changeSub = isIOS ? Keyboard.addListener("keyboardWillChangeFrame", handleFrame) : null;
    return () => {
      showSub.remove();
      hideSub.remove();
      didHideSub.remove();
      changeSub?.remove();
    };
  }, [applyKeyboardAvoidance, resetKeyboardOffsets]);

  const setKeyboardTarget = useCallback(
    (target: KeyboardTarget | null) => {
      activeKeyboardTargetRef.current = target;
      if (!target) {
        resetKeyboardOffsets(lastKeyboardDurationRef.current || 120);
        return;
      }
      if (lastKeyboardHeightRef.current > 0) {
        applyKeyboardAvoidance(lastKeyboardHeightRef.current, lastKeyboardDurationRef.current || 120);
      }
    },
    [applyKeyboardAvoidance, resetKeyboardOffsets]
  );

  const copyMessageText = useCallback(
    (value: string) => {
      const text = value.trim();
      if (!text) {
        Alert.alert(
          tr("无法复制", "Unable to copy"),
          tr("该消息没有可复制的文字内容。", "This message has no copyable text content.")
        );
        return;
      }
      ClipboardCompat.setString(text);
      Alert.alert(tr("已复制", "Copied"), tr("消息已复制到剪贴板。", "Message copied to clipboard."));
    },
    [tr]
  );

  const openMessageActions = useCallback(
    (
      actions: { label: string; onPress?: () => void; style?: "default" | "cancel" }[]
    ) => {
      if (Platform.OS === "ios") {
        const options = actions.map((item) => item.label);
        const cancelButtonIndex = actions.findIndex((item) => item.style === "cancel");
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex: cancelButtonIndex >= 0 ? cancelButtonIndex : undefined,
          },
          (buttonIndex) => {
            if (buttonIndex < 0 || buttonIndex >= actions.length) return;
            const selected = actions[buttonIndex];
            if (selected.style === "cancel") return;
            selected.onPress?.();
          }
        );
        return;
      }

      Alert.alert(
        "",
        "",
        actions.map((item) => ({
          text: item.label,
          onPress: item.onPress,
          style: item.style,
        }))
      );
    },
    []
  );

  const handleMessageLongPress = useCallback(
    (_context: unknown, message?: IMessage) => {
      const text = String(message?.text || "").trim();
      openMessageActions([
        ...(text
          ? [
              {
                label: tr("Reply", "Reply"),
                onPress: () => {
                  setInput(text);
                },
              },
              {
                label: tr("Summary", "Summary"),
                onPress: () => {
                  setInput(
                    tr(
                      `请总结这条消息的重点：${text}`,
                      `Summarize the key points of this message: ${text}`
                    )
                  );
                },
              },
              {
                label: tr("To-do", "To-do"),
                onPress: () => {
                  setInput(
                    tr(
                      `请把这条消息提炼成可执行待办：${text}`,
                      `Extract actionable to-dos from this message: ${text}`
                    )
                  );
                },
              },
              {
                label: "ASK",
                onPress: () => {
                  setInput(
                    tr(
                      `关于这条消息，请继续深入分析：${text}`,
                      `Please analyze this message in depth: ${text}`
                    )
                  );
                },
              },
              { label: tr("Copy", "Copy"), onPress: () => copyMessageText(text) },
            ]
          : []),
        { label: tr("取消", "Cancel"), style: "cancel" as const },
      ]);
    },
    [copyMessageText, openMessageActions, tr]
  );

  const sendNPCTurn = useCallback(
    async (
      content: string,
      options?: {
        clearInput?: boolean;
        localUserMessage?: GiftedNPCMessage | null;
      }
    ) => {
      const text = content.trim();
      if (!npcId || !text || sending) return false;

      const defaultLocalUserMessage: GiftedNPCMessage = {
        _id: `npc_user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        text,
        createdAt: new Date(),
        user: {
          _id: currentUserId || "me",
          name: user?.displayName || "Me",
        },
        role: "user",
      };
      const localUserMessage =
        options?.localUserMessage === undefined ? defaultLocalUserMessage : options.localUserMessage;
      const localAssistantId = `npc_assistant_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const localAssistantMessage: GiftedNPCMessage = {
        _id: localAssistantId,
        text: "",
        createdAt: new Date(Date.now() + 1),
        user: {
          _id: "npc_assistant",
          name: npcName,
        },
        role: "assistant",
      };

      setMessages((prev) => {
        const nextBatch = localUserMessage ? [localAssistantMessage, localUserMessage] : [localAssistantMessage];
        return GiftedChat.append(prev, nextBatch);
      });
      setSending(true);
      setError(null);
      if (options?.clearInput ?? true) {
        setInput("");
      }

      const controller = new AbortController();
      abortRef.current = controller;
      let latestText = "";
      let resolvedSessionId = sessionId;

      try {
        await runChatCompletions(
          {
            input: text,
            session_id: resolvedSessionId || undefined,
            path: `/v2/npc/${encodeURIComponent(npcId)}/chat`,
          },
          {
            onEvent: (_eventName, payload) => {
              const nextSessionId = parseSessionId(payload);
              if (nextSessionId) {
                resolvedSessionId = nextSessionId;
              }
            },
            onText: (streamText) => {
              latestText = streamText;
              setMessages((prev) =>
                prev.map((item) =>
                  item._id === localAssistantId
                    ? {
                        ...item,
                        text: streamText,
                      }
                    : item
                )
              );
            },
          },
          controller.signal
        );

        if (resolvedSessionId) {
          setSessionId(resolvedSessionId);
          if (!latestText.trim()) {
            await loadMessages(resolvedSessionId, npcName);
          }
        } else if (latestText.trim()) {
          setMessages((prev) =>
            prev.map((item) =>
              item._id === localAssistantId
                ? {
                    ...item,
                    text: latestText,
                  }
                : item
            )
          );
        }
        return true;
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(formatApiError(err));
          setMessages((prev) => prev.filter((item) => item._id !== localAssistantId));
        }
        return false;
      } finally {
        abortRef.current = null;
        setSending(false);
      }
    },
    [currentUserId, loadMessages, npcId, npcName, sending, sessionId, user?.displayName]
  );

  const ensureCameraPermission = useCallback(async () => {
    let permission = await ImagePicker.getCameraPermissionsAsync();
    if (permission.granted) return true;
    if (!permission.canAskAgain) {
      Alert.alert(
        tr("无法访问相机", "Camera access denied"),
        tr("请在系统设置中允许相机访问后再试。", "Enable camera access in system settings and try again.")
      );
      return false;
    }
    permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.granted) return true;
    Alert.alert(
      tr("无法访问相机", "Camera access denied"),
      tr("请允许相机权限后继续。", "Please grant camera permission to continue.")
    );
    return false;
  }, [tr]);

  const ensureLibraryPermission = useCallback(async () => {
    let permission = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (permission.granted) return true;
    if (!permission.canAskAgain) {
      Alert.alert(
        tr("无法访问相册", "Media access denied"),
        tr("请在系统设置中允许相册访问后再试。", "Enable media-library access in system settings and try again.")
      );
      return false;
    }
    permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.granted) return true;
    Alert.alert(
      tr("无法访问相册", "Media access denied"),
      tr("请允许相册权限后继续。", "Please grant media-library permission to continue.")
    );
    return false;
  }, [tr]);

  const sendPickedMediaAsset = useCallback(
    async (asset: MediaPickerAsset) => {
      if (sending || mediaSending) return;
      setMediaSending(true);
      setError(null);
      try {
        const uploadResult = await uploadFileV2({
          ...(await normalizeMediaAssetForUpload(asset, 0)),
        });
        const uploadedUri = `${uploadResult.url || ""}`.trim();
        if (!uploadedUri) {
          throw new Error(tr("上传成功但未返回文件 URL。", "Upload succeeded but no file URL was returned."));
        }
        const uploadedName = (uploadResult.name || asset.filename || inferUploadFilename(asset, 0)).trim();
        const previewUri = (asset.thumbUri || asset.uri || "").trim();
        const localUserMessage: GiftedNPCMessage = {
          _id: `npc_media_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          text: asset.type === "video" ? `${tr("[视频]", "[Video]")} ${uploadedName}` : "",
          image: asset.type === "image" ? previewUri : undefined,
          createdAt: new Date(),
          user: {
            _id: currentUserId || "me",
            name: user?.displayName || "Me",
          },
          role: "user",
        };
        const prompt = [
          asset.type === "video"
            ? tr("用户发送了一段视频。", "The user sent a video.")
            : tr("用户发送了一张图片。", "The user sent an image."),
          `${tr("文件名", "File")}: ${uploadedName}`,
          `${tr("链接", "URL")}: ${uploadedUri}`,
          tr(
            "请结合这个附件继续对话。如果你无法直接读取媒体内容，要明确说明，并基于文件类型和当前上下文给出有帮助的下一步。",
            "Continue the conversation with this attachment in mind. If you cannot directly inspect the media, say so clearly and still provide a helpful next step based on the file type and current context."
          ),
        ].join("\n");
        await sendNPCTurn(prompt, {
          clearInput: false,
          localUserMessage,
        });
      } catch (err) {
        setError(formatApiError(err));
      } finally {
        setMediaSending(false);
      }
    },
    [currentUserId, formatApiError, mediaSending, sendNPCTurn, sending, tr, user?.displayName]
  );

  const openImagePicker = useCallback(async () => {
    if (!(await ensureLibraryPermission())) return;
    const picker = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.9,
      allowsEditing: false,
      allowsMultipleSelection: false,
    });
    if (picker.canceled || !picker.assets?.length) return;
    const asset = await toMediaPickerAsset(picker.assets[0], 0);
    if (!asset.uri) return;
    await sendPickedMediaAsset(asset);
  }, [ensureLibraryPermission, sendPickedMediaAsset]);

  const openCameraPicker = useCallback(async () => {
    if (!(await ensureCameraPermission())) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = await toMediaPickerAsset(result.assets[0], 0);
    if (!asset.uri) return;
    await sendPickedMediaAsset(asset);
  }, [ensureCameraPermission, sendPickedMediaAsset]);

  const openAttachActions = useCallback(() => {
    const actions = [
      { label: tr("选择图片或视频", "Choose image or video"), onPress: () => void openImagePicker() },
      { label: tr("拍照", "Camera"), onPress: () => void openCameraPicker() },
      { label: tr("取消", "Cancel"), style: "cancel" as const },
    ];
    openMessageActions(actions);
  }, [openCameraPicker, openImagePicker, openMessageActions, tr]);

  const handleSend = useCallback(
    async (outgoing: IMessage[] = []) => {
      const text = String(outgoing[0]?.text || input).trim();
      if (!text) return;
      await sendNPCTurn(text, { clearInput: true });
    },
    [input, sendNPCTurn]
  );

  const renderToolbarActions = useCallback(
    () => (
      <View style={styles.toolbarActionGroup}>
        <Pressable
          testID="chat-plus-button"
          style={[styles.inputIcon, (sending || mediaSending) && styles.inputIconDisabled]}
          disabled={sending || mediaSending}
          onPress={openAttachActions}
        >
          <Ionicons name="add" size={18} color="rgba(226,232,240,0.85)" />
        </Pressable>
      </View>
    ),
    [mediaSending, openAttachActions, sending]
  );

  const renderToolbarComposer = useCallback(
    (props: ComposerProps) => {
      const upstreamOnFocus = props?.textInputProps?.onFocus;
      const upstreamOnBlur = props?.textInputProps?.onBlur;
      const upstreamOnChangeText = props?.textInputProps?.onChangeText as ((value: string) => void) | undefined;
      return (
        <View style={[styles.inputBox, { maxHeight: chatComposerMaxHeight }]}>
          <Composer
            {...props}
            multiline
            textInputStyle={[styles.input, { maxHeight: chatComposerTextMaxHeight }]}
            placeholderTextColor="rgba(148,163,184,0.9)"
            textInputProps={{
              ...(props?.textInputProps || {}),
              testID: "chat-message-input",
              nativeID: "chat-message-input",
              accessibilityLabel: "chat-message-input",
              showSoftInputOnFocus: true,
              editable: !sending && !mediaSending,
              maxLength: 4000,
              multiline: true,
              scrollEnabled: true,
              onChangeText: (value: string) => {
                props.onTextChanged?.(value);
                upstreamOnChangeText?.(value);
                setInput(value);
              },
              onFocus: (event) => {
                upstreamOnFocus?.(event);
                setKeyboardTarget("chat");
              },
              onBlur: (event) => {
                upstreamOnBlur?.(event);
                setKeyboardTarget(null);
              },
            }}
          />
        </View>
      );
    },
    [chatComposerMaxHeight, chatComposerTextMaxHeight, mediaSending, sending, setKeyboardTarget]
  );

  const renderToolbarSend = useCallback(
    () => (
      <Pressable
        testID="chat-send-button"
        style={[styles.sendBtn, sendDisabled && styles.sendBtnIdle, sendDisabled && styles.sendBtnDisabled]}
        onPress={() => {
          void handleSend();
        }}
        disabled={sendDisabled}
      >
        <Ionicons
          name={sendDisabled ? "wifi" : "arrow-up"}
          size={18}
          color={sendDisabled ? "rgba(148,163,184,0.95)" : "rgba(248,250,252,0.96)"}
          style={sendDisabled ? { transform: [{ rotate: "90deg" }] } : undefined}
        />
      </Pressable>
    ),
    [handleSend, sendDisabled]
  );

  const renderChatInputToolbar = useCallback(
    (props: InputToolbarProps<IMessage>) => (
      <InputToolbar
        {...props}
        containerStyle={styles.toolbarContainer}
        primaryStyle={styles.toolbarPrimary}
        renderActions={renderToolbarActions}
        renderComposer={renderToolbarComposer}
        renderSend={renderToolbarSend}
      />
    ),
    [renderToolbarActions, renderToolbarComposer, renderToolbarSend]
  );

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
            <View style={styles.headerMain}>
              <Text style={styles.title} numberOfLines={1}>
                {npcName}
              </Text>
              <Text style={styles.subtitle}>{tr("NPC Chat", "NPC Chat")}</Text>
            </View>
            <Pressable
              style={styles.editBtn}
              onPress={() =>
                router.push({
                  pathname: "/npc-config/[npcId]" as never,
                  params: { npcId, entrySource: "chat" } as never,
                })
              }
            >
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          </View>

          {error ? (
            <StateBanner
              variant="error"
              title={tr("对话失败", "Chat failed")}
              message={error}
              actionLabel={tr("重试", "Retry")}
              onAction={() => void loadConversation()}
            />
          ) : null}

          {loading ? (
            <LoadingSkeleton kind="messages" />
          ) : (
            <View style={styles.chatWrap}>
              <GiftedChat
                messages={messages}
                onSend={(rows) => void handleSend(rows)}
                onLongPress={handleMessageLongPress}
                user={{
                  _id: currentUserId || "me",
                  name: user?.displayName || "Me",
                }}
                text={input}
                onInputTextChanged={setInput}
                alwaysShowSend
                placeholder={tr("输入消息...", "Type a message...")}
                renderChatEmpty={() => (
                  <View style={styles.emptyWrap}>
                    <View style={styles.emptyWrapFixed}>
                    <EmptyState
                      title={tr("还没有对话内容", "No messages yet")}
                      hint={tr("发一条消息开始和 NPC 对话", "Send a message to start chatting")}
                      icon="chatbubble-ellipses-outline"
                    />
                    </View>
                  </View>
                )}
                renderInputToolbar={renderChatInputToolbar}
                minInputToolbarHeight={CHAT_COMPOSER_MIN_HEIGHT}
                minComposerHeight={CHAT_COMPOSER_MIN_HEIGHT}
                maxComposerHeight={chatComposerMaxHeight}
                isKeyboardInternallyHandled={false}
                keyboardShouldPersistTaps="handled"
                messagesContainerStyle={styles.messageContainer}
                renderFooter={() => <View style={styles.messageListSpacer} />}
              />
            </View>
          )}
        </ContainerView>
        </KeyboardAvoidingView>
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
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  headerMain: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "900",
  },
  subtitle: {
    color: "rgba(148,163,184,0.92)",
    fontSize: 10,
    fontWeight: "700",
  },
  editBtn: {
    minHeight: 40,
    borderRadius: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  editText: {
    color: "rgba(226,232,240,0.95)",
    fontSize: 12,
    fontWeight: "900",
  },
  chatWrap: {
    flex: 1,
    marginTop: 4,
  },
  messageContainer: {
    flex: 1,
  },
  messageListSpacer: {
    height: 15,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  emptyWrapFixed: {
    transform: [{ scaleY: -1 }],
    width: "100%",
  },
  toolbarContainer: {
    borderTopWidth: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 0,
  },
  toolbarPrimary: {
    alignItems: "stretch",
    gap: 10,
    paddingTop: 0,
  },
  toolbarActionGroup: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  inputIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: "rgba(31,41,55,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  inputIconDisabled: {
    opacity: 0.45,
  },
  inputBox: {
    flex: 1,
    minHeight: CHAT_COMPOSER_MIN_HEIGHT,
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(44,44,46,0.94)",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  input: {
    color: "#f8fafc",
    fontSize: 15,
    lineHeight: 21,
    minHeight: CHAT_COMPOSER_MIN_HEIGHT - 12,
    paddingTop: 12,
    paddingBottom: 14,
    includeFontPadding: Platform.OS === "android",
    textAlignVertical: "top",
    margin: 0,
    maxHeight: CHAT_COMPOSER_MAX_HEIGHT - 12,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.62)",
    backgroundColor: "rgba(59,130,246,0.96)",
  },
  sendBtnIdle: {
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(31,41,55,0.95)",
  },
  sendBtnDisabled: {
    opacity: 1,
  },
});
