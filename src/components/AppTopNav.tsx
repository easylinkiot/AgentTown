import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { tx } from "@/src/i18n/translate";
import { AppLanguage } from "@/src/types";

type NavKey = "home" | "tasks" | "agents" | "groups" | "miniapps";
type NavIcon =
  | "chatbubbles-outline"
  | "checkbox-outline"
  | "hardware-chip-outline"
  | "people-outline"
  | "apps-outline";

const ITEMS: Array<{
  key: NavKey;
  zh: string;
  en: string;
  icon: NavIcon;
  href: string;
}> = [
  { key: "home", zh: "聊天", en: "Chats", icon: "chatbubbles-outline", href: "/" },
  { key: "tasks", zh: "任务", en: "Tasks", icon: "checkbox-outline", href: "/tasks" },
  { key: "agents", zh: "Bot", en: "Bots", icon: "hardware-chip-outline", href: "/agents" },
  { key: "groups", zh: "群组", en: "Groups", icon: "people-outline", href: "/groups" },
  { key: "miniapps", zh: "MiniApp", en: "Mini Apps", icon: "apps-outline", href: "/miniapps" },
];

export function AppTopNav({
  current,
  language,
}: {
  current: NavKey;
  language: AppLanguage;
}) {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {ITEMS.map((item) => {
          const active = item.key === current;
          return (
            <Pressable
              key={item.key}
              style={[styles.item, active && styles.itemActive]}
              onPress={() => {
                if (!active) router.push(item.href as never);
              }}
            >
              <Ionicons name={item.icon} size={14} color={active ? "#e2e8f0" : "#94a3b8"} />
              <Text style={[styles.itemText, active && styles.itemTextActive]}>
                {tx(language, item.zh, item.en)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.2)",
    paddingBottom: 10,
    marginBottom: 12,
  },
  row: {
    gap: 8,
    paddingVertical: 4,
  },
  item: {
    minHeight: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.22)",
    backgroundColor: "rgba(15,23,42,0.5)",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemActive: {
    borderColor: "rgba(59,130,246,0.55)",
    backgroundColor: "rgba(30,64,175,0.35)",
  },
  itemText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "700",
  },
  itemTextActive: {
    color: "#e2e8f0",
  },
});
