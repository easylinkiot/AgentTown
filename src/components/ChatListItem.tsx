import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { DEFAULT_MYBOT_AVATAR } from "@/src/constants/chat";
import { formatConversationDisplayTime } from "@/src/features/chat/chat-helpers";
import { AppLanguage, ChatThread, UiTheme } from "@/src/types";

interface ChatListItemProps {
  chat: ChatThread;
  onPress: () => void;
  onAvatarPress?: (chat: ChatThread) => void;
  theme?: UiTheme;
  language?: AppLanguage;
}

function isBotLikeName(name: string) {
  const safe = (name || "").trim();
  if (!safe) return false;
  return /\bbot\b/i.test(safe) || safe.includes("助理");
}

function inferAvatarTag(chat: ChatThread): "Human" | "NPC" | "Bot" {
  const id = (chat.id || "").trim().toLowerCase();
  const tag = (chat.tag || "").trim().toLowerCase();
  if (id === "mybot" || id.startsWith("agent_userbot_")) return "Bot";
  if (isBotLikeName(chat.name)) return "Bot";
  if (id.startsWith("agent_") || tag === "npc" || tag === "agent") return "NPC";
  return "Human";
}

function resolveAvatarUri(chat: ChatThread) {
  const avatar = (chat.avatar || "").trim();
  if (avatar) return avatar;
  const id = (chat.id || "").trim().toLowerCase();
  const name = (chat.name || "").trim().toLowerCase();
  if (id === "mybot" || id === "agent_mybot" || id.startsWith("agent_userbot_") || name === "mybot") {
    return DEFAULT_MYBOT_AVATAR;
  }
  return "";
}

export function ChatListItem({
  chat,
  onPress,
  onAvatarPress,
  theme = "classic",
  language = "en",
}: ChatListItemProps) {
  const isNeo = theme === "neo";
  const avatarTag = inferAvatarTag(chat);
  const avatarUri = resolveAvatarUri(chat);
  const preview = chat.isVoiceCall
    ? language === "zh"
      ? "[语音通话]"
      : "[Voice Call]"
    : chat.message;
  const displayTime = formatConversationDisplayTime(chat.time || "");

  return (
    <Pressable
      testID={`chat-list-item-${chat.id}`}
      style={[styles.container, isNeo && styles.containerNeo]}
      onPress={onPress}
    >
      {onAvatarPress ? (
        <Pressable
          style={styles.avatarWrap}
          onPress={(e) => {
            e.stopPropagation?.();
            onAvatarPress(chat);
          }}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={[styles.avatar, isNeo && styles.avatarNeo]} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, isNeo && styles.avatarNeo]}>
              <Ionicons name="person-outline" size={18} color="rgba(226,232,240,0.82)" />
            </View>
          )}
          <View
            style={[
              styles.avatarRoleBadge,
              avatarTag === "NPC"
                ? styles.avatarRoleBadgeNpc
                : avatarTag === "Bot"
                  ? styles.avatarRoleBadgeBot
                  : styles.avatarRoleBadgeHuman,
            ]}
          >
            <Ionicons
              name={avatarTag === "NPC" ? "sparkles" : avatarTag === "Bot" ? "hardware-chip" : "person"}
              size={10}
              color={avatarTag === "Human" ? "rgba(12,18,32,0.95)" : "rgba(248,250,252,0.96)"}
            />
          </View>
          {!!chat.unreadCount && (
            <View testID={`chat-list-item-unread-${chat.id}`} style={[styles.unreadBadge, isNeo && styles.unreadBadgeNeo]}>
              <Text style={styles.unreadText}>{chat.unreadCount}</Text>
            </View>
          )}
        </Pressable>
      ) : (
        <View style={styles.avatarWrap}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={[styles.avatar, isNeo && styles.avatarNeo]} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, isNeo && styles.avatarNeo]}>
              <Ionicons name="person-outline" size={18} color="rgba(226,232,240,0.82)" />
            </View>
          )}
          <View
            style={[
              styles.avatarRoleBadge,
              avatarTag === "NPC"
                ? styles.avatarRoleBadgeNpc
                : avatarTag === "Bot"
                  ? styles.avatarRoleBadgeBot
                  : styles.avatarRoleBadgeHuman,
            ]}
          >
            <Ionicons
              name={avatarTag === "NPC" ? "sparkles" : avatarTag === "Bot" ? "hardware-chip" : "person"}
              size={10}
              color={avatarTag === "Human" ? "rgba(12,18,32,0.95)" : "rgba(248,250,252,0.96)"}
            />
          </View>
          {!!chat.unreadCount && (
            <View testID={`chat-list-item-unread-${chat.id}`} style={[styles.unreadBadge, isNeo && styles.unreadBadgeNeo]}>
              <Text style={styles.unreadText}>{chat.unreadCount}</Text>
            </View>
          )}
        </View>
      )}
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
          <View style={styles.metaWrap}>
            <Text style={[styles.time, isNeo && styles.timeNeo]}>{displayTime}</Text>
            {isNeo ? <Ionicons name="chevron-forward" size={12} color="rgba(148,163,184,0.52)" /> : null}
          </View>
        </View>
        <Text
          testID={`chat-list-item-preview-${chat.id}`}
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
          {preview}
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
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  containerNeo: {
    borderBottomWidth: 0,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(11,15,28,0.72)",
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  avatarWrap: {
    position: "relative",
  },
  avatarRoleBadge: {
    position: "absolute",
    width: 15,
    height: 15,
    borderRadius: 7.5,
    right: -1,
    bottom: -1,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  avatarRoleBadgeHuman: {
    backgroundColor: "rgba(226,232,240,0.95)",
    borderColor: "rgba(191,219,254,0.78)",
  },
  avatarRoleBadgeBot: {
    backgroundColor: "rgba(37,99,235,0.96)",
    borderColor: "rgba(191,219,254,0.78)",
  },
  avatarRoleBadgeNpc: {
    backgroundColor: "rgba(15,118,110,0.96)",
    borderColor: "rgba(167,243,208,0.78)",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#d1d5db",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148,163,184,0.45)",
  },
  avatarNeo: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  unreadBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ef4444",
    borderWidth: 1,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  unreadBadgeNeo: {
    borderColor: "rgba(28,28,30,0.9)",
  },
  unreadText: {
    color: "white",
    fontSize: 9,
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
  metaWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  name: {
    fontSize: 14,
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
    fontSize: 10,
    color: "#6b7280",
    fontWeight: "600",
  },
  timeNeo: {
    color: "rgba(148,163,184,0.72)",
  },
  message: {
    fontSize: 12,
    color: "#4b5563",
  },
  messageNeo: {
    color: "rgba(203,213,225,0.8)",
  },
  highlight: {
    color: "#111827",
    fontWeight: "600",
  },
  highlightNeo: {
    color: "rgba(241,245,249,0.96)",
    fontWeight: "700",
  },
});
