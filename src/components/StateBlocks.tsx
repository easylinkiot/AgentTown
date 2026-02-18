import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function StateBanner({
  variant = "error",
  title,
  message,
  actionLabel,
  onAction,
}: {
  variant?: "error" | "info";
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const isError = variant === "error";

  return (
    <View style={[styles.banner, isError ? styles.bannerError : styles.bannerInfo]}>
      <View style={styles.bannerIcon}>
        <Ionicons
          name={isError ? "alert-circle-outline" : "information-circle-outline"}
          size={14}
          color={isError ? "#fecaca" : "#bfdbfe"}
        />
      </View>
      <View style={styles.bannerBody}>
        <Text style={styles.bannerTitle}>{title}</Text>
        {message ? <Text style={styles.bannerMessage}>{message}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable style={styles.bannerAction} onPress={onAction}>
          <Text style={styles.bannerActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({
  title,
  hint,
  icon = "chatbubbles-outline",
}: {
  title: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={18} color="rgba(226,232,240,0.85)" />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

export function LoadingSkeleton({ kind = "chat_list" }: { kind?: "chat_list" | "messages" | "cards" }) {
  if (kind === "messages") {
    return (
      <View style={styles.skelWrap}>
        {Array.from({ length: 7 }).map((_, idx) => {
          const me = idx % 3 === 2;
          return (
            <View key={idx} style={[styles.skelMsgRow, me && styles.skelMsgRowMe]}>
              <View style={[styles.skelBubble, me ? styles.skelBubbleMe : styles.skelBubbleOther]} />
            </View>
          );
        })}
      </View>
    );
  }

  const rows = kind === "cards" ? 3 : 5;
  return (
    <View style={styles.skelWrap}>
      {Array.from({ length: rows }).map((_, idx) => (
        <View key={idx} style={styles.skelRow}>
          <View style={styles.skelAvatar} />
          <View style={styles.skelCol}>
            <View style={[styles.skelLine, { width: "56%" }]} />
            <View style={[styles.skelLine, { width: "82%" }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bannerError: {
    borderColor: "rgba(239,68,68,0.25)",
    backgroundColor: "rgba(127,29,29,0.25)",
  },
  bannerInfo: {
    borderColor: "rgba(59,130,246,0.22)",
    backgroundColor: "rgba(30,64,175,0.18)",
  },
  bannerIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  bannerBody: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "800",
  },
  bannerMessage: {
    color: "rgba(226,232,240,0.72)",
    fontSize: 12,
    lineHeight: 16,
  },
  bannerAction: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  bannerActionText: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "800",
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  emptyTitle: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyHint: {
    color: "rgba(148,163,184,0.92)",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    paddingHorizontal: 18,
  },
  skelWrap: {
    paddingTop: 4,
    gap: 12,
  },
  skelRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  skelAvatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  skelCol: {
    flex: 1,
    gap: 8,
  },
  skelLine: {
    height: 10,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  skelMsgRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 10,
  },
  skelMsgRowMe: {
    justifyContent: "flex-end",
  },
  skelBubble: {
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  skelBubbleOther: {
    width: "74%",
  },
  skelBubbleMe: {
    width: "62%",
    backgroundColor: "rgba(37,99,235,0.16)",
    borderColor: "rgba(59,130,246,0.22)",
  },
});

