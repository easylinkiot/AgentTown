import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import Svg, { Circle, Path, Rect } from "react-native-svg";

import {
  CHUNK_SIZE,
  chunkForWorldPoint,
  coastAreaPathForSvg,
  coastPathForSvg,
  getChunksInRange,
  getVisibleChunkRange,
  HOME_POSITION,
  LotData,
  MOUNTAIN_PEAKS,
  mapMyHouseTypeToVisual,
  RIVER_WIDTH,
  ROAD_ROUTES,
  riverPathForSvg,
  routePoint,
  WORLD_CHUNKS_X,
  WORLD_CHUNKS_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "@/src/features/townmap/world";
import { TownHouseNode } from "@/src/components/TownHouseNode";
import { generateGeminiText } from "@/src/lib/gemini";
import { useAgentTown } from "@/src/state/agenttown-context";

interface TownMapMessage {
  role: "user" | "model";
  text: string;
}

interface MovingCar {
  id: string;
  routeId: string;
  color: string;
  speed: number;
  delay: number;
  direction: 1 | -1;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function TownMapScreen() {
  const router = useRouter();
  const { myHouseType } = useAgentTown();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [selectedLot, setSelectedLot] = useState<LotData | null>(null);
  const [scale, setScale] = useState(0.48);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<TownMapMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [clockMs, setClockMs] = useState(() => Date.now());

  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  const scrollXRef = useRef(0);
  const scrollYRef = useRef(0);

  const horizontalRef = useRef<ScrollView | null>(null);
  const verticalRef = useRef<ScrollView | null>(null);
  const chatScrollRef = useRef<ScrollView | null>(null);
  const centeredRef = useRef(false);

  const mapWidthScaled = WORLD_WIDTH * scale;
  const mapHeightScaled = WORLD_HEIGHT * scale;

  const visibleRange = useMemo(
    () =>
      getVisibleChunkRange({
        scrollX,
        scrollY,
        viewportWidth: windowWidth,
        viewportHeight: windowHeight,
        scale,
        overscan: 1,
      }),
    [scrollX, scrollY, scale, windowWidth, windowHeight]
  );

  const visibleChunks = useMemo(
    () => getChunksInRange(visibleRange),
    [visibleRange]
  );

  const visibleLots = useMemo(
    () => visibleChunks.flatMap((chunk) => chunk.lots),
    [visibleChunks]
  );

  const visibleTrees = useMemo(
    () => visibleChunks.flatMap((chunk) => chunk.trees),
    [visibleChunks]
  );

  const routeLookup = useMemo(
    () => new Map(ROAD_ROUTES.map((route) => [route.id, route])),
    []
  );

  const cars = useMemo<MovingCar[]>(() => {
    const colors = [
      "#ef4444",
      "#3b82f6",
      "#facc15",
      "#1f2937",
      "#ffffff",
      "#f97316",
      "#14b8a6",
    ];

    const result: MovingCar[] = [];

    ROAD_ROUTES.forEach((route, routeIndex) => {
      const count = route.type === "line" ? 7 : 9;
      for (let index = 0; index < count; index += 1) {
        const serial = routeIndex * 97 + index * 31;
        result.push({
          id: `${route.id}_${index}`,
          routeId: route.id,
          color: colors[serial % colors.length],
          speed: 0.008 + (serial % 7) * 0.002,
          delay: (serial % 100) / 100,
          direction: index % 2 === 0 ? 1 : -1,
        });
      }
    });

    return result;
  }, []);

  const centerOnHome = useCallback(
    (animated: boolean) => {
      const maxX = Math.max(0, mapWidthScaled - windowWidth);
      const maxY = Math.max(0, mapHeightScaled - windowHeight);
      const x = clamp(HOME_POSITION.x * scale - windowWidth / 2, 0, maxX);
      const y = clamp(HOME_POSITION.y * scale - windowHeight / 2, 0, maxY);

      horizontalRef.current?.scrollTo({ x, animated });
      verticalRef.current?.scrollTo({ y, animated });
      scrollXRef.current = x;
      scrollYRef.current = y;
      setScrollX(x);
      setScrollY(y);
    },
    [mapHeightScaled, mapWidthScaled, scale, windowHeight, windowWidth]
  );

  useEffect(() => {
    const timer = setInterval(() => setClockMs(Date.now()), 33);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (centeredRef.current) return;

    const timer = setTimeout(() => {
      centerOnHome(false);
      centeredRef.current = true;
    }, 40);

    return () => clearTimeout(timer);
  }, [centerOnHome]);

  useEffect(() => {
    if (!selectedLot) return;
    const stillVisible = visibleLots.some((lot) => lot.id === selectedLot.id);
    if (!stillVisible) {
      setSelectedLot(null);
    }
  }, [selectedLot, visibleLots]);

  const applyZoom = (delta: number) => {
    const nextScale = clamp(scale + delta, 0.22, 1.35);
    if (Math.abs(nextScale - scale) < 0.001) return;

    const worldCenterX = (scrollXRef.current + windowWidth / 2) / scale;
    const worldCenterY = (scrollYRef.current + windowHeight / 2) / scale;

    const nextMaxX = Math.max(0, WORLD_WIDTH * nextScale - windowWidth);
    const nextMaxY = Math.max(0, WORLD_HEIGHT * nextScale - windowHeight);

    const nextX = clamp(worldCenterX * nextScale - windowWidth / 2, 0, nextMaxX);
    const nextY = clamp(worldCenterY * nextScale - windowHeight / 2, 0, nextMaxY);

    setScale(nextScale);

    setTimeout(() => {
      horizontalRef.current?.scrollTo({ x: nextX, animated: false });
      verticalRef.current?.scrollTo({ y: nextY, animated: false });
      scrollXRef.current = nextX;
      scrollYRef.current = nextY;
      setScrollX(nextX);
      setScrollY(nextY);
    }, 24);
  };

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

  const lotScale = Math.max(0.5, Math.min(1.05, scale * 0.95));

  const centerWorldX = (scrollX + windowWidth / 2) / scale;
  const centerWorldY = (scrollY + windowHeight / 2) / scale;
  const centerChunk = chunkForWorldPoint(centerWorldX, centerWorldY);

  const miniSize = 132;
  const miniViewport = {
    left: clamp((scrollX / scale / WORLD_WIDTH) * miniSize, 0, miniSize),
    top: clamp((scrollY / scale / WORLD_HEIGHT) * miniSize, 0, miniSize),
    width: clamp((windowWidth / scale / WORLD_WIDTH) * miniSize, 8, miniSize),
    height: clamp((windowHeight / scale / WORLD_HEIGHT) * miniSize, 8, miniSize),
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.mapHeader}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.headerCircle} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <View style={styles.mapPill}>
            <Ionicons name="earth" size={14} color="#16a34a" />
            <Text style={styles.mapPillText}>Town World</Text>
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

      <View style={styles.worldStatus}>
        <Text style={styles.worldStatusTitle}>No-Engine World Mode</Text>
        <Text style={styles.worldStatusText}>
          {`Loaded ${visibleChunks.length} chunks · Center C${centerChunk.chunkX + 1}-${centerChunk.chunkY + 1} · Zoom ${Math.round(scale * 100)}%`}
        </Text>
        <Text style={styles.worldStatusTextMinor}>
          {`可见房源: ${visibleLots.length}`}
        </Text>
      </View>

      <View style={styles.zoomWrap}>
        <Pressable style={styles.zoomBtn} onPress={() => applyZoom(0.14)}>
          <Ionicons name="add" size={20} color="#374151" />
        </Pressable>
        <Pressable style={styles.zoomBtn} onPress={() => applyZoom(-0.14)}>
          <Ionicons name="remove" size={20} color="#374151" />
        </Pressable>
        <Pressable style={styles.zoomBtn} onPress={() => centerOnHome(true)}>
          <Ionicons name="navigate" size={18} color="#374151" />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        style={styles.outerScroll}
        ref={horizontalRef}
        onScroll={(event) => {
          const next = event.nativeEvent.contentOffset.x;
          setScrollX(next);
          scrollXRef.current = next;
        }}
        scrollEventThrottle={16}
      >
        <ScrollView
          style={styles.innerScroll}
          ref={verticalRef}
          onScroll={(event) => {
            const next = event.nativeEvent.contentOffset.y;
            setScrollY(next);
            scrollYRef.current = next;
          }}
          scrollEventThrottle={16}
        >
          <View style={[styles.mapCanvas, { width: mapWidthScaled, height: mapHeightScaled }]}>
            <Svg
              width={mapWidthScaled}
              height={mapHeightScaled}
              viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
              preserveAspectRatio="none"
              style={StyleSheet.absoluteFill}
            >
              <Rect x={0} y={0} width={WORLD_WIDTH} height={WORLD_HEIGHT} fill="#7ec850" />
              <Path d={coastAreaPathForSvg()} fill="#38bdf8" opacity={0.95} />
              <Path
                d={coastPathForSvg()}
                stroke="#bae6fd"
                strokeWidth={96}
                fill="none"
                strokeLinecap="round"
                opacity={0.75}
              />

              {MOUNTAIN_PEAKS.map((peak, index) => (
                <Circle
                  key={`mountain_outer_${index}`}
                  cx={peak.x}
                  cy={peak.y}
                  r={peak.radius}
                  fill="rgba(100,116,139,0.22)"
                />
              ))}
              {MOUNTAIN_PEAKS.map((peak, index) => (
                <Circle
                  key={`mountain_inner_${index}`}
                  cx={peak.x}
                  cy={peak.y}
                  r={peak.radius * 0.62}
                  fill="rgba(71,85,105,0.18)"
                />
              ))}

              <Path
                d={riverPathForSvg()}
                stroke="#a5f3fc"
                strokeWidth={RIVER_WIDTH + 80}
                fill="none"
                strokeLinecap="round"
                opacity={0.95}
              />
              <Path
                d={riverPathForSvg()}
                stroke="#38bdf8"
                strokeWidth={RIVER_WIDTH}
                fill="none"
                strokeLinecap="round"
                opacity={0.92}
              />

              {ROAD_ROUTES.map((route) => (
                <Path
                  key={`road_${route.id}`}
                  d={route.svgPath}
                  stroke="#555"
                  strokeWidth={58}
                  strokeLinecap="round"
                  fill="none"
                />
              ))}

              {ROAD_ROUTES.map((route) => (
                <Path
                  key={`road_stripe_${route.id}`}
                  d={route.svgPath}
                  stroke="#ffffff"
                  strokeWidth={2.3}
                  strokeDasharray="17 18"
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.62}
                />
              ))}

              {Array.from({ length: WORLD_CHUNKS_X + 1 }).map((_, index) => {
                const x = index * CHUNK_SIZE;
                return (
                  <Path
                    key={`grid_x_${index}`}
                    d={`M ${x} 0 L ${x} ${WORLD_HEIGHT}`}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={2}
                  />
                );
              })}

              {Array.from({ length: WORLD_CHUNKS_Y + 1 }).map((_, index) => {
                const y = index * CHUNK_SIZE;
                return (
                  <Path
                    key={`grid_y_${index}`}
                    d={`M 0 ${y} L ${WORLD_WIDTH} ${y}`}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={2}
                  />
                );
              })}
            </Svg>

            {cars.map((car) => {
              const route = routeLookup.get(car.routeId);
              if (!route) return null;

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

            {visibleTrees.map((tree, index) => (
              <View
                key={`tree_${index}_${Math.round(tree.x)}_${Math.round(tree.y)}`}
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

            {visibleLots.map((lot) => {
              const selected = lot.id === selectedLot?.id;
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
                  onPress={() => setSelectedLot(lot)}
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
                    <>
                      <View style={styles.labelPill}>
                        <Text style={styles.labelPillText}>{lot.label}</Text>
                      </View>
                    </>
                  ) : null}

                  <TownHouseNode type={lot.visualType} selected={selected} scale={lotScale} />
                </Pressable>
              );
            })}

            <View
              style={[
                styles.myHomeMarker,
                { left: HOME_POSITION.x * scale, top: HOME_POSITION.y * scale },
              ]}
            >
              <View style={styles.myHomePill}>
                <Ionicons name="home" size={10} color="#3b82f6" />
                <Text style={styles.myHomeText}>My Home</Text>
              </View>
              <TownHouseNode
                type={mapMyHouseTypeToVisual(myHouseType)}
                selected={false}
                scale={lotScale}
              />
            </View>
          </View>
        </ScrollView>
      </ScrollView>

      <View style={styles.miniMapWrap} pointerEvents="none">
        <View style={styles.miniMapCard}>
          <View style={[styles.miniMap, { width: miniSize, height: miniSize }]}>
            {visibleChunks.map((chunk) => {
              const chunkWidth = miniSize / WORLD_CHUNKS_X;
              const chunkHeight = miniSize / WORLD_CHUNKS_Y;
              return (
                <View
                  key={`mini_chunk_${chunk.key}`}
                  style={[
                    styles.miniChunk,
                    {
                      left: chunk.chunkX * chunkWidth,
                      top: chunk.chunkY * chunkHeight,
                      width: chunkWidth,
                      height: chunkHeight,
                    },
                  ]}
                />
              );
            })}

            <View
              style={[
                styles.miniViewport,
                {
                  left: miniViewport.left,
                  top: miniViewport.top,
                  width: miniViewport.width,
                  height: miniViewport.height,
                },
              ]}
            />

            <View
              style={[
                styles.miniHomeDot,
                {
                  left: (HOME_POSITION.x / WORLD_WIDTH) * miniSize - 3,
                  top: (HOME_POSITION.y / WORLD_HEIGHT) * miniSize - 3,
                },
              ]}
            />
          </View>
          <Text style={styles.miniMapText}>{`${WORLD_WIDTH}x${WORLD_HEIGHT} world`}</Text>
        </View>
      </View>

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
              {chatMessages.map((msg, index) => (
                <View
                  key={`${msg.role}_${index}`}
                  style={[
                    styles.chatRow,
                    msg.role === "user" ? styles.chatRowMe : styles.chatRowBot,
                  ]}
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
  worldStatus: {
    position: "absolute",
    top: 66,
    left: 12,
    right: 12,
    zIndex: 19,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(15, 23, 42, 0.28)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  worldStatusTitle: {
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "800",
  },
  worldStatusText: {
    marginTop: 2,
    color: "#e2e8f0",
    fontSize: 10,
  },
  worldStatusTextMinor: {
    marginTop: 2,
    color: "#cbd5e1",
    fontSize: 10,
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
    bottom: 56,
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
    minWidth: 124,
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
    color: "#475569",
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
  miniMapWrap: {
    position: "absolute",
    right: 12,
    bottom: 150,
    zIndex: 21,
  },
  miniMapCard: {
    borderRadius: 14,
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
  },
  miniMap: {
    borderRadius: 8,
    backgroundColor: "#89ce5f",
    overflow: "hidden",
  },
  miniChunk: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.26)",
    backgroundColor: "rgba(17,24,39,0.08)",
  },
  miniViewport: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  miniHomeDot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ef4444",
  },
  miniMapText: {
    marginTop: 6,
    fontSize: 10,
    color: "#374151",
    fontWeight: "700",
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
