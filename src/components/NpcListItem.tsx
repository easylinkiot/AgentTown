import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { NPC } from "@/src/types";

interface NpcListItemProps {
  npc: NPC;
  onPress: () => void;
}

export function NpcListItem({ npc, onPress }: NpcListItemProps) {
  const prompt = (npc.systemPrompt || "").trim();

  return (
    <Pressable testID={`npc-list-item-${npc.id}`} style={styles.container} onPress={onPress}>
      <View style={styles.avatarWrap}>
        {npc.avatarUrl ? (
          <Image source={{ uri: npc.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Ionicons name="sparkles-outline" size={18} color="rgba(226,232,240,0.92)" />
          </View>
        )}
        <View style={styles.avatarRoleBadge}>
          <Ionicons name="sparkles" size={10} color="rgba(248,250,252,0.96)" />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {npc.name}
        </Text>
        <Text style={styles.prompt} numberOfLines={1}>
          {prompt || "No system prompt"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="rgba(226,232,240,0.62)" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(44,44,46,0.74)",
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148,163,184,0.45)",
  },
  avatarRoleBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,118,110,0.96)",
    borderWidth: 1,
    borderColor: "rgba(167,243,208,0.78)",
  },
  body: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: "rgba(248,250,252,0.96)",
    fontSize: 13,
    fontWeight: "700",
  },
  prompt: {
    color: "rgba(203,213,225,0.74)",
    fontSize: 11,
  },
});
