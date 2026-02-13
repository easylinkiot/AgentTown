import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { ChatThread } from "@/src/types";

interface ChatListItemProps {
  chat: ChatThread;
  onPress: () => void;
}

export function ChatListItem({ chat, onPress }: ChatListItemProps) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.avatarWrap}>
        <Image source={{ uri: chat.avatar }} style={styles.avatar} />
        {!!chat.unreadCount && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{chat.unreadCount}</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <View style={styles.rowTop}>
          <View style={styles.nameWrap}>
            {chat.isGroup ? (
              <Ionicons name="people" size={14} color="#64748b" />
            ) : null}
            <Text style={styles.name} numberOfLines={1}>
              {chat.name}
            </Text>
            {chat.isGroup && chat.memberCount ? (
              <Text style={styles.memberCount}>{chat.memberCount}</Text>
            ) : null}
          </View>
          <Text style={styles.time}>{chat.time}</Text>
        </View>
        <Text style={[styles.message, chat.highlight && styles.highlight]} numberOfLines={1}>
          {chat.highlight && chat.unreadCount ? `[${chat.unreadCount} notifications] ` : ""}
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
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#d1d5db",
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
  memberCount: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
  },
  time: {
    fontSize: 11,
    color: "#6b7280",
  },
  message: {
    fontSize: 12,
    color: "#4b5563",
  },
  highlight: {
    color: "#111827",
    fontWeight: "600",
  },
});
