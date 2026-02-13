import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { HousePreview } from "@/src/components/HousePreview";
import { useAgentTown } from "@/src/state/agenttown-context";

type PanelType = "house" | "interests" | "jobs" | "assets" | null;

const HOUSE_STYLES = [
  { id: 0, name: "Cozy Cottage" },
  { id: 1, name: "Modern Blue" },
  { id: 2, name: "Minimalist" },
  { id: 3, name: "Golden Manor" },
];

function AppTile({
  label,
  icon,
  color,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.appTile} onPress={onPress}>
      <View style={[styles.appTileIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="white" />
      </View>
      <Text style={styles.appTileLabel}>{label}</Text>
    </Pressable>
  );
}

export default function LivingRoomScreen() {
  const router = useRouter();
  const { myHouseType, updateHouseType } = useAgentTown();
  const [activePanel, setActivePanel] = useState<PanelType>(null);

  const panelTitle = useMemo(() => {
    switch (activePanel) {
      case "house":
        return "Decorate Exterior";
      case "interests":
        return "Interests";
      case "jobs":
        return "Jobs";
      case "assets":
        return "Assets";
      default:
        return "";
    }
  }, [activePanel]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <View style={styles.titlePill}>
          <Ionicons name="home" size={12} color="#fff" />
          <Text style={styles.titlePillText}>Living Room</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroText}>My Home</Text>
        <HousePreview type={myHouseType} scale={1.6} />
      </View>

      <View style={styles.grid}>
        <AppTile label="House" icon="home" color="#f97316" onPress={() => setActivePanel("house")} />
        <AppTile label="Skills" icon="flash" color="#2563eb" onPress={() => router.push("/config")} />
        <AppTile
          label="Interests"
          icon="game-controller"
          color="#a855f7"
          onPress={() => setActivePanel("interests")}
        />
        <AppTile label="Jobs" icon="briefcase" color="#ec4899" onPress={() => setActivePanel("jobs")} />
        <AppTile label="Assets" icon="cash" color="#22c55e" onPress={() => setActivePanel("assets")} />
      </View>

      <Modal visible={activePanel !== null} transparent animationType="slide" onRequestClose={() => setActivePanel(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setActivePanel(null)} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{panelTitle}</Text>
              <Pressable onPress={() => setActivePanel(null)}>
                <Ionicons name="close" size={18} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.sheetContent}>
              {activePanel === "house" ? (
                <View style={styles.houseGrid}>
                  {HOUSE_STYLES.map((house) => (
                    <Pressable
                      key={house.id}
                      onPress={() => {
                        updateHouseType(house.id);
                        setActivePanel(null);
                      }}
                      style={[
                        styles.houseCard,
                        myHouseType === house.id && styles.houseCardSelected,
                      ]}
                    >
                      <HousePreview type={house.id} scale={0.9} />
                      <Text
                        style={[
                          styles.houseCardText,
                          myHouseType === house.id && styles.houseCardTextSelected,
                        ]}
                      >
                        {house.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {activePanel === "interests" ? (
                <View style={styles.listWrap}>
                  <View style={styles.infoItem}>
                    <Ionicons name="game-controller" size={20} color="#9333ea" />
                    <Text style={styles.infoText}>Games</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="film" size={20} color="#dc2626" />
                    <Text style={styles.infoText}>Movies</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="trophy" size={20} color="#16a34a" />
                    <Text style={styles.infoText}>Sports</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="people" size={20} color="#2563eb" />
                    <Text style={styles.infoText}>Social</Text>
                  </View>
                </View>
              ) : null}

              {activePanel === "jobs" ? (
                <View style={styles.listWrap}>
                  <View style={styles.jobCard}>
                    <Text style={styles.jobTag}>Content Creation · $500/mo</Text>
                    <Text style={styles.jobTitle}>Video Script Writer</Text>
                    <Text style={styles.jobDesc}>Create engaging scripts for tech reviews.</Text>
                  </View>
                  <View style={styles.jobCard}>
                    <Text style={styles.jobTag}>Projects · $1200</Text>
                    <Text style={styles.jobTitle}>React Dashboard</Text>
                    <Text style={styles.jobDesc}>Build a responsive admin panel.</Text>
                  </View>
                </View>
              ) : null}

              {activePanel === "assets" ? (
                <View style={styles.listWrap}>
                  <View style={styles.assetTotalCard}>
                    <Text style={styles.assetLabel}>Total Earnings</Text>
                    <Text style={styles.assetValue}>$12,450.00</Text>
                  </View>
                  <View style={styles.assetGrid}>
                    <View style={styles.assetSmallCard}>
                      <Ionicons name="trending-up" size={20} color="#16a34a" />
                      <Text style={styles.assetSmallText}>Analytics</Text>
                    </View>
                    <View style={styles.assetSmallCard}>
                      <Ionicons name="document-text" size={20} color="#2563eb" />
                      <Text style={styles.assetSmallText}>Contracts</Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#111827",
  },
  header: {
    marginTop: 8,
    marginHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  titlePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  titlePillText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 40,
  },
  heroCard: {
    marginTop: 24,
    marginHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingVertical: 24,
    alignItems: "center",
    gap: 10,
  },
  heroText: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },
  grid: {
    marginTop: 26,
    marginHorizontal: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
  },
  appTile: {
    width: "20%",
    minWidth: 64,
    alignItems: "center",
    gap: 8,
  },
  appTileIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  appTileLabel: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    maxHeight: "75%",
    backgroundColor: "white",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 20,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 46,
    height: 5,
    borderRadius: 99,
    backgroundColor: "#d1d5db",
    marginTop: 10,
  },
  sheetHeader: {
    marginTop: 8,
    marginHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  houseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  houseCard: {
    width: "47%",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    paddingVertical: 12,
    alignItems: "center",
    gap: 6,
  },
  houseCardSelected: {
    borderColor: "#22c55e",
    backgroundColor: "#f0fdf4",
  },
  houseCardText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "700",
  },
  houseCardTextSelected: {
    color: "#15803d",
  },
  listWrap: {
    gap: 10,
  },
  infoItem: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  infoText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  jobCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "white",
    padding: 12,
    gap: 6,
  },
  jobTag: {
    fontSize: 11,
    color: "#2563eb",
    fontWeight: "700",
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  jobDesc: {
    fontSize: 12,
    color: "#4b5563",
  },
  assetTotalCard: {
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#f59e0b",
    gap: 4,
  },
  assetLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "700",
  },
  assetValue: {
    fontSize: 30,
    color: "white",
    fontWeight: "800",
  },
  assetGrid: {
    flexDirection: "row",
    gap: 10,
  },
  assetSmallCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f9fafb",
  },
  assetSmallText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
});
