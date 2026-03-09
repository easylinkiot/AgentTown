import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { AppLanguage } from "@/src/types";

let handlerConfigured = false;

function isMobile() {
  if (process.env.NODE_ENV === "test") return false;
  return Platform.OS === "ios" || Platform.OS === "android";
}

function hasNotificationRuntime() {
  return (
    typeof Notifications.getPermissionsAsync === "function" &&
    typeof Notifications.requestPermissionsAsync === "function" &&
    typeof Notifications.scheduleNotificationAsync === "function"
  );
}

function ensureHandlerConfigured() {
  if (!isMobile() || !hasNotificationRuntime() || handlerConfigured) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  handlerConfigured = true;
}

async function ensurePermission() {
  if (!isMobile() || !hasNotificationRuntime()) return false;
  ensureHandlerConfigured();
  const current = await Notifications.getPermissionsAsync();
  if (current?.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return Boolean(requested?.granted);
}

function mentionTitle(language: AppLanguage, threadName: string) {
  const safeName = threadName.trim() || (language === "zh" ? "群聊" : "Group chat");
  return language === "zh" ? `有人在 ${safeName} 提到了你` : `You were mentioned in ${safeName}`;
}

export async function notifyMentionReceived(threadName: string, preview: string, language: AppLanguage) {
  const granted = await ensurePermission();
  if (!granted || !hasNotificationRuntime()) return;
  const body = preview.trim() || (language === "zh" ? "打开查看新消息" : "Open to view the new message");
  await Notifications.scheduleNotificationAsync({
    content: {
      title: mentionTitle(language, threadName),
      body,
      sound: "default",
    },
    trigger: null,
  });
}
