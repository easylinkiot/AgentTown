import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  generateCity,
  LotVisualType,
  MAP_HEIGHT,
  MAP_WIDTH,
} from "@/src/features/townmap/generateCity";
import { generateGeminiText } from "@/src/lib/gemini";

interface TownMapMessage {
  role: "user" | "model";
  text: string;
}

function HouseNode({ type, selected, scale = 1 }: { type: LotVisualType; selected: boolean; scale?: number }) {
  const sizeScale = selected ? scale * 1.08 : scale;

  if (type === "market-stall") {
    return (
      <View style={[styles.marketWrap, { transform: [{ scale: sizeScale }] }]}>
        <View style={styles.marketAwning}>
          <View style={[styles.awningStripe, { backgroundColor: "#ef4444" }]} />
          <View style={[styles.awningStripe, { backgroundColor: "#fff" }]} />
          <View style={[styles.awningStripe, { backgroundColor: "#ef4444" }]} />
          <View style={[styles.awningStripe, { backgroundColor: "#fff" }]} />
        </View>
        <View style={styles.marketBody} />
      </View>
    );
  }

  const palette = {
    "red-cottage": { roof: "#c92a2a", wall: "#fff7ed", door: "#78350f" },
    "blue-villa": { roof: "#3b5bdb", wall: "#ffffff", door: "#5c4033" },
    "dark-cabin": { roof: "#343a40", wall: "#f8f9fa", door: "#495057" },
    "brown-manor": { roof: "#78350f", wall: "#fffbeb", door: "#451a03" },
  }[type];

  return (
    <View style={[styles.houseWrap, { transform: [{ scale: sizeScale }] }]}>
      <View
        style={[
          styles.houseRoof,
          {
            borderBottomColor: palette.roof,
          },
        ]}
      />
      <View style={[styles.houseBody, { backgroundColor: palette.wall }]}>
        <View style={[styles.houseDoor, { backgroundColor: palette.door }]} />
      </View>
      <View style={styles.houseShadow} />
    </View>
  );
}

export default function TownMapScreen() {
  const router = useRouter();
  const { lots, trees } = useMemo(() => generateCity(), []);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [scale, setScale] = useState(0.55);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<TownMapMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const chatScrollRef = useRef<ScrollView | null>(null);

  const selectedLot = useMemo(
    () => lots.find((item) => item.id === selectedLotId) ?? null,
    [lots, selectedLotId]
  );

  const mapWidthScaled = MAP_WIDTH * scale;
  const mapHeightScaled = MAP_HEIGHT * scale;

  const openChat = () => {
    if (!selectedLot) return;
    setChatMessages([{ role: "model", text: selectedLot.npc.greeting }]);
    setIsChatOpen(true);
  };

  const sendChat = async () => {
    const text = inputValue.trim();
    if (!text || !selectedLot) return;

    setInputValue("");
    const nextHistory = [...chatMessages, { role: "user" as const, text }];
    setChatMessages(nextHistory);

    const reply = await generateGeminiText({
      prompt: text,
      systemInstruction: `You are ${selectedLot.npc.name}, a ${selectedLot.npc.role} in AgentTown. Keep replies short and practical.`,
      history: nextHistory.slice(-10),
    });

    setChatMessages((prev) => [
      ...prev,
      {
        role: "model",
        text: reply ?? `${selectedLot.npc.name}: Got it. I can help with that.`,
      },
    ]);

    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 30);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.mapHeader}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.headerCircle} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <View style={styles.mapPill}>
            <Ionicons name="earth" size={14} color="#15803d" />
            <Text style={styles.mapPillText}>Town Map</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.headerDarkCircle}>
            <Ionicons name="pin" size={16} color="#fff" />
          </View>
          <View style={styles.headerDarkCircle}>
            <Ionicons name="person" size={16} color="#fff" />
          </View>
        </View>
      </View>

      <View style={styles.zoomWrap}>
        <Pressable style={styles.zoomBtn} onPress={() => setScale((v) => Math.min(v + 0.1, 1.25))}>
          <Ionicons name="add" size={18} color="#374151" />
        </Pressable>
        <Pressable style={styles.zoomBtn} onPress={() => setScale((v) => Math.max(v - 0.1, 0.25))}>
          <Ionicons name="remove" size={18} color="#374151" />
        </Pressable>
      </View>

      <ScrollView horizontal style={styles.outerScroll} contentContainerStyle={{ flexGrow: 1 }}>
        <ScrollView style={styles.innerScroll} contentContainerStyle={{ flexGrow: 1 }}>
          <View style={[styles.mapCanvas, { width: mapWidthScaled, height: mapHeightScaled }]}>
            <View
              style={[
                styles.river,
                {
                  left: 200 * scale,
                  top: 920 * scale,
                  width: 2000 * scale,
                  height: 360 * scale,
                  borderRadius: 180 * scale,
                },
              ]}
            />

            <View style={[styles.roadVertical, { left: 600 * scale, height: mapHeightScaled }]} />
            <View style={[styles.roadVertical, { left: 1800 * scale, height: mapHeightScaled }]} />
            <View style={[styles.roadHorizontal, { top: 500 * scale, width: mapWidthScaled }]} />
            <View style={[styles.roadHorizontal, { top: 1800 * scale, width: mapWidthScaled }]} />

            {trees.map((tree, idx) => (
              <View
                key={`tree-${idx}`}
                style={[
                  styles.tree,
                  {
                    left: tree.x * scale,
                    top: tree.y * scale,
                    transform: [{ scale: tree.scale * scale }],
                  },
                ]}
              />
            ))}

            {lots.map((lot) => {
              const selected = lot.id === selectedLotId;
              return (
                <Pressable
                  key={lot.id}
                  style={[
                    styles.lotWrap,
                    {
                      left: lot.x * scale,
                      top: lot.y * scale,
                    },
                  ]}
                  onPress={() => setSelectedLotId(lot.id)}
                >
                  {selected ? (
                    <View style={styles.avatarBubble}>
                      <Image source={{ uri: lot.npc.avatar }} style={styles.avatarBubbleImage} />
                      <View>
                        <Text style={styles.avatarBubbleName}>{lot.label}</Text>
                        <Text style={styles.avatarBubbleRole}>{lot.npc.role}</Text>
                      </View>
                    </View>
                  ) : !lot.isMarket ? (
                    <View style={styles.labelPill}>
                      <Text style={styles.labelPillText}>{lot.label}</Text>
                    </View>
                  ) : null}

                  <HouseNode type={lot.visualType} selected={selected} scale={Math.max(0.8, scale)} />
                </Pressable>
              );
            })}

            <View style={[styles.myHomeMarker, { left: 2000 * scale, top: 1800 * scale }]}>
              <View style={styles.myHomePill}>
                <Ionicons name="home" size={10} color="#3b82f6" />
                <Text style={styles.myHomeText}>My Home</Text>
              </View>
              <HouseNode type="brown-manor" selected={false} scale={Math.max(0.8, scale)} />
            </View>
          </View>
        </ScrollView>
      </ScrollView>

      {selectedLot ? (
        <View style={styles.visitWrap}>
          <Pressable style={styles.visitBtn} onPress={openChat}>
            <Ionicons name="chatbubble" size={16} color="white" />
            <Text style={styles.visitBtnText}>Visit {selectedLot.label}</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal visible={isChatOpen} animationType="slide" transparent onRequestClose={() => setIsChatOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.chatSheet}>
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderLeft}>
                {selectedLot ? (
                  <Image source={{ uri: selectedLot.npc.avatar }} style={styles.chatAvatar} />
                ) : null}
                <View>
                  <Text style={styles.chatName}>{selectedLot?.npc.name ?? "NPC"}</Text>
                  <Text style={styles.chatRole}>{selectedLot?.npc.role ?? "Role"}</Text>
                </View>
              </View>
              <Pressable style={styles.headerCircleWhite} onPress={() => setIsChatOpen(false)}>
                <Ionicons name="close" size={18} color="#374151" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.chatMessages}
              contentContainerStyle={styles.chatMessagesContent}
              ref={chatScrollRef}
            >
              {chatMessages.map((msg, idx) => (
                <View
                  key={`${msg.role}-${idx}`}
                  style={[styles.chatRow, msg.role === "user" ? styles.chatRowMe : styles.chatRowBot]}
                >
                  <View
                    style={[
                      styles.chatBubble,
                      msg.role === "user" ? styles.chatBubbleMe : styles.chatBubbleBot,
                    ]}
                  >
                    <Text style={styles.chatBubbleText}>{msg.text}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.chatInputWrap}>
              <TextInput
                style={styles.chatInput}
                value={inputValue}
                onChangeText={setInputValue}
                placeholder="Type a message..."
                onSubmitEditing={sendChat}
              />
              <Pressable style={styles.chatSendBtn} onPress={sendChat}>
                <Ionicons name="send" size={16} color="#374151" />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#7ec850",
  },
  mapHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  headerDarkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  mapPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  mapPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  zoomWrap: {
    position: "absolute",
    left: 10,
    bottom: 140,
    zIndex: 20,
    gap: 8,
  },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  outerScroll: {
    flex: 1,
  },
  innerScroll: {
    flex: 1,
  },
  mapCanvas: {
    backgroundColor: "#7ec850",
  },
  river: {
    position: "absolute",
    backgroundColor: "rgba(56,189,248,0.75)",
    transform: [{ rotate: "-8deg" }],
  },
  roadVertical: {
    position: "absolute",
    width: 38,
    backgroundColor: "#4b5563",
    opacity: 0.9,
  },
  roadHorizontal: {
    position: "absolute",
    height: 38,
    backgroundColor: "#4b5563",
    opacity: 0.9,
  },
  tree: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#16a34a",
    opacity: 0.85,
  },
  lotWrap: {
    position: "absolute",
    alignItems: "center",
  },
  labelPill: {
    position: "absolute",
    bottom: 42,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  labelPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#111827",
  },
  avatarBubble: {
    position: "absolute",
    bottom: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 108,
  },
  avatarBubbleImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
  },
  avatarBubbleName: {
    fontSize: 10,
    fontWeight: "700",
    color: "#111827",
  },
  avatarBubbleRole: {
    fontSize: 9,
    color: "#2563eb",
  },
  houseWrap: {
    alignItems: "center",
  },
  houseRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 18,
    borderRightWidth: 18,
    borderBottomWidth: 22,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  houseBody: {
    width: 28,
    height: 24,
    marginTop: -1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 1,
  },
  houseDoor: {
    width: 10,
    height: 13,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  houseShadow: {
    width: 34,
    height: 4,
    borderRadius: 999,
    marginTop: 2,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  marketWrap: {
    alignItems: "center",
  },
  marketAwning: {
    width: 32,
    height: 12,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    overflow: "hidden",
    flexDirection: "row",
  },
  awningStripe: {
    flex: 1,
  },
  marketBody: {
    width: 26,
    height: 16,
    backgroundColor: "#fcd34d",
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  myHomeMarker: {
    position: "absolute",
    alignItems: "center",
  },
  myHomePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  myHomeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1f2937",
  },
  visitWrap: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  visitBtn: {
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: "#111827",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  visitBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  chatSheet: {
    height: "84%",
    backgroundColor: "white",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
  },
  chatHeader: {
    marginHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e5e7eb",
  },
  chatName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  chatRole: {
    fontSize: 11,
    color: "#6b7280",
  },
  headerCircleWhite: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  chatMessages: {
    flex: 1,
  },
  chatMessagesContent: {
    padding: 14,
    gap: 8,
  },
  chatRow: {
    flexDirection: "row",
  },
  chatRowMe: {
    justifyContent: "flex-end",
  },
  chatRowBot: {
    justifyContent: "flex-start",
  },
  chatBubble: {
    maxWidth: "82%",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chatBubbleMe: {
    backgroundColor: "#95EC69",
  },
  chatBubbleBot: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chatBubbleText: {
    fontSize: 14,
    color: "#111827",
    lineHeight: 20,
  },
  chatInputWrap: {
    margin: 12,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chatInput: {
    flex: 1,
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "white",
  },
  chatSendBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
});
