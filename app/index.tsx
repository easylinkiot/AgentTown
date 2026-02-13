import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CHAT_DATA } from "@/src/constants/chat";
import { ChatListItem } from "@/src/components/ChatListItem";
import { HousePreview } from "@/src/components/HousePreview";
import { TaskWidget } from "@/src/components/TaskWidget";
import { useAgentTown } from "@/src/state/agenttown-context";

export default function HomeScreen() {
  const router = useRouter();
  const { botConfig, tasks, myHouseType } = useAgentTown();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topSection}>
        <ImageBackground
          style={styles.townBg}
          source={{
            uri: "https://images.unsplash.com/photo-1524047049468-2d9317aa761d?q=80&w=1000&auto=format&fit=crop",
          }}
          imageStyle={styles.townBgImage}
        >
          <View style={styles.townOverlay} />

          <View style={styles.topBar}>
            <Pressable style={styles.avatarButton} onPress={() => router.push("/config")}> 
              <Image source={{ uri: botConfig.avatar }} style={styles.avatar} />
            </Pressable>

            <Pressable style={styles.worldButton} onPress={() => router.push("/town-map")}> 
              <Ionicons name="earth" size={16} color="#15803d" />
              <Text style={styles.worldButtonText}>Bot World</Text>
            </Pressable>

            <Pressable style={styles.iconCircle} onPress={() => router.push("/town-map")}> 
              <Ionicons name="map" size={16} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.centerHomeCard}>
            <Pressable style={styles.homeCardInner} onPress={() => router.push("/living-room")}> 
              <Text style={styles.homeTitle}>My Home</Text>
              <HousePreview type={myHouseType} scale={1.15} />
            </Pressable>
          </View>

          <View style={styles.quickActions}>
            <Pressable
              style={styles.quickActionBtn}
              onPress={() => router.push({ pathname: "/chat/[id]", params: { id: "mybot" } })}
            >
              <Ionicons name="chatbubble-ellipses" size={16} color="#111827" />
              <Text style={styles.quickActionText}>Chat with MyBot</Text>
            </Pressable>

            <Pressable style={styles.quickActionBtn} onPress={() => router.push("/config")}> 
              <Ionicons name="settings" size={16} color="#111827" />
              <Text style={styles.quickActionText}>Bot Config</Text>
            </Pressable>
          </View>

          <TaskWidget tasks={tasks} />
        </ImageBackground>
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
    backgroundColor: "#111827",
  },
  topSection: {
    height: "55%",
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  townBg: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 22,
    backgroundColor: "#7ec850",
  },
  townBgImage: {
    opacity: 0.85,
  },
  townOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  topBar: {
    marginTop: 10,
    marginHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "white",
  },
  avatar: {
    width: "100%",
    height: "100%",
    backgroundColor: "#d1d5db",
  },
  worldButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  worldButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.45)",
  },
  centerHomeCard: {
    marginTop: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  homeCardInner: {
    width: 150,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  homeTitle: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "700",
    marginBottom: 4,
  },
  quickActions: {
    marginTop: 14,
    marginHorizontal: 14,
    flexDirection: "row",
    gap: 10,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.93)",
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
  },
  chatSheet: {
    flex: 1,
    marginTop: -16,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: "rgba(255,255,255,0.92)",
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
    borderWidth: 3,
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
