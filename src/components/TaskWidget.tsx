import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { tx } from "@/src/i18n/translate";
import { AppLanguage, TaskItem, UiTheme } from "@/src/types";

export function TaskWidget({
  tasks,
  containerStyle,
  theme = "classic",
  language = "en",
}: {
  tasks: TaskItem[];
  containerStyle?: StyleProp<ViewStyle>;
  theme?: UiTheme;
  language?: AppLanguage;
}) {
  const [expanded, setExpanded] = useState(true);
  const isNeo = theme === "neo";
  const tr = (zh: string, en: string) => tx(language, zh, en);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <View
        style={[
          styles.card,
          !expanded && styles.cardCollapsed,
          isNeo && styles.cardNeo,
        ]}
      >
        <Pressable
          style={[styles.header, isNeo && styles.headerNeo]}
          onPress={() => setExpanded((v) => !v)}
        >
          <View style={styles.headerLeft}>
            <Ionicons
              name="checkmark-done"
              size={14}
              color={isNeo ? "#22c55e" : "#166534"}
            />
            <Text style={[styles.headerTitle, isNeo && styles.headerTitleNeo]}>
              {tr("我的任务", "My Tasks")}
            </Text>
            {!expanded && tasks.length > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{tasks.length}</Text>
              </View>
            ) : null}
          </View>
          <Ionicons
            name={expanded ? "chevron-down" : "chevron-up"}
            size={14}
            color={isNeo ? "rgba(226,232,240,0.8)" : "#6b7280"}
          />
        </Pressable>

        {expanded ? (
          <View style={styles.list}>
            {tasks.length === 0 ? (
              <Text style={[styles.emptyText, isNeo && styles.emptyTextNeo]}>
                {tr("暂无任务", "No tasks")}
              </Text>
            ) : (
              tasks.slice(0, 5).map((task) => (
                <View key={task.id ?? task.title} style={[styles.item, isNeo && styles.itemNeo]}>
                  <Text style={[styles.taskTitle, isNeo && styles.taskTitleNeo]} numberOfLines={2}>
                    {task.title}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaText, isNeo && styles.metaTextNeo]}>{task.assignee}</Text>
                    <View style={[styles.priorityPill, isNeo && styles.priorityPillNeo]}>
                      <Text style={[styles.priorityText, isNeo && styles.priorityTextNeo]}>
                        {language === "zh"
                          ? { High: "高", Medium: "中", Low: "低" }[task.priority]
                          : task.priority}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    right: 12,
    bottom: 24,
    zIndex: 12,
  },
  card: {
    width: 170,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    overflow: "hidden",
  },
  cardNeo: {
    backgroundColor: "rgba(17,24,39,0.82)",
    borderColor: "rgba(255,255,255,0.16)",
  },
  cardCollapsed: {
    width: 90,
  },
  header: {
    minHeight: 34,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(243,244,246,0.9)",
  },
  headerNeo: {
    backgroundColor: "rgba(2,6,23,0.4)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#111827",
  },
  headerTitleNeo: {
    color: "#f8fafc",
  },
  badge: {
    minWidth: 14,
    height: 14,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
  },
  list: {
    maxHeight: 160,
    padding: 6,
    gap: 6,
  },
  emptyText: {
    fontSize: 11,
    color: "#6b7280",
    textAlign: "center",
    paddingVertical: 8,
  },
  emptyTextNeo: {
    color: "rgba(203,213,225,0.8)",
  },
  item: {
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderRadius: 10,
    padding: 6,
    gap: 6,
    backgroundColor: "white",
  },
  itemNeo: {
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  taskTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
  },
  taskTitleNeo: {
    color: "#f8fafc",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaText: {
    fontSize: 9,
    color: "#6b7280",
  },
  metaTextNeo: {
    color: "rgba(148,163,184,0.95)",
  },
  priorityPill: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#fee2e2",
  },
  priorityPillNeo: {
    backgroundColor: "rgba(239,68,68,0.2)",
  },
  priorityText: {
    fontSize: 8,
    color: "#b91c1c",
    fontWeight: "700",
  },
  priorityTextNeo: {
    color: "#fecaca",
  },
});
