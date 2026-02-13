import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import {
  generateCity,
  LotVisualType,
  MAP_HEIGHT,
  MAP_WIDTH,
} from "@/src/features/townmap/generateCity";
import { generateGeminiText } from "@/src/lib/gemini";

type RouteId = "north_ave" | "south_blvd" | "west_hwy" | "east_hwy";

interface TownMapMessage {
  role: "user" | "model";
  text: string;
}

type RouteDef =
  | {
      id: RouteId;
      type: "quadratic";
      p0: { x: number; y: number };
      p1: { x: number; y: number };
      p2: { x: number; y: number };
      svgPath: string;
    }
  | {
      id: RouteId;
      type: "line";
      p0: { x: number; y: number };
      p1: { x: number; y: number };
      svgPath: string;
    };

interface MovingCar {
  id: string;
  routeId: RouteId;
  color: string;
  speed: number;
  delay: number;
  direction: 1 | -1;
}

const ROAD_ROUTES: RouteDef[] = [
  {
    id: "north_ave",
    type: "quadratic",
    p0: { x: -200, y: 450 },
    p1: { x: 1200, y: 750 },
    p2: { x: 2600, y: 450 },
    svgPath: "M -200 450 Q 1200 750 2600 450",
  },
  {
    id: "south_blvd",
    type: "quadratic",
    p0: { x: -200, y: 1900 },
    p1: { x: 1200, y: 1600 },
    p2: { x: 2600, y: 1900 },
    svgPath: "M -200 1900 Q 1200 1600 2600 1900",
  },
  {
    id: "west_hwy",
    type: "line",
    p0: { x: 600, y: -200 },
    p1: { x: 600, y: 3000 },
    svgPath: "M 600 -200 L 600 3000",
  },
  {
    id: "east_hwy",
    type: "line",
    p0: { x: 1800, y: -200 },
    p1: { x: 1800, y: 3000 },
    svgPath: "M 1800 -200 L 1800 3000",
  },
];

function quadPoint(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  t: number
) {
  const x =
    (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
  const y =
    (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;

  const dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const dy = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);

  return {
    x,
    y,
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}

function routePoint(route: RouteDef, t: number) {
  if (route.type === "quadratic") {
    return quadPoint(route.p0, route.p1, route.p2, t);
  }

  const x = route.p0.x + (route.p1.x - route.p0.x) * t;
  const y = route.p0.y + (route.p1.y - route.p0.y) * t;
  const angle =
    (Math.atan2(route.p1.y - route.p0.y, route.p1.x - route.p0.x) * 180) /
    Math.PI;

  return { x, y, angle };
}

function HouseNode({
  type,
  selected,
  scale = 1,
}: {
  type: LotVisualType;
  selected: boolean;
  scale?: number;
}) {
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
        <View style={styles.houseWindow} />
      </View>
      <View style={styles.houseShadow} />
    </View>
  );
}

export default function TownMapScreen() {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { lots, trees } = useMemo(() => generateCity(), []);

  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [scale, setScale] = useState(0.5);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<TownMapMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [clockMs, setClockMs] = useState(() => Date.now());

  const horizontalRef = useRef<ScrollView | null>(null);
  const verticalRef = useRef<ScrollView | null>(null);
  const chatScrollRef = useRef<ScrollView | null>(null);
  const centeredRef = useRef(false);

  const selectedLot = useMemo(
    () => lots.find((item) => item.id === selectedLotId) ?? null,
    [lots, selectedLotId]
  );

  const cars = useMemo<MovingCar[]>(() => {
    const colors = ["#ef4444", "#3b82f6", "#facc15", "#1f2937", "#ffffff", "#f97316"];
    const list: MovingCar[] = [];

    ROAD_ROUTES.forEach((route) => {
      const count = 5 + Math.floor(Math.random() * 4);
      for (let idx = 0; idx < count; idx += 1) {
        list.push({
          id: `${route.id}-${idx}`,
          routeId: route.id,
          color: colors[Math.floor(Math.random() * colors.length)],
          speed: 0.015 + Math.random() * 0.02,
          delay: Math.random(),
          direction: Math.random() > 0.5 ? 1 : -1,
        });
      }
    });

    return list;
  }, []);

  const mapWidthScaled = MAP_WIDTH * scale;
  const mapHeightScaled = MAP_HEIGHT * scale;

  useEffect(() => {
    const timer = setInterval(() => setClockMs(Date.now()), 33);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (centeredRef.current) return;

    const timer = setTimeout(() => {
      const x = Math.max(0, mapWidthScaled / 2 - windowWidth / 2);
      const y = Math.max(0, mapHeightScaled / 2 - windowHeight / 2);
      horizontalRef.current?.scrollTo({ x, animated: false });
      verticalRef.current?.scrollTo({ y, animated: false });
      centeredRef.current = true;
    }, 40);

    return () => clearTimeout(timer);
  }, [mapHeightScaled, mapWidthScaled, windowHeight, windowWidth]);

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

    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 40);
  };

  const lotScale = Math.max(0.45, scale * 0.95);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.mapHeader}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.headerCircle} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <View style={styles.mapPill}>
            <Ionicons name="earth" size={14} color="#16a34a" />
            <Text style={styles.mapPillText}>Town Map</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.headerDarkCircle}>
            <Ionicons name="location-outline" size={17} color="#fff" />
          </View>
          <View style={styles.headerDarkCircle}>
            <Ionicons name="person-outline" size={17} color="#fff" />
          </View>
        </View>
      </View>

      <View style={styles.zoomWrap}>
        <Pressable style={styles.zoomBtn} onPress={() => setScale((v) => Math.min(v + 0.15, 1.4))}>
          <Ionicons name="add" size={20} color="#374151" />
        </Pressable>
        <Pressable style={styles.zoomBtn} onPress={() => setScale((v) => Math.max(v - 0.15, 0.22))}>
          <Ionicons name="remove" size={20} color="#374151" />
        </Pressable>
      </View>

      <ScrollView horizontal style={styles.outerScroll} ref={horizontalRef}>
        <ScrollView style={styles.innerScroll} ref={verticalRef}>
          <View style={[styles.mapCanvas, { width: mapWidthScaled, height: mapHeightScaled }]}>
            <Svg
              width={mapWidthScaled}
              height={mapHeightScaled}
              viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
              preserveAspectRatio="none"
              style={StyleSheet.absoluteFill}
            >
              <Rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="#7ec850" />

              <Path
                d="M-200,1100 C400,800 800,1400 1200,1300 S1800,900 2800,1100"
                stroke="#a5f3fc"
                strokeWidth={450}
                fill="none"
                strokeLinecap="round"
              />
              <Path
                d="M-200,1100 C400,800 800,1400 1200,1300 S1800,900 2800,1100"
                stroke="#38bdf8"
                strokeWidth={300}
                fill="none"
                strokeLinecap="round"
                opacity={0.92}
              />

              <Rect x={550} y={900} width={100} height={600} fill="#cbd5e1" />
              <Rect x={1750} y={950} width={100} height={500} fill="#cbd5e1" />

              {ROAD_ROUTES.map((route) => (
                <Path
                  key={`road-${route.id}`}
                  d={route.svgPath}
                  stroke="#555"
                  strokeWidth={60}
                  strokeLinecap="round"
                  fill="none"
                />
              ))}

              {ROAD_ROUTES.map((route) => (
                <Path
                  key={`road-stripe-${route.id}`}
                  d={route.svgPath}
                  stroke="#fff"
                  strokeWidth={2.2}
                  strokeDasharray="16 18"
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.62}
                />
              ))}
            </Svg>

            {cars.map((car) => {
              const route = ROAD_ROUTES.find((item) => item.id === car.routeId)!;
              const elapsed = (clockMs / 1000) * car.speed + car.delay;
              const baseProgress = ((elapsed % 1) + 1) % 1;
              const t = car.direction === 1 ? baseProgress : 1 - baseProgress;
              const point = routePoint(route, t);
              const angle = car.direction === 1 ? point.angle : point.angle + 180;

              return (
                <View
                  key={car.id}
                  pointerEvents="none"
                  style={[
                    styles.carWrap,
                    {
                      left: point.x * scale,
                      top: point.y * scale,
                      transform: [
                        { translateX: -6 },
                        { translateY: -4 },
                        { rotate: `${angle}deg` },
                        { scale: Math.max(0.6, scale) },
                      ],
                    },
                  ]}
                >
                  <View style={[styles.carBody, { backgroundColor: car.color }]}>
                    <View style={styles.carGlass} />
                    <View style={styles.wheelLeft} />
                    <View style={styles.wheelRight} />
                  </View>
                </View>
              );
            })}

            {trees.map((tree, idx) => (
              <View
                key={`tree-${idx}`}
                style={[
                  styles.treeWrap,
                  {
                    left: tree.x * scale,
                    top: tree.y * scale,
                    transform: [{ scale: tree.scale * scale }],
                  },
                ]}
              >
                <View style={styles.treeLeaf} />
                <View style={styles.treeTrunk} />
                <View style={styles.treeShadow} />
              </View>
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

                  <HouseNode type={lot.visualType} selected={selected} scale={lotScale} />
                </Pressable>
              );
            })}

            <View style={[styles.myHomeMarker, { left: 2000 * scale, top: 1800 * scale }]}>
              <View style={styles.myHomePill}>
                <Ionicons name="home" size={10} color="#3b82f6" />
                <Text style={styles.myHomeText}>My Home</Text>
              </View>
              <HouseNode type="brown-manor" selected={false} scale={lotScale} />
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

      <Modal
        visible={isChatOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsChatOpen(false)}
      >
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
              <Pressable
                style={styles.headerCircleWhite}
                onPress={() => setIsChatOpen(false)}
              >
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
                  style={[
                    styles.chatRow,
                    msg.role === "user" ? styles.chatRowMe : styles.chatRowBot,
                  ]}
                >
                  <View
                    style={[
                      styles.chatBubble,
                      msg.role === "user"
                        ? styles.chatBubbleMe
                        : styles.chatBubbleBot,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.28)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
  },
  headerDarkCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  mapPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.93)",
  },
  mapPillText: {
    fontSize: 13,
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
  carWrap: {
    position: "absolute",
    zIndex: 12,
  },
  carBody: {
    width: 12,
    height: 8,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.15)",
  },
  carGlass: {
    position: "absolute",
    left: 2,
    right: 2,
    top: 1,
    height: 3,
    borderRadius: 1,
    backgroundColor: "rgba(147,197,253,0.6)",
  },
  wheelLeft: {
    position: "absolute",
    left: -1,
    bottom: -1,
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#111827",
  },
  wheelRight: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#111827",
  },
  treeWrap: {
    position: "absolute",
    alignItems: "center",
    zIndex: 8,
  },
  treeLeaf: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#23aa46",
    marginBottom: -12,
  },
  treeTrunk: {
    width: 10,
    height: 20,
    borderRadius: 3,
    backgroundColor: "#8a5a44",
  },
  treeShadow: {
    width: 30,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.15)",
    marginTop: 2,
  },
  lotWrap: {
    position: "absolute",
    alignItems: "center",
    zIndex: 14,
  },
  labelPill: {
    position: "absolute",
    bottom: 46,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  labelPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#111827",
  },
  avatarBubble: {
    position: "absolute",
    bottom: 46,
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
  houseWindow: {
    position: "absolute",
    top: 5,
    right: 4,
    width: 6,
    height: 6,
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    backgroundColor: "#bae6fd",
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
    zIndex: 15,
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
    zIndex: 20,
  },
  visitBtn: {
    minHeight: 46,
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
