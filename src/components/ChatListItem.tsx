import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { AppLanguage, ChatThread, UiTheme } from "@/src/types";

interface ChatListItemProps {
  chat: ChatThread;
  onPress: () => void;
  theme?: UiTheme;
  language?: AppLanguage;
}

export function ChatListItem({
  chat,
  onPress,
  theme = "classic",
  language = "zh",
}: ChatListItemProps) {
  const isNeo = theme === "neo";

  return (
    <Pressable style={[styles.container, isNeo && styles.containerNeo]} onPress={onPress}>
      <View style={styles.avatarWrap}>
        <Image source={{ uri: chat.avatar }} style={[styles.avatar, isNeo && styles.avatarNeo]} />
        {!!chat.unreadCount && (
          <View style={[styles.unreadBadge, isNeo && styles.unreadBadgeNeo]}>
            <Text style={styles.unreadText}>{chat.unreadCount}</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <View style={styles.rowTop}>
          <View style={styles.nameWrap}>
            {chat.isGroup ? (
              <Ionicons
                name="people"
                size={14}
                color={isNeo ? "rgba(226,232,240,0.75)" : "#64748b"}
              />
            ) : null}
            <Text style={[styles.name, isNeo && styles.nameNeo]} numberOfLines={1}>
              {chat.name}
            </Text>
            {chat.isGroup && chat.memberCount ? (
              <Text style={[styles.memberCount, isNeo && styles.memberCountNeo]}>
                {chat.memberCount}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.time, isNeo && styles.timeNeo]}>{chat.time}</Text>
        </View>
        <Text
          style={[
            styles.message,
            chat.highlight && styles.highlight,
            isNeo && styles.messageNeo,
            isNeo && chat.highlight && styles.highlightNeo,
          ]}
          numberOfLines={1}
        >
          {chat.highlight && chat.unreadCount
            ? language === "zh"
              ? `[${chat.unreadCount} 条通知] `
              : `[${chat.unreadCount} notifications] `
            : ""}
          {chat.message}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  containerNeo: {
    borderBottomColor: "rgba(255,255,255,0.05)",
    backgroundColor: "transparent",
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#d1d5db",
  },
  avatarNeo: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  unreadBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ef4444",
    borderWidth: 1,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  unreadBadgeNeo: {
    borderColor: "rgba(15,23,42,0.9)",
  },
  unreadText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },
  body: {
    flex: 1,
    gap: 4,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  nameWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    maxWidth: "84%",
  },
  nameNeo: {
    color: "#f8fafc",
  },
  memberCount: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
  },
  memberCountNeo: {
    color: "rgba(148,163,184,0.95)",
  },
  time: {
    fontSize: 11,
    color: "#6b7280",
  },
  timeNeo: {
    color: "rgba(148,163,184,0.78)",
  },
  message: {
    fontSize: 12,
    color: "#4b5563",
  },
  messageNeo: {
    color: "rgba(203,213,225,0.74)",
  },
  highlight: {
    color: "#111827",
    fontWeight: "600",
  },
  highlightNeo: {
    color: "#60a5fa",
    fontWeight: "700",
  },
});
