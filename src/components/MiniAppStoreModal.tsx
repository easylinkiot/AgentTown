import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getMiniToolStoreEntries, MiniToolStoreEntry } from "@/src/features/miniapps/parity-registry";

type Props = {
  visible: boolean;
  installedItemIds: string[];
  busyItemId?: string | null;
  onClose: () => void;
  onAddApp: (app: MiniToolStoreEntry) => void;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function MiniAppStoreModal({
  visible,
  installedItemIds,
  busyItemId,
  onClose,
  onAddApp,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!visible) {
      setSearchTerm("");
    }
  }, [visible]);

  const filteredApps = useMemo(() => {
    const safe = normalize(searchTerm);
    if (!safe) return getMiniToolStoreEntries();
    return getMiniToolStoreEntries().filter((app) => normalize(`${app.name} ${app.description}`).includes(safe));
  }, [searchTerm]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.shell} pointerEvents="box-none">
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.dragWrap}>
            <View style={styles.dragHandle} />
          </View>

          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="grid-outline" size={18} color="rgba(255,255,255,0.82)" />
              <Text style={styles.title}>Mini Tools</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.72)" />
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.40)" />
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="搜索工具..."
              placeholderTextColor="rgba(255,255,255,0.40)"
              style={styles.searchInput}
              autoComplete="off"
              textContentType="oneTimeCode"
              importantForAutofill="no"
            />
          </View>

          <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
            {filteredApps.map((app) => {
              const installed = installedItemIds.includes(app.id);
              const busy = busyItemId === app.id;
              return (
                <View key={app.id} style={styles.gridItem}>
                  <View style={styles.cardWrap}>
                    <View style={[styles.iconBox, { backgroundColor: app.surfaceColor }]}>
                      <Ionicons name={app.icon as keyof typeof Ionicons.glyphMap} size={20} color="rgba(255,255,255,0.90)" />
                    </View>
                    <Pressable
                      style={[
                        styles.addBtn,
                        installed ? styles.addBtnInstalled : styles.addBtnIdle,
                        busy && styles.addBtnBusy,
                      ]}
                      disabled={installed || busy}
                      onPress={() => onAddApp(app)}
                    >
                      <Ionicons
                        name={installed ? "checkmark" : busy ? "hourglass-outline" : "add"}
                        size={installed ? 10 : 12}
                        color={installed ? "#ffffff" : busy ? "#0f172a" : "#000000"}
                      />
                    </Pressable>
                  </View>

                  <View style={styles.textWrap}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {app.name}
                    </Text>
                    <Text style={styles.itemDesc} numberOfLines={1}>
                      {app.description}
                    </Text>
                  </View>
                </View>
              );
            })}

            {filteredApps.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="search-outline" size={32} color="rgba(255,255,255,0.40)" />
                <Text style={styles.emptyText}>未找到相关工具</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.60)",
  },
  sheet: {
    height: "90%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: "#1c1c1e",
    overflow: "hidden",
  },
  dragWrap: {
    width: "100%",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  dragHandle: {
    width: 48,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    margin: 16,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 14,
  },
  grid: {
    paddingHorizontal: 10,
    paddingBottom: 24,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridItem: {
    width: "25%",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingBottom: 24,
  },
  cardWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    position: "absolute",
    right: -6,
    bottom: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#1c1c1e",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnIdle: {
    backgroundColor: "#ffffff",
  },
  addBtnInstalled: {
    backgroundColor: "#52525b",
  },
  addBtnBusy: {
    backgroundColor: "#e2e8f0",
  },
  textWrap: {
    alignItems: "center",
    gap: 2,
  },
  itemTitle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 8,
    fontWeight: "500",
    lineHeight: 11,
    textAlign: "center",
  },
  itemDesc: {
    color: "rgba(255,255,255,0.30)",
    fontSize: 7,
    lineHeight: 9,
    textAlign: "center",
  },
  emptyWrap: {
    width: "100%",
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    color: "rgba(255,255,255,0.40)",
    fontSize: 14,
  },
});
