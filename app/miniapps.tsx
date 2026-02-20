import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { KeyframeBackground } from "@/src/components/KeyframeBackground";
import { EmptyState, LoadingSkeleton, StateBanner } from "@/src/components/StateBlocks";
import { MiniAppDock } from "@/src/components/MiniAppDock";
import { APP_SAFE_AREA_EDGES } from "@/src/constants/safe-area";
import { tx } from "@/src/i18n/translate";
import { formatApiError } from "@/src/lib/api";
import { useAgentTown } from "@/src/state/agenttown-context";

export default function MiniAppsScreen() {
  const router = useRouter();
  const { miniApps, runMiniApp, installMiniApp, removeMiniApp, language, bootstrapReady } = useAgentTown();
  const tr = (zh: string, en: string) => tx(language, zh, en);

  const installed = useMemo(() => miniApps.filter((a) => a.installed), [miniApps]);
  const generated = useMemo(() => miniApps.filter((a) => !a.installed), [miniApps]);

  const [runningId, setRunningId] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confirmUninstall = (appId: string, appName: string) => {
    Alert.alert(
      tr("卸载 Mini App", "Uninstall mini app"),
      tr(
        `确认卸载 ${appName || "Mini App"} 吗？`,
        `Uninstall ${appName || "this mini app"}?`
      ),
      [
        { text: tr("取消", "Cancel"), style: "cancel" },
        {
          text: tr("卸载", "Uninstall"),
          style: "destructive",
          onPress: () => {
            void installMiniApp(appId, false).catch((err) => setError(formatApiError(err)));
          },
        },
      ]
    );
  };

  const confirmDeleteMiniApp = (appId: string, appName: string) => {
    Alert.alert(
      tr("删除 Mini App", "Delete mini app"),
      tr(
        `确认删除 ${appName || "Mini App"} 吗？此操作不可撤销。`,
        `Delete ${appName || "this mini app"}? This cannot be undone.`
      ),
      [
        { text: tr("取消", "Cancel"), style: "cancel" },
        {
          text: tr("删除", "Delete"),
          style: "destructive",
          onPress: () => {
            void removeMiniApp(appId).catch((err) => setError(formatApiError(err)));
          },
        },
      ]
    );
  };

  return (
    <KeyframeBackground>
      <SafeAreaView edges={APP_SAFE_AREA_EDGES} style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={18} color="#e2e8f0" />
            </Pressable>
            <Text style={styles.title}>{tr("Mini Apps", "Mini Apps")}</Text>
            <View style={{ width: 40 }} />
          </View>

          <MiniAppDock />

          {error ? (
            <StateBanner
              variant="error"
              title={tr("操作失败", "Action failed")}
              message={error}
              actionLabel={tr("关闭", "Dismiss")}
              onAction={() => setError(null)}
            />
          ) : null}

          {!bootstrapReady ? (
            <LoadingSkeleton kind="cards" />
          ) : miniApps.length === 0 ? (
            <EmptyState title={tr("暂无 Mini App", "No mini apps yet")} hint={tr("用上面的生成器创建一个", "Use the generator above")} icon="apps-outline" />
          ) : (
            <ScrollView contentContainerStyle={styles.listWrap} showsVerticalScrollIndicator={false}>
              {installed.length ? <Text style={styles.sectionTitle}>{tr("已安装", "Installed")}</Text> : null}
              {installed.map((app) => (
                <View key={app.id} style={styles.card}>
                  <View style={styles.cardMain}>
                    <Text style={styles.cardTitle}>{app.name}</Text>
                    <Text style={styles.cardDesc} numberOfLines={3}>
                      {app.summary}
                    </Text>
                    <Text style={styles.cardMeta}>{app.category}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <Pressable
                      style={[styles.actionBtn, runningId === app.id && styles.actionBtnDisabled]}
                      onPress={async () => {
                        if (runningId) return;
                        setRunningId(app.id);
                        setOutput(null);
                        try {
                          const out = await runMiniApp(app.id, tr("请执行一次标准流程", "Run a standard workflow"));
                          if (out) setOutput(out);
                        } catch (err) {
                          setError(formatApiError(err));
                        } finally {
                          setRunningId(null);
                        }
                      }}
                    >
                      <Ionicons name="play-outline" size={14} color="#0b1220" />
                      <Text style={styles.actionText}>{tr("运行", "Run")}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.ghostBtn, styles.ghostBtnWarn]}
                      onPress={() => confirmUninstall(app.id, app.name)}
                    >
                      <Text style={styles.ghostText}>{tr("卸载", "Uninstall")}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}

              {generated.length ? <Text style={styles.sectionTitle}>{tr("待安装", "Ready")}</Text> : null}
              {generated.map((app) => (
                <View key={app.id} style={styles.card}>
                  <View style={styles.cardMain}>
                    <Text style={styles.cardTitle}>{app.name}</Text>
                    <Text style={styles.cardDesc} numberOfLines={3}>
                      {app.summary}
                    </Text>
                    <Text style={styles.cardMeta}>{app.category}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => void installMiniApp(app.id, true).catch((err) => setError(formatApiError(err)))}
                    >
                      <Ionicons name="add-circle-outline" size={16} color="#0b1220" />
                      <Text style={styles.actionText}>{tr("安装", "Install")}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.ghostBtn}
                      onPress={() => confirmDeleteMiniApp(app.id, app.name)}
                    >
                      <Text style={styles.ghostText}>{tr("删除", "Delete")}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}

              {output ? (
                <View style={styles.outputCard}>
                  <Text style={styles.outputTitle}>{tr("运行输出", "Output")}</Text>
                  <Text style={styles.outputText}>{output}</Text>
                </View>
              ) : null}
            </ScrollView>
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
    gap: 12,
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
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
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
  listWrap: {
    gap: 12,
    paddingBottom: 18,
  },
  sectionTitle: {
    color: "rgba(148,163,184,0.92)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 8,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(15,23,42,0.55)",
    padding: 14,
    gap: 10,
  },
  cardMain: {
    gap: 6,
  },
  cardTitle: {
    color: "#e2e8f0",
    fontSize: 15,
    fontWeight: "900",
  },
  cardDesc: {
    color: "rgba(203,213,225,0.78)",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  cardMeta: {
    color: "rgba(148,163,184,0.95)",
    fontSize: 11,
    fontWeight: "700",
  },
  cardActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#e2e8f0",
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionText: {
    color: "#0b1220",
    fontSize: 12,
    fontWeight: "900",
  },
  ghostBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  ghostBtnWarn: {
    borderColor: "rgba(248,113,113,0.20)",
  },
  ghostText: {
    color: "rgba(226,232,240,0.86)",
    fontSize: 12,
    fontWeight: "900",
  },
  outputCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.22)",
    backgroundColor: "rgba(30,64,175,0.16)",
    padding: 14,
    gap: 8,
  },
  outputTitle: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "900",
  },
  outputText: {
    color: "rgba(226,232,240,0.86)",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
});
