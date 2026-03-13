import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { buildMiniToolCatalog } from "@/src/features/miniapps/catalog";
import { tx } from "@/src/i18n/translate";
import { formatApiError } from "@/src/lib/api";
import { useAgentTown } from "@/src/state/agenttown-context";

type Props = {
  bottomInset: number;
};

export function HomeMiniToolsDock({ bottomInset }: Props) {
  const router = useRouter();
  const { language, miniApps, miniAppTemplates, installMiniApp } = useAgentTown();
  const tr = (zh: string, en: string) => tx(language, zh, en);
  const [busyId, setBusyId] = useState<string | null>(null);

  const catalog = useMemo(
    () => buildMiniToolCatalog(language, miniApps, miniAppTemplates),
    [language, miniApps, miniAppTemplates]
  );
  const installed = useMemo(() => catalog.filter((item) => item.installedApp), [catalog]);

  const confirmRemove = (appId: string, name: string) => {
    Alert.alert(
      tr("移除 Mini App", "Remove Mini App"),
      tr(`将 ${name} 从首页快捷入口移除？`, `Remove ${name} from the home dock?`),
      [
        { text: tr("取消", "Cancel"), style: "cancel" },
        {
          text: tr("移除", "Remove"),
          style: "destructive",
          onPress: () => {
            setBusyId(appId);
            void installMiniApp(appId, false)
              .catch((err) => {
                Alert.alert(tr("操作失败", "Action failed"), formatApiError(err));
              })
              .finally(() => setBusyId(null));
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.wrap, { bottom: bottomInset + 78 }]} pointerEvents="box-none">
      <View style={styles.shell}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          <Pressable style={styles.primaryCard} onPress={() => router.push("/miniapps" as never)} testID="home-mini-tools-entry">
            <View style={[styles.primaryIcon, { backgroundColor: "rgba(59,130,246,0.18)" }]}>
              <Ionicons name="grid-outline" size={16} color="#60a5fa" />
            </View>
            <Text style={styles.primaryTitle}>{tr("Mini Tools", "Mini Tools")}</Text>
            <Text style={styles.primaryMeta}>{tr("搜索 / 添加", "Search / Add")}</Text>
          </Pressable>

          {installed.map((item) => (
            <Pressable
              key={item.id}
              style={styles.appChip}
              onPress={() => router.push(`/miniapp/${item.installedApp?.id}`)}
              onLongPress={() => {
                if (item.installedApp) {
                  confirmRemove(item.installedApp.id, item.title);
                }
              }}
              delayLongPress={220}
              testID={`home-miniapp-chip-${item.installedApp?.id || item.id}`}
            >
              <View style={[styles.chipIcon, { backgroundColor: `${item.accentColor}28` }]}>
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={15} color={item.accentColor} />
              </View>
              <Text style={styles.chipLabel} numberOfLines={1}>{item.title}</Text>
              <Pressable
                hitSlop={8}
                style={[styles.removeBadge, busyId === item.installedApp?.id && styles.removeBadgeBusy]}
                onPress={() => {
                  if (item.installedApp) {
                    confirmRemove(item.installedApp.id, item.title);
                  }
                }}
              >
                <Ionicons
                  name={busyId === item.installedApp?.id ? "hourglass-outline" : "close"}
                  size={11}
                  color="#ffffff"
                />
              </Pressable>
            </Pressable>
          ))}

          <Pressable style={styles.addCard} onPress={() => router.push("/miniapps" as never)} testID="home-mini-tools-add">
            <Ionicons name="add" size={18} color="rgba(226,232,240,0.88)" />
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 38,
  },
  shell: {
    width: "92%",
  },
  row: {
    gap: 10,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  primaryCard: {
    minWidth: 110,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(8,15,32,0.84)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 5,
  },
  primaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryTitle: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "900",
  },
  primaryMeta: {
    color: "rgba(191,219,254,0.88)",
    fontSize: 10,
    fontWeight: "700",
  },
  appChip: {
    minWidth: 92,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(8,15,32,0.84)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    position: "relative",
  },
  chipIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  chipLabel: {
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "800",
    maxWidth: 74,
  },
  removeBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(239,68,68,0.88)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBadgeBusy: {
    backgroundColor: "rgba(71,85,105,0.92)",
  },
  addCard: {
    width: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(15,23,42,0.46)",
    alignItems: "center",
    justifyContent: "center",
  },
});
