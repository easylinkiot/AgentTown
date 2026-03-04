import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { KeyframeBackground } from "@/src/components/KeyframeBackground";
import { EmptyState, LoadingSkeleton, StateBanner } from "@/src/components/StateBlocks";
import { APP_SAFE_AREA_EDGES } from "@/src/constants/safe-area";
import { tx } from "@/src/i18n/translate";
import { formatApiError, getAuthToken } from "@/src/lib/api";
import { getApiBaseUrl } from "@/src/services/chatAssist";
import { useAgentTown } from "@/src/state/agenttown-context";
import { TaskItem, TaskPriority, TaskStatus } from "@/src/types";

const TASKS_ENDPOINT = `${getApiBaseUrl()}/v1/tasks`;
const PAGE_SIZE = 20;
const TASK_OWNER_DEBUG_ENABLED = process.env.EXPO_PUBLIC_TASK_OWNER_DEBUG === "1";
const LOCAL_TASKS_ENDPOINT = "http://127.0.0.1:8080/v1/tasks";

function normalizeEndpoint(url: string) {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

const IS_LOCAL_TASKS_ENDPOINT = normalizeEndpoint(TASKS_ENDPOINT) === normalizeEndpoint(LOCAL_TASKS_ENDPOINT);

type LoadMode = "initial" | "refresh" | "append";

type TaskListEnvelope = {
  list?: unknown;
  items?: unknown;
  tasks?: unknown;
  data?: unknown;
  nextCursor?: unknown;
  next_cursor?: unknown;
  hasMore?: unknown;
  has_more?: unknown;
  pagination?: {
    nextCursor?: unknown;
    next_cursor?: unknown;
    hasMore?: unknown;
    has_more?: unknown;
  };
};

type TaskPageResult = {
  items: TaskItem[];
  nextCursor: string;
  rawCount: number;
  hasMore?: boolean;
  debugRows: {
    id: string;
    ownerId: string;
    owner: string;
    assignee: string;
    sourceThreadId: string;
  }[];
};

type TaskQueryScope = {
  threadId: string;
  sourceSessionId: string;
  targetType: string;
  targetId: string;
  chatUserId: string;
};

function toText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function toRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return toText(value[0]);
  return toText(value);
}

function toBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function normalizePriority(value: unknown): TaskPriority {
  const raw = toText(value).toLowerCase();
  if (!raw) return "Medium";
  if (raw.includes("high") || raw.includes("urgent") || raw.includes("p0") || raw.includes("p1")) return "High";
  if (raw.includes("low") || raw.includes("p3") || raw.includes("p4")) return "Low";
  return "Medium";
}

function normalizeStatus(value: unknown): TaskStatus {
  const raw = toText(value).toLowerCase();
  if (!raw) return "Pending";
  if (raw === "done" || raw === "completed" || raw === "complete") return "Done";
  if (raw.includes("progress") || raw === "doing") return "In Progress";
  return "Pending";
}

function normalizeTask(row: unknown, index: number): TaskItem | null {
  if (!row || typeof row !== "object") return null;
  const item = row as Record<string, unknown>;
  const title = toText(item.title) || `Task ${index + 1}`;
  const assignee = toText(item.assignee) || toText(item.owner) || "Unassigned";
  const id = toText(item.id);

  return {
    id: id || undefined,
    title,
    assignee,
    priority: normalizePriority(item.priority),
    status: normalizeStatus(item.status),
    dueAt: toText(item.dueAt) || toText(item.due_at) || undefined,
    sourceThreadId:
      toText(item.sourceThreadId) ||
      toText(item.source_thread_id) ||
      toText(item.targetId) ||
      toText(item.target_id) ||
      undefined,
    sourceMessageId: toText(item.sourceMessageId) || toText(item.source_message_id) || undefined,
    owner: toText(item.owner) || assignee,
  };
}

function parseTaskPage(payload: unknown): { rows: unknown[]; nextCursor: string; hasMore?: boolean } {
  if (Array.isArray(payload)) {
    return { rows: payload, nextCursor: "", hasMore: undefined };
  }
  if (!payload || typeof payload !== "object") {
    return { rows: [], nextCursor: "", hasMore: false };
  }

  const envelope = payload as TaskListEnvelope;
  const rows =
    (Array.isArray(envelope.list) && envelope.list) ||
    (Array.isArray(envelope.items) && envelope.items) ||
    (Array.isArray(envelope.tasks) && envelope.tasks) ||
    (Array.isArray(envelope.data) && envelope.data) ||
    [];

  const nestedPagination = envelope.pagination && typeof envelope.pagination === "object"
    ? envelope.pagination
    : undefined;
  const nextCursor =
    toText(envelope.nextCursor) ||
    toText(envelope.next_cursor) ||
    toText(nestedPagination?.nextCursor) ||
    toText(nestedPagination?.next_cursor);
  const hasMore =
    toBoolean(envelope.hasMore) ??
    toBoolean(envelope.has_more) ??
    toBoolean(nestedPagination?.hasMore) ??
    toBoolean(nestedPagination?.has_more);

  return { rows, nextCursor, hasMore };
}

function debugTaskOwnerRow(row: unknown) {
  if (!row || typeof row !== "object") {
    return {
      id: "",
      ownerId: "",
      owner: "",
      assignee: "",
      sourceThreadId: "",
    };
  }
  const item = row as Record<string, unknown>;
  return {
    id: toText(item.id),
    ownerId:
      toText(item.ownerId) ||
      toText(item.owner_id) ||
      toText(item.ownerUserId) ||
      toText(item.owner_user_id) ||
      toText(item.userId) ||
      toText(item.user_id),
    owner: toText(item.owner),
    assignee: toText(item.assignee),
    sourceThreadId:
      toText(item.sourceThreadId) ||
      toText(item.source_thread_id) ||
      toText(item.targetId) ||
      toText(item.target_id),
  };
}

function mergeTaskPages(previous: TaskItem[], incoming: TaskItem[]) {
  if (previous.length === 0) return incoming;
  if (incoming.length === 0) return previous;
  const seen = new Set<string>();
  const merged: TaskItem[] = [];
  for (const item of previous) {
    const key = item.id || `${item.title}-${item.assignee}-${item.dueAt || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  for (const item of incoming) {
    const key = item.id || `${item.title}-${item.assignee}-${item.dueAt || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

async function requestTaskPage(
  page: number,
  cursor: string,
  scope: TaskQueryScope
): Promise<TaskPageResult> {
  const query = new URLSearchParams();
  query.set("limit", String(PAGE_SIZE));
  query.set("page", String(page));

  if (!IS_LOCAL_TASKS_ENDPOINT) {
    query.set("offset", String((page - 1) * PAGE_SIZE));
    if (cursor) query.set("cursor", cursor);
    const hasChatUserFilter = scope.chatUserId !== "";
    const hasTargetFilter = scope.targetType !== "" && scope.targetId !== "";
    if (hasChatUserFilter) {
      // 1v1 chats: backend alias filter to avoid over-constraining query intersection.
      query.set("chatUserId", scope.chatUserId);
    } else if (hasTargetFilter) {
      query.set("targetType", scope.targetType);
      query.set("targetId", scope.targetId);
    } else {
      if (scope.sourceSessionId) query.set("sourceSessionId", scope.sourceSessionId);
      if (scope.threadId) query.set("threadId", scope.threadId);
    }
  }

  const token = getAuthToken();
  const response = await fetch(`${TASKS_ENDPOINT}?${query.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const text = (await response.text()).trim();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const parsed = parseTaskPage(payload);
  const debugRows = parsed.rows.map((row) => debugTaskOwnerRow(row));
  const items = parsed.rows
    .map((row, index) => normalizeTask(row, index))
    .filter((item): item is TaskItem => Boolean(item));
  return {
    items,
    nextCursor: parsed.nextCursor,
    rawCount: parsed.rows.length,
    hasMore: parsed.hasMore,
    debugRows,
  };
}

async function requestCompleteTask(taskId: string) {
  const token = getAuthToken();
  const response = await fetch(`${TASKS_ENDPOINT}/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ status: "Done" }),
  });

  if (!response.ok) {
    const text = (await response.text()).trim();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) return null;
  const payload = await response.json().catch(() => null);
  return normalizeTask(payload, 0);
}

function isTaskDone(status: TaskStatus) {
  return status === "Done";
}

export default function ChatTasksScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    threadId?: string | string[];
    threadName?: string | string[];
    sourceSessionId?: string | string[];
    targetType?: string | string[];
    targetId?: string | string[];
    chatUserId?: string | string[];
  }>();
  const { language } = useAgentTown();
  const tr = useCallback((zh: string, en: string) => tx(language, zh, en), [language]);
  const currentThreadId = useMemo(() => toRouteParam(params.threadId), [params.threadId]);
  const currentThreadName = useMemo(() => toRouteParam(params.threadName), [params.threadName]);
  const currentSourceSessionId = useMemo(
    () => toRouteParam(params.sourceSessionId) || currentThreadId,
    [currentThreadId, params.sourceSessionId]
  );
  const currentTargetType = useMemo(() => toRouteParam(params.targetType).toLowerCase(), [params.targetType]);
  const currentTargetId = useMemo(() => toRouteParam(params.targetId), [params.targetId]);
  const currentChatUserId = useMemo(() => toRouteParam(params.chatUserId), [params.chatUserId]);
  const effectiveTargetId = useMemo(() => {
    if (currentTargetType === "user" && currentChatUserId) return currentChatUserId;
    return currentTargetId;
  }, [currentChatUserId, currentTargetId, currentTargetType]);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [completingTaskId, setCompletingTaskId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const pageRef = useRef(0);
  const cursorRef = useRef("");
  const hasMoreRef = useRef(true);
  const inFlightRef = useRef<LoadMode | null>(null);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const loadTasks = useCallback(async (mode: LoadMode) => {
    if (inFlightRef.current) return;
    if (mode === "append" && !hasMoreRef.current) return;

    inFlightRef.current = mode;
    if (mode === "initial") {
      setLoadingInitial(true);
    } else if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const requestPage = mode === "append" ? pageRef.current + 1 : 1;
      const requestCursor = mode === "append" ? cursorRef.current : "";
      const scope: TaskQueryScope = {
        threadId: currentThreadId,
        sourceSessionId: currentSourceSessionId,
        targetType: currentTargetType,
        targetId: effectiveTargetId,
        chatUserId: currentChatUserId,
      };
      const pageResult = await requestTaskPage(requestPage, requestCursor, scope);
      const pageHasMore =
        typeof pageResult.hasMore === "boolean"
          ? pageResult.hasMore
          : Boolean(pageResult.nextCursor) || pageResult.rawCount >= PAGE_SIZE;

      if (__DEV__ && TASK_OWNER_DEBUG_ENABLED) {
        console.log("[TaskOwnerDebug] /v1/tasks", {
          mode,
          page: requestPage,
          cursor: requestCursor,
          query: scope,
          rawCount: pageResult.debugRows.length,
          rows: pageResult.debugRows,
        });
      }

      setTasks((previous) => (mode === "append" ? mergeTaskPages(previous, pageResult.items) : pageResult.items));
      pageRef.current = requestPage;
      cursorRef.current = pageResult.nextCursor;
      hasMoreRef.current = pageHasMore;
      setHasMore(pageHasMore);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      if (mode === "initial") {
        setLoadingInitial(false);
      } else if (mode === "refresh") {
        setRefreshing(false);
      } else {
        setLoadingMore(false);
      }
      inFlightRef.current = null;
    }
  }, [currentChatUserId, currentSourceSessionId, currentTargetType, currentThreadId, effectiveTargetId]);

  useEffect(() => {
    void loadTasks("initial");
  }, [loadTasks]);

  const handleCompleteTask = useCallback(
    async (task: TaskItem) => {
      const taskId = (task.id || "").trim();
      if (!taskId || completingTaskId) return;
      setCompletingTaskId(taskId);
      setError(null);
      try {
        const updated = await requestCompleteTask(taskId);
        setTasks((previous) =>
          previous.map((item) => {
            if (item.id !== taskId) return item;
            if (updated) return { ...item, ...updated, status: "Done" };
            return { ...item, status: "Done" };
          })
        );
      } catch (err) {
        setError(formatApiError(err));
      } finally {
        setCompletingTaskId("");
      }
    },
    [completingTaskId]
  );

  const renderTaskItem = useCallback(
    ({ item }: { item: TaskItem }) => {
      const done = isTaskDone(item.status);
      const taskId = (item.id || "").trim();
      const completing = taskId !== "" && completingTaskId === taskId;
      return (
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.taskTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={[styles.statusTag, done && styles.statusTagDone]}>
              <Text style={styles.statusText}>{done ? tr("已完成", "Done") : tr("进行中", "Active")}</Text>
            </View>
          </View>

          <Text style={styles.metaText}>
            {tr("负责人", "Assignee")}: {item.assignee || tr("未分配", "Unassigned")} · {tr("优先级", "Priority")}: {item.priority}
          </Text>

          <Pressable
            testID={`chat-task-complete-${taskId || "unknown"}`}
            style={[styles.completeBtn, (done || completing || !taskId) && styles.completeBtnDisabled]}
            disabled={done || completing || !taskId}
            onPress={() => {
              void handleCompleteTask(item);
            }}
          >
            {completing ? (
              <ActivityIndicator size="small" color="#0b1220" />
            ) : (
              <>
                <Ionicons name={done ? "checkmark-circle" : "checkmark-done"} size={14} color="#0b1220" />
                <Text style={styles.completeText}>{done ? tr("已完成", "Completed") : tr("完成", "Complete")}</Text>
              </>
            )}
          </Pressable>
        </View>
      );
    },
    [completingTaskId, handleCompleteTask, tr]
  );

  return (
    <KeyframeBackground>
      <SafeAreaView edges={APP_SAFE_AREA_EDGES} style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={18} color="#e2e8f0" />
            </Pressable>
            <Text style={styles.title}>{currentThreadName || tr("会话任务", "Chat Tasks")}</Text>
            <View style={styles.rightPad} />
          </View>

          {error ? (
            <StateBanner
              variant="error"
              title={tr("任务加载失败", "Failed to load tasks")}
              message={error}
              actionLabel={tr("重试", "Retry")}
              onAction={() => {
                void loadTasks("refresh");
              }}
            />
          ) : null}

          {loadingInitial ? (
            <LoadingSkeleton kind="cards" />
          ) : (
            <FlatList
              testID="chat-tasks-list"
              data={tasks}
              keyExtractor={(item, index) => item.id || `${item.title}-${index}`}
              renderItem={renderTaskItem}
              contentContainerStyle={[styles.listWrap, tasks.length === 0 && styles.listWrapEmpty]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  tintColor="rgba(191,219,254,0.95)"
                  colors={["#93c5fd"]}
                  onRefresh={() => {
                    void loadTasks("refresh");
                  }}
                />
              }
              onEndReachedThreshold={0.3}
              onEndReached={() => {
                if (tasks.length === 0) return;
                if (loadingInitial || refreshing || loadingMore) return;
                if (!hasMore) return;
                void loadTasks("append");
              }}
              ListEmptyComponent={
                <EmptyState
                  title={tr("暂无任务", "No tasks")}
                  hint={
                    currentThreadId
                      ? tr("当前会话暂无任务，尝试在聊天中添加任务", "No tasks in this chat yet. Add tasks from messages.")
                      : tr("下拉可刷新任务列表", "Pull down to refresh tasks")
                  }
                  icon="checkbox-outline"
                />
              }
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.footer}>
                    <ActivityIndicator size="small" color="rgba(191,219,254,0.95)" />
                    <Text style={styles.footerText}>{tr("加载更多中...", "Loading more...")}</Text>
                  </View>
                ) : tasks.length > 0 && !hasMore ? (
                  <View style={styles.footer}>
                    <Text style={styles.footerText}>{tr("没有更多任务了", "No more tasks")}</Text>
                  </View>
                ) : null
              }
            />
          )}
        </View>
      </SafeAreaView>
    </KeyframeBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    color: "#e2e8f0",
    fontSize: 16,
    fontWeight: "900",
  },
  rightPad: {
    width: 40,
    height: 40,
  },
  listWrap: {
    gap: 12,
    paddingTop: 4,
    paddingBottom: 18,
  },
  listWrapEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(15,23,42,0.55)",
    padding: 14,
    gap: 10,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  taskTitle: {
    flex: 1,
    color: "#e2e8f0",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.35)",
    backgroundColor: "rgba(30,64,175,0.22)",
  },
  statusTagDone: {
    borderColor: "rgba(74,222,128,0.32)",
    backgroundColor: "rgba(20,83,45,0.32)",
  },
  statusText: {
    color: "rgba(226,232,240,0.92)",
    fontSize: 11,
    fontWeight: "900",
  },
  metaText: {
    color: "rgba(148,163,184,0.95)",
    fontSize: 12,
    fontWeight: "700",
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: "#e2e8f0",
  },
  completeBtnDisabled: {
    opacity: 0.6,
  },
  completeText: {
    color: "#0b1220",
    fontSize: 12,
    fontWeight: "900",
  },
  footer: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  footerText: {
    color: "rgba(148,163,184,0.9)",
    fontSize: 12,
    fontWeight: "700",
  },
});
