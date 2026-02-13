import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { CHAT_DATA } from "@/src/constants/chat";
import { ChatListItem } from "@/src/components/ChatListItem";
import { HousePreview } from "@/src/components/HousePreview";
import { TaskWidget } from "@/src/components/TaskWidget";
import { useAgentTown } from "@/src/state/agenttown-context";

function SceneTree({ left, top, scale = 1 }: { left: number; top: number; scale?: number }) {
  return (
    <View
      style={[
        styles.treeWrap,
        {
          pointerEvents: "none",
          left,
          top,
          transform: [{ scale }],
        },
      ]}
    >
      <View style={styles.treeLeaf} />
      <View style={styles.treeTrunk} />
      <View style={styles.treeShadow} />
    </View>
  );
}

function SceneHouse({
  left,
  top,
  type,
  scale = 1,
  onPress,
}: {
  left: number;
  top: number;
  type: number;
  scale?: number;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.sceneHouseWrap,
        {
          left,
          top,
          transform: [{ scale }],
        },
      ]}
      onPress={onPress}
    >
      <HousePreview type={type} scale={1} />
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { botConfig, tasks, myHouseType } = useAgentTown();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topSection}>
        <View style={styles.townBg}>
          <Svg style={StyleSheet.absoluteFill} viewBox="0 0 420 360" preserveAspectRatio="none">
            <Path
              d="M-60,120 C100,170 180,20 340,80 S520,210 560,220"
              stroke="#4fc3f7"
              strokeWidth="78"
              fill="none"
              strokeLinecap="round"
              opacity={0.88}
            />
            <Path
              d="M-60,120 C100,170 180,20 340,80 S520,210 560,220"
              stroke="#9be5f7"
              strokeWidth="56"
              fill="none"
              strokeLinecap="round"
              opacity={0.7}
            />
          </Svg>

          <View style={styles.topBar}>
            <Pressable style={styles.avatarButton} onPress={() => router.push("/config")}> 
              <Image source={{ uri: botConfig.avatar }} style={styles.avatar} />
              <View style={styles.onlineDot} />
            </Pressable>

            <Pressable style={styles.worldButton} onPress={() => router.push("/town-map")}> 
              <Ionicons name="earth" size={16} color="#16a34a" />
              <Text style={styles.worldButtonText}>Bot World</Text>
            </Pressable>

            <View style={styles.headerRightGroup}>
              <Pressable style={styles.iconCircle} onPress={() => router.push("/town-map")}> 
                <Ionicons name="location-outline" size={18} color="#fff" />
              </Pressable>
              <Pressable style={styles.iconCircle} onPress={() => router.push("/town-map")}> 
                <Ionicons name="people-outline" size={18} color="#fff" />
              </Pressable>
            </View>
          </View>

          <SceneTree left={32} top={86} scale={0.9} />
          <SceneTree left={330} top={132} scale={1.05} />
          <SceneTree left={98} top={208} scale={1.1} />
          <SceneTree left={258} top={248} scale={0.95} />

          <SceneHouse left={48} top={120} type={0} scale={0.95} />
          <SceneHouse left={288} top={108} type={2} scale={0.95} />
          <SceneHouse left={322} top={208} type={1} scale={0.95} />

          <View style={styles.centerHomeWrap}>
            <Pressable style={styles.homePill} onPress={() => router.push("/living-room")}> 
              <Ionicons name="home-outline" size={12} color="#3b82f6" />
              <Text style={styles.homePillText}>My Home</Text>
            </Pressable>
            <SceneHouse left={0} top={10} type={myHouseType} scale={1.35} onPress={() => router.push("/living-room")} />
          </View>

          <Pressable
            style={styles.avatarMarker}
            onPress={() => router.push({ pathname: "/chat/[id]", params: { id: "mybot" } })}
          >
            <Image source={{ uri: botConfig.avatar }} style={styles.markerAvatar} />
            <View style={styles.onlineDotMarker} />
          </Pressable>

          <TaskWidget tasks={tasks} containerStyle={styles.taskWidgetAtTop} />
        </View>
      </View>

      <View style={styles.chatSheet}>
        <View style={styles.chatHandle} />
        <FlatList
          data={CHAT_DATA}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatListItem
              chat={item}
              onPress={() =>
                router.push({
                  pathname: "/chat/[id]",
                  params: { id: item.id },
                })
              }
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <Pressable style={styles.fab}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0b1220",
  },
  topSection: {
    height: "55%",
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  townBg: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 34,
    backgroundColor: "#7ec850",
  },
  topBar: {
    marginTop: 10,
    marginHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 6,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "white",
  },
  avatar: {
    width: "100%",
    height: "100%",
    backgroundColor: "#d1d5db",
  },
  onlineDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#fff",
  },
  worldButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.93)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
  },
  worldButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  headerRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.22)",
  },
  treeWrap: {
    position: "absolute",
    alignItems: "center",
    zIndex: 2,
  },
  treeLeaf: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#1faf4b",
    marginBottom: -12,
  },
  treeTrunk: {
    width: 10,
    height: 20,
    borderRadius: 3,
    backgroundColor: "#8b4513",
  },
  treeShadow: {
    width: 28,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.15)",
    marginTop: 2,
  },
  sceneHouseWrap: {
    position: "absolute",
    zIndex: 3,
  },
  centerHomeWrap: {
    position: "absolute",
    left: "44%",
    top: "45%",
    zIndex: 4,
  },
  homePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 2,
  },
  homePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  avatarMarker: {
    position: "absolute",
    left: "50%",
    top: "53%",
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "white",
    overflow: "hidden",
    zIndex: 8,
  },
  markerAvatar: {
    width: "100%",
    height: "100%",
    backgroundColor: "#d1d5db",
  },
  onlineDotMarker: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#fff",
  },
  taskWidgetAtTop: {
    right: 14,
    bottom: 78,
  },
  chatSheet: {
    flex: 1,
    marginTop: -16,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: "rgba(255,255,255,0.88)",
    overflow: "hidden",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.6)",
  },
  chatHandle: {
    width: 40,
    height: 5,
    borderRadius: 99,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: "#9ca3af",
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 26,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#07c160",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.2)",
  },
  fabText: {
    fontSize: 30,
    color: "#fff",
    lineHeight: 32,
    fontWeight: "300",
    marginTop: -2,
  },
});
