import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { TaskItem } from "@/src/types";

export function TaskWidget({ tasks }: { tasks: TaskItem[] }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.card, !expanded && styles.cardCollapsed]}>
        <Pressable style={styles.header} onPress={() => setExpanded((v) => !v)}>
          <View style={styles.headerLeft}>
            <Ionicons name="checkmark-done" size={14} color="#166534" />
            <Text style={styles.headerTitle}>My Tasks</Text>
            {!expanded && tasks.length > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{tasks.length}</Text>
              </View>
            ) : null}
          </View>
          <Ionicons
            name={expanded ? "chevron-down" : "chevron-up"}
            size={14}
            color="#6b7280"
          />
        </Pressable>

        {expanded ? (
          <View style={styles.list}>
            {tasks.length === 0 ? (
              <Text style={styles.emptyText}>No tasks</Text>
            ) : (
              tasks.slice(0, 5).map((task) => (
                <View key={task.id ?? task.title} style={styles.item}>
                  <Text style={styles.taskTitle} numberOfLines={2}>
                    {task.title}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{task.assignee}</Text>
                    <View style={styles.priorityPill}>
                      <Text style={styles.priorityText}>{task.priority}</Text>
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
    top: 220,
    zIndex: 20,
  },
  card: {
    width: 170,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    overflow: "hidden",
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
  item: {
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderRadius: 10,
    padding: 6,
    gap: 6,
    backgroundColor: "white",
  },
  taskTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
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
  priorityPill: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#fee2e2",
  },
  priorityText: {
    fontSize: 8,
    color: "#b91c1c",
    fontWeight: "700",
  },
});
