import { Ionicons } from "@expo/vector-icons";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { Drawer } from "expo-router/drawer";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getCachedAgentSessions,
  preloadAgentSessions,
  subscribeAgentSessions,
} from "@/src/features/chat/agent-sessions-cache";
import { formatApiError, type V2ChatSession } from "@/src/lib/api";

function AiSessionDrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<V2ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeqRef = useRef(0);

  const activeSessionId = useMemo(() => {
    const route = props.state.routes[props.state.index];
    const params = (route?.params || {}) as { id?: unknown };
    return typeof params.id === "string" ? params.id.trim() : "";
  }, [props.state.index, props.state.routes]);

  const loadSessions = useCallback(async (force: boolean = false) => {
    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;
    const startedAt = Date.now();
    setLoading(true);
    try {
      const list = await preloadAgentSessions(force);
      if (requestSeq === requestSeqRef.current) {
        setSessions(list);
        setError(null);
      }
    } catch (err) {
      if (requestSeq === requestSeqRef.current) {
        setError(formatApiError(err));
      }
    } finally {
      const elapsed = Date.now() - startedAt;
      const minLoadingDuration = 1000;
      if (elapsed < minLoadingDuration) {
        await new Promise((resolve) => setTimeout(resolve, minLoadingDuration - elapsed));
      }
      if (requestSeq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const cached = getCachedAgentSessions();
    if (cached.length > 0) {
      setSessions(cached);
    }
    const unsubscribe = subscribeAgentSessions((next) => {
      setSessions(next);
    });
    void loadSessions();
    return unsubscribe;
  }, [loadSessions]);

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: Math.max(insets.top, 10),
          paddingBottom: Math.max(insets.bottom, 14),
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Sessions</Text>
        <Pressable
          style={styles.newSessionButton}
          onPress={() => {
            props.navigation.closeDrawer();
            router.replace({
              pathname: "/ai-chat/[id]",
              params: {
                id: `new_${Date.now()}`,
              },
            });
          }}
        >
          <Ionicons name="add" size={14} color="rgba(226,232,240,0.95)" />
          <Text style={styles.newSessionButtonText}>New</Text>
        </Pressable>
      </View>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => void loadSessions(true)}
            tintColor="rgba(226,232,240,0.92)"
            colors={["#93c5fd"]}
            progressBackgroundColor="rgba(15,23,42,0.98)"
          />
        }
        renderItem={({ item }) => {
          const active = item.id === activeSessionId;
          const title = (item.title || "").trim() || "Untitled session";
          return (
            <Pressable
              style={[styles.item, active && styles.itemActive]}
              onPress={() => {
                props.navigation.closeDrawer();
                router.replace({
                  pathname: "/ai-chat/[id]",
                  params: {
                    id: item.id,
                  },
                });
              }}
            >
              <Text style={[styles.itemText, active && styles.itemTextActive]} numberOfLines={1} ellipsizeMode="tail">
                {title}
              </Text>
            </Pressable>
          );
        }}
        ListHeaderComponent={
          <View style={styles.listHeaderWrap}>
            {loading ? (
              <View style={styles.loadingWrap}>
                <Ionicons name="sync" size={14} color="rgba(191,219,254,0.95)" />
                <Text style={styles.loadingText}>Refreshing sessions...</Text>
              </View>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No sessions yet</Text> : null
        }
      />
    </View>
  );
}

export default function AiChatLayout() {
  const { width } = useWindowDimensions();
  return (
    <Drawer
      drawerContent={(props) => <AiSessionDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerPosition: "right",
        drawerType: "front",
        drawerStyle: {
          width: Math.round(width * 0.8),
          backgroundColor: "rgba(15,23,42,0.98)",
        },
        sceneStyle: {
          backgroundColor: "#070a14",
        },
      }}
    >
      <Drawer.Screen name="[id]" />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  title: {
    color: "rgba(226,232,240,0.95)",
    fontSize: 13,
    fontWeight: "800",
  },
  newSessionButton: {
    minHeight: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  newSessionButtonText: {
    color: "rgba(226,232,240,0.95)",
    fontSize: 12,
    fontWeight: "700",
  },
  error: {
    color: "rgba(252,165,165,0.95)",
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  list: {
    flex: 1,
    marginTop: 8,
  },
  listContent: {
    paddingBottom: 12,
    gap: 6,
  },
  listHeaderWrap: {
    gap: 8,
  },
  loadingWrap: {
    minHeight: 34,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
    backgroundColor: "rgba(30,64,175,0.24)",
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.35)",
  },
  loadingText: {
    color: "rgba(226,232,240,0.9)",
    fontSize: 12,
    fontWeight: "700",
  },
  item: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "rgba(15,23,42,0.3)",
  },
  itemActive: {
    borderColor: "rgba(147,197,253,0.72)",
    backgroundColor: "rgba(30,64,175,0.35)",
  },
  itemText: {
    color: "rgba(226,232,240,0.88)",
    fontSize: 12,
    fontWeight: "700",
  },
  itemTextActive: {
    color: "#f8fafc",
  },
  empty: {
    color: "rgba(148,163,184,0.9)",
    textAlign: "center",
    paddingTop: 20,
    fontSize: 12,
  },
});
