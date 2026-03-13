import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { tx } from "@/src/i18n/translate";
import { formatApiError } from "@/src/lib/api";
import { useAgentTown } from "@/src/state/agenttown-context";
import { AppLanguage } from "@/src/types";
import { buildMiniToolCatalog, filterMiniToolCatalog, MiniToolCatalogItem } from "@/src/features/miniapps/catalog";

function tr(language: AppLanguage, zh: string, en: string) {
  return tx(language, zh, en);
}

type Props = {
  onError?: (message: string | null) => void;
};

export function MiniToolsStore({ onError }: Props) {
  const router = useRouter();
  const { language, miniApps, miniAppTemplates, generateMiniApp, installMiniApp, installPresetMiniApp, miniAppGeneration } = useAgentTown();
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const catalog = useMemo(
    () => buildMiniToolCatalog(language, miniApps, miniAppTemplates),
    [language, miniApps, miniAppTemplates]
  );
  const filtered = useMemo(() => filterMiniToolCatalog(catalog, search), [catalog, search]);

  const handleAdd = async (item: MiniToolCatalogItem) => {
    if (busyId) return;
    setBusyId(item.id);
    onError?.(null);
    try {
      if (item.installedApp) {
        router.push(`/miniapp/${item.installedApp.id}`);
        return;
      }
      if (item.linkedApp) {
        await installMiniApp(item.linkedApp.id, true);
        router.push(`/miniapp/${item.linkedApp.id}`);
        return;
      }
      if (item.presetKey) {
        const app = await installPresetMiniApp(item.presetKey);
        router.push(`/miniapp/${app.id}`);
        return;
      }
      const created = await generateMiniApp(item.query, item.sources);
      if (!created) {
        throw new Error(tr(language, "生成失败，请稍后重试。", "Generation failed. Please try again."));
      }
      await installMiniApp(created.id, true);
      router.push(`/miniapp/${created.id}`);
    } catch (err) {
      onError?.(formatApiError(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.shell} testID="mini-tools-store">
      <View style={styles.headerRow}>
        <View style={styles.headerBadge}>
          <Ionicons name="grid-outline" size={14} color="rgba(226,232,240,0.9)" />
          <Text style={styles.headerBadgeText}>{tr(language, "Mini Tools", "Mini Tools")}</Text>
        </View>
        <Text style={styles.headerHint}>{tr(language, "搜索后直接添加", "Search and add instantly")}</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color="rgba(148,163,184,0.85)" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={tr(language, "搜索工具、模板或场景", "Search tools, templates, or use cases")}
          placeholderTextColor="rgba(148,163,184,0.82)"
          style={styles.searchInput}
          autoComplete="off"
          textContentType="oneTimeCode"
          importantForAutofill="no"
        />
      </View>

      {miniAppGeneration.active ? (
        <View style={styles.progressCard}>
          <View style={styles.progressHead}>
            <Text style={styles.progressTitle}>{tr(language, "正在生成 Mini Tool", "Generating Mini Tool")}</Text>
            <Text style={styles.progressValue}>{Math.round(miniAppGeneration.progress)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, miniAppGeneration.progress))}%` }]} />
          </View>
          <Text style={styles.progressStage}>{miniAppGeneration.stage || tr(language, "准备中...", "Preparing...")}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {filtered.map((item) => {
          const busy = busyId === item.id;
          const installed = Boolean(item.installedApp);
          return (
            <Pressable
              key={item.id}
              style={styles.card}
              testID={`mini-tools-card-${item.id.replace(/[:]/g, "-")}`}
              onPress={() => {
                if (item.installedApp) {
                  router.push(`/miniapp/${item.installedApp.id}`);
                }
              }}
            >
              <View style={styles.iconWrap}>
                <View style={[styles.iconBadge, { backgroundColor: `${item.accentColor}26`, borderColor: `${item.accentColor}55` }]}>
                  <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={18} color={item.accentColor} />
                </View>
                <Pressable
                  style={[
                    styles.addBadge,
                    installed ? styles.addBadgeInstalled : busy ? styles.addBadgeBusy : styles.addBadgeIdle,
                  ]}
                  onPress={() => {
                    void handleAdd(item);
                  }}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color={installed ? "#0f172a" : "#ffffff"} />
                  ) : (
                    <Ionicons
                      name={installed ? "checkmark" : "add"}
                      size={14}
                      color={installed ? "#0f172a" : "#ffffff"}
                    />
                  )}
                </Pressable>
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={3}>{item.description}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardMeta}>{item.sourceType === "preset" ? "PRESET" : "TEMPLATE"}</Text>
                <Text style={styles.cardState}>
                  {installed
                    ? tr(language, "已添加", "Added")
                    : item.linkedApp
                    ? tr(language, "待安装", "Ready")
                    : tr(language, "添加", "Add")}
                </Text>
              </View>
            </Pressable>
          );
        })}

        {!filtered.length ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="search-outline" size={26} color="rgba(148,163,184,0.72)" />
            <Text style={styles.emptyTitle}>{tr(language, "没有找到匹配的 Mini Tool", "No matching mini tool found")}</Text>
            <Text style={styles.emptyHint}>{tr(language, "试试搜索新闻、比价、office、data 等关键词", "Try keywords like news, price, office, or data")}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(15,23,42,0.58)",
    padding: 14,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerBadgeText: {
    color: "#e2e8f0",
    fontSize: 16,
    fontWeight: "900",
  },
  headerHint: {
    color: "rgba(148,163,184,0.88)",
    fontSize: 11,
    fontWeight: "700",
  },
  searchWrap: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
  },
  progressCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.22)",
    backgroundColor: "rgba(15,23,42,0.76)",
    padding: 12,
    gap: 8,
  },
  progressHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressTitle: {
    color: "#dbeafe",
    fontSize: 12,
    fontWeight: "900",
  },
  progressValue: {
    color: "#bfdbfe",
    fontSize: 12,
    fontWeight: "900",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.14)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#60a5fa",
  },
  progressStage: {
    color: "rgba(191,219,254,0.92)",
    fontSize: 11,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingBottom: 8,
  },
  card: {
    width: "47%",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(2,6,23,0.42)",
    padding: 12,
    gap: 10,
  },
  iconWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  addBadgeIdle: {
    backgroundColor: "#0ea5e9",
  },
  addBadgeBusy: {
    backgroundColor: "#1e293b",
  },
  addBadgeInstalled: {
    backgroundColor: "#e2e8f0",
  },
  cardTitle: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
    minHeight: 34,
  },
  cardDesc: {
    color: "rgba(203,213,225,0.76)",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
    minHeight: 44,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardMeta: {
    color: "rgba(148,163,184,0.85)",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  cardState: {
    color: "rgba(226,232,240,0.94)",
    fontSize: 10,
    fontWeight: "900",
  },
  emptyWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 8,
  },
  emptyTitle: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "900",
  },
  emptyHint: {
    color: "rgba(148,163,184,0.82)",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    textAlign: "center",
    maxWidth: 240,
  },
});
