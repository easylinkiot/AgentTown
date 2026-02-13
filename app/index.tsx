import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
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
  LOT_VIEW_LABELS,
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const VIEW_TAG_COLORS: Record<string, string> = {
  "sea-view": "rgba(37,99,235,0.16)",
  "river-view": "rgba(14,116,144,0.16)",
  "mountain-view": "rgba(100,116,139,0.2)",
  "park-view": "rgba(22,163,74,0.16)",
  "city-view": "rgba(30,41,59,0.14)",
};

export default function HomeScreen() {
  const router = useRouter();
  const { botConfig, tasks, myHouseType } = useAgentTown();
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [sceneSize, setSceneSize] = useState({ width: 360, height: 360 });

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

  const homeLocal = useMemo(
    () => ({
      x: HOME_POSITION.x * SCENE_SCALE + worldOffset.left,
      y: HOME_POSITION.y * SCENE_SCALE + worldOffset.top,
    }),
    [worldOffset.left, worldOffset.top]
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
          <View style={[styles.sceneWorldLayer, worldOffset]}>
            <Svg
              width={worldOffset.width}
              height={worldOffset.height}
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
                {!lot.isMarket ? (
                  <View
                    style={[
                      styles.sceneViewTag,
                      { backgroundColor: VIEW_TAG_COLORS[lot.viewTag] ?? "rgba(0,0,0,0.12)" },
                    ]}
                  >
                    <Text style={styles.sceneViewTagText}>{LOT_VIEW_LABELS[lot.viewTag]}</Text>
                  </View>
                ) : null}
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
                left: clamp(homeLocal.x - 28, 24, Math.max(24, sceneSize.width - 120)),
                top: clamp(homeLocal.y - 58, 90, Math.max(90, sceneSize.height - 140)),
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
                left: clamp(homeLocal.x + 10, 18, Math.max(18, sceneSize.width - 58)),
                top: clamp(homeLocal.y - 2, 88, Math.max(88, sceneSize.height - 58)),
              },
            ]}
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
  sceneWorldLayer: {
    position: "absolute",
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
  previewMeta: {
    position: "absolute",
    left: 14,
    top: 66,
    zIndex: 7,
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
  sceneViewTag: {
    position: "absolute",
    bottom: 42,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
  },
  sceneViewTagText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#0f172a",
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
