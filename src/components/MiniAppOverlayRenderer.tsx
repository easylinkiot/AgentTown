import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { MiniAppRenderer } from "@/src/features/miniapps/MiniAppRenderer";
import { buildMiniAppViewModel } from "@/src/features/miniapps/model";
import { MiniApp } from "@/src/types";

type Props = {
  app: MiniApp | null;
  visible: boolean;
  onClose: () => void;
};

export function MiniAppOverlayRenderer({ app, visible, onClose }: Props) {
  if (!app) return null;
  const vm = buildMiniAppViewModel(app);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.shell} pointerEvents="box-none">
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card} testID={`miniapp-overlay-${app.id}`}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconBadge, { backgroundColor: vm.color || "#ffffff" }]}>
                <Ionicons name={vm.icon as keyof typeof Ionicons.glyphMap} size={18} color="#ffffff" />
              </View>
              <View style={styles.titleWrap}>
                <Text style={styles.title} numberOfLines={1}>
                  {app.name}
                </Text>
                <Text style={styles.subtitle}>AI 生成应用</Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <Pressable style={styles.actionBtn}>
                <Ionicons name="share-social-outline" size={18} color="#6b7280" />
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={onClose}>
                <Ionicons name="close" size={18} color="#6b7280" />
              </Pressable>
            </View>
          </View>

          <View style={styles.body}>
            <MiniAppRenderer app={app} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>AI 自动生成内容</Text>
            <View style={styles.footerBadge}>
              <Ionicons name="pulse-outline" size={10} color="#16a34a" />
              <Text style={styles.footerBadgeText}>实时数据</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.40)",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    height: "85%",
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: "#f2f2f6",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.40)",
  },
  header: {
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "rgba(255,255,255,0.84)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },
  subtitle: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
  },
  footer: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  footerText: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "600",
  },
  footerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  footerBadgeText: {
    color: "#16a34a",
    fontSize: 9,
    fontWeight: "800",
  },
});
