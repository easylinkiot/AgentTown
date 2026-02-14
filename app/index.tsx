import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  PanResponder,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { ChatListItem } from "@/src/components/ChatListItem";
import { TaskWidget } from "@/src/components/TaskWidget";
import { TownHouseNode } from "@/src/components/TownHouseNode";
import { CHAT_DATA } from "@/src/constants/chat";
import {
  coastAreaPathForSvg,
  coastPathForSvg,
  getRectAroundPoint,
  getWorldContentInRect,
  HOME_POSITION,
  MOUNTAIN_PEAKS,
  mapMyHouseTypeToVisual,
  RIVER_WIDTH,
  ROAD_ROUTES,
  riverPathForSvg,
  routePoint,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "@/src/features/townmap/world";
import { useAgentTown } from "@/src/state/agenttown-context";

interface MovingCar {
  id: string;
  routeId: string;
  color: string;
  speed: number;
  delay: number;
  direction: 1 | -1;
}

const SCENE_SCALE = 0.2;
const MAP_VERTICAL_LIFT_RATIO = 0.15;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function HomeScreen() {
  const router = useRouter();
  const { botConfig, tasks, myHouseType } = useAgentTown();
  const { height: windowHeight } = useWindowDimensions();
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [sceneSize, setSceneSize] = useState({ width: 360, height: 360 });
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  const chatSheetHeight = Math.max(320, Math.round(windowHeight * 0.5));
  const chatSheetPeek = 68;
  const maxSheetTranslate = Math.max(0, chatSheetHeight - chatSheetPeek);
  const chatSheetTranslateY = useRef(new Animated.Value(0)).current;
  const chatSheetDragStart = useRef(0);

  const routeLookup = useMemo(
    () => new Map(ROAD_ROUTES.map((route) => [route.id, route])),
    []
  );

  const sceneCars = useMemo<MovingCar[]>(() => {
    const colors = ["#ef4444", "#3b82f6", "#facc15", "#1f2937", "#ffffff", "#f97316"];
    const list: MovingCar[] = [];

    ROAD_ROUTES.forEach((route, routeIndex) => {
      const count = route.type === "line" ? 3 : 4;
      for (let index = 0; index < count; index += 1) {
        const serial = routeIndex * 37 + index * 19;
        list.push({
          id: `home_${route.id}_${index}`,
          routeId: route.id,
          color: colors[serial % colors.length],
          speed: 0.008 + (serial % 5) * 0.002,
          delay: (serial % 100) / 100,
          direction: index % 2 === 0 ? 1 : -1,
        });
      }
    });

    return list;
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setClockMs(Date.now()), 33);
    return () => clearInterval(timer);
  }, []);

  const worldRect = useMemo(
    () =>
      getRectAroundPoint(
        HOME_POSITION.x,
        HOME_POSITION.y,
        sceneSize.width / SCENE_SCALE,
        sceneSize.height / SCENE_SCALE
      ),
    [sceneSize.height, sceneSize.width]
  );

  const sceneContent = useMemo(
    () => getWorldContentInRect(worldRect, 180),
    [worldRect]
  );

  const nearbyLots = useMemo(() => {
    return [...sceneContent.lots]
      .sort(
        (a, b) =>
          Math.hypot(a.x - HOME_POSITION.x, a.y - HOME_POSITION.y) -
          Math.hypot(b.x - HOME_POSITION.x, b.y - HOME_POSITION.y)
      )
      .slice(0, 18);
  }, [sceneContent.lots]);

  const nearbyTrees = useMemo(() => {
    return [...sceneContent.trees]
      .sort(
        (a, b) =>
          Math.hypot(a.x - HOME_POSITION.x, a.y - HOME_POSITION.y) -
          Math.hypot(b.x - HOME_POSITION.x, b.y - HOME_POSITION.y)
      )
      .slice(0, 36);
  }, [sceneContent.trees]);

  const worldOffset = useMemo(
    () => ({
      left: -worldRect.minX * SCENE_SCALE,
      top: -worldRect.minY * SCENE_SCALE,
      width: WORLD_WIDTH * SCENE_SCALE,
      height: WORLD_HEIGHT * SCENE_SCALE,
    }),
    [worldRect.minX, worldRect.minY]
  );

  const worldLayerStyle = useMemo(() => {
    const lift = Math.min(130, Math.round(sceneSize.height * MAP_VERTICAL_LIFT_RATIO));
    return {
      ...worldOffset,
      top: worldOffset.top - lift,
    };
  }, [sceneSize.height, worldOffset]);

  const homeAnchor = useMemo(
    () => ({
      x: sceneSize.width / 2,
      y: Math.max(106, sceneSize.height * 0.27),
    }),
    [sceneSize.height, sceneSize.width]
  );

  const taskWidgetBottom = useMemo(() => {
    const desiredBottom = isChatCollapsed ? chatSheetPeek + 18 : chatSheetHeight + 16;
    const maxBottomInsideScene = Math.max(94, sceneSize.height - 210);
    return Math.min(desiredBottom, maxBottomInsideScene);
  }, [chatSheetHeight, chatSheetPeek, isChatCollapsed, sceneSize.height]);

  const taskWidgetOverlayStyle = useMemo(
    () => ({
      right: 14,
      bottom: taskWidgetBottom,
      zIndex: 12,
    }),
    [taskWidgetBottom]
  );

  const animateChatSheet = useCallback(
    (collapsed: boolean) => {
      Animated.spring(chatSheetTranslateY, {
        toValue: collapsed ? maxSheetTranslate : 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 180,
        mass: 0.8,
      }).start();
    },
    [chatSheetTranslateY, maxSheetTranslate]
  );

  useEffect(() => {
    animateChatSheet(isChatCollapsed);
  }, [animateChatSheet, isChatCollapsed]);

  useEffect(() => {
    chatSheetTranslateY.stopAnimation((value) => {
      chatSheetTranslateY.setValue(clamp(value, 0, maxSheetTranslate));
    });
  }, [chatSheetTranslateY, maxSheetTranslate]);

  const chatSheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.15,
        onPanResponderGrant: () => {
          chatSheetTranslateY.stopAnimation((value) => {
            chatSheetDragStart.current = value;
          });
        },
        onPanResponderMove: (_, gesture) => {
          const next = clamp(chatSheetDragStart.current + gesture.dy, 0, maxSheetTranslate);
          chatSheetTranslateY.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dy) < 8 && Math.abs(gesture.vy) < 0.14) {
            return;
          }
          const next = clamp(chatSheetDragStart.current + gesture.dy, 0, maxSheetTranslate);
          const shouldCollapse = gesture.vy > 0.35 || next > maxSheetTranslate * 0.45;
          setIsChatCollapsed(shouldCollapse);
        },
      }),
    [chatSheetTranslateY, maxSheetTranslate]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topSection}>
        <View
          style={styles.townBg}
          onLayout={(event) => {
            const nextWidth = event.nativeEvent.layout.width;
            const nextHeight = event.nativeEvent.layout.height;
            if (nextWidth > 0 && nextHeight > 0) {
              setSceneSize((prev) => {
                if (
                  Math.abs(prev.width - nextWidth) < 1 &&
                  Math.abs(prev.height - nextHeight) < 1
                ) {
                  return prev;
                }
                return { width: nextWidth, height: nextHeight };
              });
            }
          }}
        >
          <View style={[styles.sceneWorldLayer, worldLayerStyle]}>
            <Svg
              width={worldLayerStyle.width}
              height={worldLayerStyle.height}
              viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
              preserveAspectRatio="none"
              style={StyleSheet.absoluteFill}
            >
              <Rect x={0} y={0} width={WORLD_WIDTH} height={WORLD_HEIGHT} fill="#7ec850" />
              <Path d={coastAreaPathForSvg()} fill="#38bdf8" opacity={0.96} />
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
                  key={`home_mountain_${index}`}
                  cx={peak.x}
                  cy={peak.y}
                  r={peak.radius}
                  fill="rgba(100,116,139,0.22)"
                />
              ))}
              {MOUNTAIN_PEAKS.map((peak, index) => (
                <Circle
                  key={`home_mountain_inner_${index}`}
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
                  key={`home_road_${route.id}`}
                  d={route.svgPath}
                  stroke="#555"
                  strokeWidth={58}
                  strokeLinecap="round"
                  fill="none"
                />
              ))}

              {ROAD_ROUTES.map((route) => (
                <Path
                  key={`home_stripe_${route.id}`}
                  d={route.svgPath}
                  stroke="#fff"
                  strokeWidth={2.3}
                  strokeDasharray="17 18"
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.62}
                />
              ))}
            </Svg>

            {sceneCars.map((car) => {
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
                      left: point.x * SCENE_SCALE,
                      top: point.y * SCENE_SCALE,
                      transform: [
                        { translateX: -5 },
                        { translateY: -4 },
                        { rotate: `${angle}deg` },
                        { scale: 0.92 },
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

            {nearbyTrees.map((tree, index) => (
              <View
                key={`home_tree_${index}_${Math.round(tree.x)}_${Math.round(tree.y)}`}
                style={[
                  styles.treeWrap,
                  {
                    left: tree.x * SCENE_SCALE,
                    top: tree.y * SCENE_SCALE,
                    transform: [{ scale: 0.7 + tree.scale * 0.16 }],
                  },
                ]}
                pointerEvents="none"
              >
                <View style={styles.treeLeaf} />
                <View style={styles.treeTrunk} />
                <View style={styles.treeShadow} />
              </View>
            ))}

            {nearbyLots.map((lot) => (
              <Pressable
                key={lot.id}
                style={[
                  styles.sceneLotWrap,
                  {
                    left: lot.x * SCENE_SCALE,
                    top: lot.y * SCENE_SCALE,
                  },
                ]}
                onPress={() => router.push("/town-map")}
              >
                <TownHouseNode type={lot.visualType} scale={0.92} />
              </Pressable>
            ))}
          </View>

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

          <View style={styles.previewMeta}>
            <Text style={styles.previewMetaText}>Home Neighborhood Sync</Text>
            <Text style={styles.previewMetaSub}>{`${Math.round(worldRect.minX)}-${Math.round(worldRect.maxX)} · ${Math.round(worldRect.minY)}-${Math.round(worldRect.maxY)}`}</Text>
          </View>

          <View
            style={[
              styles.centerHomeWrap,
              {
                left: clamp(homeAnchor.x - 56, 20, Math.max(20, sceneSize.width - 116)),
                top: clamp(homeAnchor.y - 58, 88, Math.max(88, sceneSize.height * 0.5 - 130)),
              },
            ]}
          >
            <Pressable style={styles.homePill} onPress={() => router.push("/living-room")}>
              <Ionicons name="home-outline" size={12} color="#3b82f6" />
              <Text style={styles.homePillText}>My Home</Text>
            </Pressable>
            <TownHouseNode type={mapMyHouseTypeToVisual(myHouseType)} scale={1.35} />
          </View>

          <Pressable
            style={[
              styles.avatarMarker,
              {
                left: clamp(homeAnchor.x - 22, 18, Math.max(18, sceneSize.width - 58)),
                top: clamp(homeAnchor.y + 22, 88, Math.max(88, sceneSize.height * 0.5 - 58)),
              },
            ]}
            onPress={() => router.push({ pathname: "/chat/[id]", params: { id: "mybot" } })}
          >
            <Image source={{ uri: botConfig.avatar }} style={styles.markerAvatar} />
            <View style={styles.onlineDotMarker} />
          </Pressable>

          <TaskWidget tasks={tasks} containerStyle={taskWidgetOverlayStyle} />
        </View>
      </View>

      <Animated.View
        style={[
          styles.chatSheet,
          {
            height: chatSheetHeight,
            transform: [{ translateY: chatSheetTranslateY }],
          },
        ]}
      >
        <Pressable
          style={styles.chatSheetHeader}
          onPress={() => setIsChatCollapsed((prev) => !prev)}
          {...chatSheetPanResponder.panHandlers}
        >
          <View style={styles.chatHandle} />
          <Text style={styles.chatHeaderTitle}>
            {isChatCollapsed ? `Chats (${CHAT_DATA.length})` : "Chats"}
          </Text>
          <Ionicons
            name={isChatCollapsed ? "chevron-up" : "chevron-down"}
            size={18}
            color="#64748b"
          />
        </Pressable>

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
          contentContainerStyle={styles.chatListContent}
        />
      </Animated.View>

      <Pressable style={styles.fab}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#7ec850",
  },
  topSection: {
    flex: 1,
  },
  townBg: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#7ec850",
  },
  sceneWorldLayer: {
    position: "absolute",
  },
  topBar: {
    position: "absolute",
    top: 12,
    left: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 30,
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
  previewMeta: {
    position: "absolute",
    left: 14,
    top: 70,
    zIndex: 20,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: "rgba(15,23,42,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  previewMetaText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#f8fafc",
  },
  previewMetaSub: {
    marginTop: 1,
    fontSize: 9,
    color: "#e2e8f0",
  },
  carWrap: {
    position: "absolute",
    zIndex: 2,
  },
  carBody: {
    width: 10,
    height: 7,
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
  sceneLotWrap: {
    position: "absolute",
    zIndex: 3,
    alignItems: "center",
  },
  centerHomeWrap: {
    position: "absolute",
    zIndex: 8,
    alignItems: "center",
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
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "white",
    overflow: "hidden",
    zIndex: 9,
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
  chatSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    elevation: 40,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: "rgba(255,255,255,0.88)",
    overflow: "hidden",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.6)",
  },
  chatSheetHeader: {
    position: "relative",
    zIndex: 2,
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  chatHandle: {
    width: 40,
    height: 5,
    borderRadius: 99,
    alignSelf: "center",
    backgroundColor: "#9ca3af",
  },
  chatHeaderTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  chatListContent: {
    paddingBottom: 80,
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 26,
    zIndex: 90,
    elevation: 90,
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
