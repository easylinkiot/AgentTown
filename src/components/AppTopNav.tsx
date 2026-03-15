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

const ITEMS: {
  key: NavKey;
  zh: string;
  en: string;
  icon: NavIcon;
  href: string;
}[] = [
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
              testID={`top-nav-item-${item.key}`}
              style={[styles.item, active && styles.itemActive]}
              onPress={() => {
                if (!active) router.push(item.href as never);
              }}
            >
              <Ionicons
                name={item.icon}
                size={14}
                color={active ? "rgba(15,23,42,0.94)" : "rgba(203,213,225,0.82)"}
              />
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
    marginBottom: 12,
    paddingVertical: 2,
  },
  row: {
    alignItems: "center",
    gap: 8,
    paddingRight: 4,
  },
  item: {
    minHeight: 38,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemActive: {
    borderColor: "rgba(255,255,255,0.52)",
    backgroundColor: "rgba(242,244,248,0.92)",
    shadowColor: "#000000",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  itemText: {
    fontSize: 12,
    color: "rgba(203,213,225,0.82)",
    fontWeight: "800",
  },
  itemTextActive: {
    color: "rgba(15,23,42,0.94)",
  },
});
