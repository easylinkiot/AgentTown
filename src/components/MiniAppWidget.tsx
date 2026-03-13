import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getMiniToolQuickActions } from "@/src/features/miniapps/parity-registry";
import { buildMiniAppViewModel } from "@/src/features/miniapps/model";
import { tx } from "@/src/i18n/translate";
import { AppLanguage, MiniApp, TaskItem } from "@/src/types";

type DeleteCandidate =
  | { id: string; kind: "quick_action"; name: string }
  | { id: string; kind: "app"; name: string };

type Props = {
  apps: MiniApp[];
  tasks: TaskItem[];
  language: AppLanguage;
  hiddenQuickActionIds: string[];
  onOpenApp: (app: MiniApp) => void;
  onOpenCreator: () => void;
  onQuickCreate: (type: string) => Promise<void> | void;
  onDeleteApp: (id: string) => Promise<void> | void;
  onHideQuickAction: (id: string) => Promise<void> | void;
  onMinimize?: () => void;
};

function ControlButton({
  icon,
  label,
  iconBg,
  active,
  onPress,
  onDelete,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  iconBg: string;
  active?: boolean;
  onPress: () => void;
  onDelete?: () => void;
}) {
  return (
    <View style={styles.controlWrap}>
      <Pressable style={[styles.controlButton, active ? styles.controlButtonActive : null]} onPress={onPress}>
        <View style={[styles.controlIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={12} color="#ffffff" />
        </View>
        <Text style={styles.controlLabel} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
      {onDelete ? (
        <Pressable style={styles.controlDelete} onPress={onDelete}>
          <Ionicons name="remove" size={12} color="#ef4444" />
        </Pressable>
      ) : null}
    </View>
  );
}

export function MiniAppWidget({
  apps,
  tasks,
  language,
  hiddenQuickActionIds,
  onOpenApp,
  onOpenCreator,
  onQuickCreate,
  onDeleteApp,
  onHideQuickAction,
  onMinimize,
}: Props) {
  const [showTasks, setShowTasks] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<DeleteCandidate | null>(null);
  const tr = (zh: string, en: string) => tx(language, zh, en);

  const installedApps = useMemo(
    () =>
      apps.map((app) => {
        const vm = buildMiniAppViewModel(app);
        return {
          app,
          icon: vm.icon as keyof typeof Ionicons.glyphMap,
          color: vm.color,
          label: app.name.slice(0, 5),
        };
      }),
    [apps]
  );

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    if (deleteCandidate.kind === "quick_action") {
      await onHideQuickAction(deleteCandidate.id);
      setDeleteCandidate(null);
      return;
    }
    await onDeleteApp(deleteCandidate.id);
    setDeleteCandidate(null);
  };

  return (
    <View style={styles.shell}>
      {deleteCandidate ? (
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteCard}>
            <View style={styles.deleteIconWrap}>
              <Ionicons name="warning-outline" size={24} color="#ef4444" />
            </View>
            <Text style={styles.deleteTitle}>{tr("移除项目？", "Remove Item?")}</Text>
            <Text style={styles.deleteText}>
              {tr("确认将该项目从首页 mini tool 中移除。", "Are you sure you want to remove this item from your dashboard?")}
            </Text>
            <View style={styles.deleteActions}>
              <Pressable style={styles.deleteCancel} onPress={() => setDeleteCandidate(null)}>
                <Text style={styles.deleteCancelText}>{tr("取消", "Cancel")}</Text>
              </Pressable>
              <Pressable style={styles.deleteConfirm} onPress={() => void confirmDelete()}>
                <Text style={styles.deleteConfirmText}>{tr("移除", "Remove")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.topRow}>
        <Pressable style={styles.createCard} onPress={onOpenCreator}>
          <View style={styles.createLeft}>
            <View style={styles.createIconWrap}>
              <Ionicons name="add" size={18} color="#111827" />
            </View>
            <View style={styles.createTextWrap}>
              <Text style={styles.createTitle}>Create Mini App</Text>
              <Text style={styles.createHint}>Describe to generate</Text>
            </View>
          </View>
          <View style={styles.createArrowWrap}>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </View>
        </Pressable>

        {onMinimize ? (
          <Pressable style={styles.minimizeBtn} onPress={onMinimize}>
            <Ionicons name="remove" size={24} color="#6b7280" />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controlsRow}>
        {getMiniToolQuickActions()
          .filter((item) => !hiddenQuickActionIds.includes(item.id))
          .map((item) => (
            <View key={item.id} style={styles.controlSlot}>
              <ControlButton
                icon={item.icon as keyof typeof Ionicons.glyphMap}
                label={item.label}
                iconBg={item.actionType === "toggle_tasks" ? (showTasks ? "#22c55e" : "rgba(255,255,255,0.92)") : item.accentColor}
                active={item.actionType === "toggle_tasks" && showTasks}
                onPress={() => {
                  if (item.actionType === "toggle_tasks") {
                    setShowTasks((prev) => !prev);
                    return;
                  }
                  void onQuickCreate(item.param);
                }}
                onDelete={() => setDeleteCandidate({ id: item.id, kind: "quick_action", name: item.label })}
              />
            </View>
          ))}

        {installedApps.map((item) => (
          <View key={item.app.id} style={styles.controlSlot}>
            <ControlButton
              icon={item.icon}
              label={item.label}
              iconBg={item.color}
              onPress={() => onOpenApp(item.app)}
              onDelete={() => setDeleteCandidate({ id: item.app.id, kind: "app", name: item.app.name })}
            />
          </View>
        ))}
      </ScrollView>

      {showTasks ? (
        <View style={styles.tasksWrap}>
          <View style={styles.tasksHeader}>
            <Text style={styles.tasksTitle}>ACTIVE TASKS</Text>
            <View style={styles.tasksCount}>
              <Text style={styles.tasksCountText}>{tasks.length}</Text>
            </View>
          </View>

          {tasks.length > 0 ? (
            tasks.slice(0, 3).map((task, index) => (
              <View key={task.id || `task_${index}`} style={styles.taskRow}>
                <View
                  style={[
                    styles.taskPriorityDot,
                    task.priority === "High" ? styles.taskPriorityHigh : styles.taskPriorityDefault,
                  ]}
                />
                <View style={styles.taskBody}>
                  <Text style={styles.taskTitle} numberOfLines={1}>
                    {task.title}
                  </Text>
                  <View style={styles.taskMeta}>
                    <Ionicons name="time-outline" size={8} color="#6b7280" />
                    <Text style={styles.taskMetaText}>Today</Text>
                  </View>
                </View>
                <View style={styles.taskCheckbox} />
              </View>
            ))
          ) : (
            <View style={styles.emptyTaskWrap}>
              <Text style={styles.emptyTaskText}>No active tasks</Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "rgba(249,250,251,0.92)",
    padding: 16,
    gap: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
    position: "relative",
  },
  deleteOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.20)",
    borderRadius: 32,
    paddingHorizontal: 20,
  },
  deleteCard: {
    width: "85%",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  deleteIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(239,68,68,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800",
  },
  deleteText: {
    color: "#6b7280",
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  deleteActions: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  deleteCancel: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.75)",
    paddingVertical: 10,
    alignItems: "center",
  },
  deleteCancelText: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "700",
  },
  deleteConfirm: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#ef4444",
    paddingVertical: 10,
    alignItems: "center",
  },
  deleteConfirmText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  createCard: {
    flex: 1,
    minHeight: 64,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "rgba(255,255,255,0.72)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  createLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  createIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  createTextWrap: {
    gap: 2,
  },
  createTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800",
  },
  createHint: {
    color: "rgba(17,24,39,0.50)",
    fontSize: 10,
    fontWeight: "600",
  },
  createArrowWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.76)",
    alignItems: "center",
    justifyContent: "center",
  },
  minimizeBtn: {
    width: 64,
    height: 64,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "rgba(255,255,255,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlsRow: {
    gap: 10,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  controlSlot: {
    width: 76,
  },
  controlWrap: {
    width: "100%",
    height: 64,
    position: "relative",
  },
  controlButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "rgba(255,255,255,0.66)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 6,
  },
  controlButtonActive: {
    backgroundColor: "rgba(255,255,255,0.80)",
  },
  controlIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  controlLabel: {
    color: "rgba(17,24,39,0.90)",
    fontSize: 10,
    fontWeight: "500",
  },
  controlDelete: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#9ca3af",
    alignItems: "center",
    justifyContent: "center",
  },
  tasksWrap: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#e5e7eb",
    padding: 8,
    gap: 8,
  },
  tasksHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  tasksTitle: {
    color: "rgba(17,24,39,0.60)",
    fontSize: 10,
    fontWeight: "800",
  },
  tasksCount: {
    minWidth: 24,
    height: 18,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.72)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  tasksCountText: {
    color: "rgba(17,24,39,0.60)",
    fontSize: 9,
    fontWeight: "800",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "rgba(255,255,255,0.66)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  taskPriorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  taskPriorityHigh: {
    backgroundColor: "#ef4444",
  },
  taskPriorityDefault: {
    backgroundColor: "#3b82f6",
  },
  taskBody: {
    flex: 1,
    gap: 2,
  },
  taskTitle: {
    color: "#374151",
    fontSize: 11,
    fontWeight: "600",
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  taskMetaText: {
    color: "#6b7280",
    fontSize: 9,
  },
  taskCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#9ca3af",
  },
  emptyTaskWrap: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTaskText: {
    color: "rgba(17,24,39,0.30)",
    fontSize: 10,
  },
});
