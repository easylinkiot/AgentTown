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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { ChatListItem } from "@/src/components/ChatListItem";
import { AddBotFriendModal } from "@/src/components/AddBotFriendModal";
import { MiniAppDock } from "@/src/components/MiniAppDock";
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
import { tx } from "@/src/i18n/translate";
import { getThemeTokens } from "@/src/theme/ui-theme";
import { useAgentTown } from "@/src/state/agenttown-context";
import { ChatThread } from "@/src/types";

interface MovingCar {
  id: string;
  routeId: string;
  color: string;
  speed: number;
  delay: number;
  direction: 1 | -1;
}

interface InlineAskMessage {
  id: string;
  text: string;
  isMe: boolean;
}

const SCENE_SCALE = 0.2;
const MAP_VERTICAL_LIFT_RATIO = 0.15;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function HomeScreen() {
  const router = useRouter();
  const { botConfig, tasks, myHouseType, uiTheme, language } = useAgentTown();
  const tr = (zh: string, en: string) => tx(language, zh, en);
  const theme = getThemeTokens(uiTheme);
  const isNeo = uiTheme === "neo";
  const { height: windowHeight } = useWindowDimensions();
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [sceneSize, setSceneSize] = useState({ width: 360, height: 360 });
  const [chatSheetMode, setChatSheetMode] = useState<"collapsed" | "normal" | "fullscreen">(
    "normal"
  );
  const [chatThreads, setChatThreads] = useState<ChatThread[]>(CHAT_DATA);
  const [isAddBotModalVisible, setIsAddBotModalVisible] = useState(false);
  const [isInlineAskVisible, setIsInlineAskVisible] = useState(false);
  const [isDockTaskPanelVisible, setIsDockTaskPanelVisible] = useState(false);
  const [inlineAskInput, setInlineAskInput] = useState("");
  const [inlineAskMessages, setInlineAskMessages] = useState<InlineAskMessage[]>(() => [
    {
      id: "welcome",
      text:
        language === "zh"
          ? "你好！我是你的 AI 创业导师。让我们聊聊你的项目吧。"
          : "Hi! I'm your AI startup copilot. Let's talk about your project.",
      isMe: false,
    },
  ]);
  const inlineAskScrollRef = useRef<ScrollView | null>(null);

  const isChatCollapsed = chatSheetMode === "collapsed";
  const isChatFullscreen = chatSheetMode === "fullscreen";

  const chatSheetNormalHeight = isNeo
    ? Math.max(280, Math.round(windowHeight * 0.4))
    : Math.max(320, Math.round(windowHeight * 0.5));
  const chatSheetHeight = Math.max(420, Math.round(windowHeight * 0.9));
  const chatSheetPeek = 68;
  const normalSheetTranslate = Math.max(0, chatSheetHeight - chatSheetNormalHeight);
  const maxSheetTranslate = Math.max(0, chatSheetHeight - chatSheetPeek);
  const chatSheetTranslateY = useRef(new Animated.Value(normalSheetTranslate)).current;
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
    const baseBottom = isChatCollapsed
      ? chatSheetPeek + 18
      : isChatFullscreen
        ? chatSheetHeight + 12
        : chatSheetNormalHeight + 16;
    const shouldReserveAskBarSpace =
      !isNeo && !isInlineAskVisible && !isDockTaskPanelVisible && !isChatFullscreen;
    const askBarBottom = Math.max(
      isChatCollapsed
        ? chatSheetPeek + 14
        : isChatFullscreen
          ? chatSheetHeight + 14
          : chatSheetNormalHeight + 14,
      104
    );
    const askBarTop = askBarBottom + 66;
    const desiredBottom = shouldReserveAskBarSpace
      ? Math.max(baseBottom, askBarTop + 14)
      : baseBottom;
    const maxBottomInsideScene = Math.max(94, sceneSize.height - 210);
    return Math.min(desiredBottom, maxBottomInsideScene);
  }, [
    chatSheetHeight,
    chatSheetNormalHeight,
    chatSheetPeek,
    isChatCollapsed,
    isChatFullscreen,
    isDockTaskPanelVisible,
    isInlineAskVisible,
    isNeo,
    sceneSize.height,
  ]);

  const taskWidgetOverlayStyle = useMemo(
    () => ({
      right: 14,
      bottom: taskWidgetBottom,
      zIndex: 37,
    }),
    [taskWidgetBottom]
  );

  const neoDockTop = useMemo(
    () => Math.max(108, Math.round(sceneSize.height * 0.17)),
    [sceneSize.height]
  );

  const neoAskBottom = useMemo(() => {
    const offset = isChatCollapsed
      ? chatSheetPeek + 14
      : isChatFullscreen
        ? chatSheetHeight + 14
        : chatSheetNormalHeight + 14;
    return Math.max(offset, 104);
  }, [chatSheetHeight, chatSheetNormalHeight, chatSheetPeek, isChatCollapsed, isChatFullscreen]);

  const animateChatSheet = useCallback(
    (mode: "collapsed" | "normal" | "fullscreen") => {
      const toValue =
        mode === "collapsed"
          ? maxSheetTranslate
          : mode === "fullscreen"
            ? 0
            : normalSheetTranslate;
      Animated.spring(chatSheetTranslateY, {
        toValue,
        useNativeDriver: true,
        damping: 18,
        stiffness: 180,
        mass: 0.8,
      }).start();
    },
    [chatSheetTranslateY, maxSheetTranslate, normalSheetTranslate]
  );

  useEffect(() => {
    animateChatSheet(chatSheetMode);
  }, [animateChatSheet, chatSheetMode]);

  useEffect(() => {
    chatSheetTranslateY.stopAnimation((value) => {
      chatSheetTranslateY.setValue(clamp(value, 0, maxSheetTranslate));
    });
  }, [chatSheetTranslateY, maxSheetTranslate]);

  useEffect(() => {
    if (!isInlineAskVisible) return;
    const timer = setTimeout(() => {
      inlineAskScrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [inlineAskMessages, isInlineAskVisible]);

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
          const shouldFullscreen = gesture.vy < -0.35 || next < normalSheetTranslate * 0.62;
          if (shouldFullscreen) {
            setChatSheetMode("fullscreen");
            return;
          }

          const shouldCollapse =
            gesture.vy > 0.35 || next > (normalSheetTranslate + maxSheetTranslate) * 0.5;
          if (shouldCollapse) {
            setChatSheetMode("collapsed");
            return;
          }

          setChatSheetMode("normal");
        },
      }),
    [chatSheetTranslateY, maxSheetTranslate, normalSheetTranslate]
  );

  const openThread = useCallback(
    (chat: ChatThread) => {
      router.push({
        pathname: "/chat/[id]",
        params: {
          id: chat.id,
          name: chat.name,
          avatar: chat.avatar,
          isGroup: chat.isGroup ? "true" : "false",
          memberCount: chat.memberCount ? String(chat.memberCount) : undefined,
          phoneNumber: chat.phoneNumber ?? undefined,
          supportsVideo: chat.supportsVideo === false ? "false" : "true",
        },
      });
    },
    [router]
  );

  const handleAddBotFriend = useCallback((thread: ChatThread) => {
    setChatThreads((prev) => [thread, ...prev]);
  }, []);

  const handleInlineAskSend = useCallback(() => {
    const text = inlineAskInput.trim();
    if (!text) return;

    setInlineAskInput("");
    setInlineAskMessages((prev) => [
      ...prev,
      {
        id: `ask_me_${Date.now()}`,
        text,
        isMe: true,
      },
      {
        id: `ask_bot_${Date.now() + 1}`,
        text:
          language === "zh"
            ? "收到，我会先给你一个可执行的行动计划。"
            : "Got it. I will first give you an actionable plan.",
        isMe: false,
      },
    ]);
  }, [inlineAskInput, language]);

  const askAuxIconColor = isNeo ? "rgba(226,232,240,0.9)" : "#64748b";
  const shouldShowAskBar = !isInlineAskVisible && !isDockTaskPanelVisible && !isChatFullscreen;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.safeArea }]}>
      <View style={styles.topSection}>
        <View
          style={[styles.townBg, { backgroundColor: theme.mapBase }]}
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
          {isNeo ? (
            <>
              <View style={styles.neoDimmer} />
              <View style={styles.neoOverlayTop} />
              <View style={styles.neoOverlayBottom} />
              <View style={styles.neoGlowPurple} />
              <View style={styles.neoGlowBlue} />
              <View style={styles.neoGlowMagenta} />
              <Svg style={styles.neoGrid} width="100%" height="100%" pointerEvents="none">
                {Array.from({ length: 13 }).map((_, idx) => (
                  <Path
                    key={`neo_grid_h_${idx}`}
                    d={`M 0 ${idx * 64} L 1600 ${idx * 64}`}
                    stroke="rgba(255,255,255,0.07)"
                    strokeWidth={1}
                  />
                ))}
                {Array.from({ length: 9 }).map((_, idx) => (
                  <Path
                    key={`neo_grid_v_${idx}`}
                    d={`M ${idx * 64} 0 L ${idx * 64} 1200`}
                    stroke="rgba(255,255,255,0.07)"
                    strokeWidth={1}
                  />
                ))}
              </Svg>
            </>
          ) : null}

          {!isNeo ? (
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
          ) : null}

          <View style={[styles.topBar, isNeo && styles.topBarNeo]}>
            <Pressable
              style={[styles.avatarButton, isNeo && styles.avatarButtonNeo]}
              onPress={() => router.push("/config")}
            >
              <Image source={{ uri: botConfig.avatar }} style={styles.avatar} />
              <View
                style={[
                  styles.onlineDot,
                  isNeo && { borderColor: "rgba(2,6,23,0.9)" },
                ]}
              />
            </Pressable>

            <Pressable
              style={[
                styles.worldButton,
                {
                  backgroundColor: theme.topPillBg,
                  borderColor: theme.topPillBorder,
                },
              ]}
              onPress={() => router.push("/town-map")}
            >
              <Ionicons name="earth" size={16} color={isNeo ? "#f8fafc" : "#16a34a"} />
              <Text
                style={[
                  styles.worldButtonText,
                  isNeo && styles.worldButtonTextNeo,
                  { color: theme.topPillText },
                ]}
              >
                {isNeo
                  ? tr("智界", "AGENT WORLD")
                  : tr("智界", "Agent World")}
              </Text>
            </Pressable>

            <View style={styles.headerRightGroup}>
              <Pressable
                style={[
                  styles.iconCircle,
                  isNeo && styles.iconCircleNeo,
                  { backgroundColor: theme.iconCircleBg },
                ]}
                onPress={() => router.push("/town-map")}
              >
                <Ionicons name="location-outline" size={18} color={theme.iconCircleText} />
              </Pressable>
              <Pressable
                style={[
                  styles.iconCircle,
                  isNeo && styles.iconCircleNeo,
                  { backgroundColor: theme.iconCircleBg },
                ]}
                onPress={() => setIsAddBotModalVisible(true)}
              >
                <Ionicons name="people-outline" size={18} color={theme.iconCircleText} />
              </Pressable>
            </View>
          </View>

          {!isNeo ? (
            <>
              <View
                style={[
                  styles.previewMeta,
                  {
                    backgroundColor: theme.previewCardBg,
                    borderColor: theme.previewCardBorder,
                  },
                ]}
              >
                <Text style={[styles.previewMetaText, { color: theme.previewText }]}>
                  {tr("家周边同步", "Home Neighborhood Sync")}
                </Text>
                <Text style={[styles.previewMetaSub, { color: theme.previewSubtext }]}>
                  {`${Math.round(worldRect.minX)}-${Math.round(worldRect.maxX)} · ${Math.round(worldRect.minY)}-${Math.round(worldRect.maxY)}`}
                </Text>
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
                  <Text style={styles.homePillText}>{tr("我的家", "My Home")}</Text>
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

              <TaskWidget
                tasks={tasks}
                containerStyle={taskWidgetOverlayStyle}
                theme={uiTheme}
                language={language}
              />
            </>
          ) : null}

          <View
            style={[
              styles.neoDockWrap,
              !isNeo ? styles.classicDockWrap : { top: neoDockTop },
              isInlineAskVisible ? styles.neoDockHidden : null,
            ]}
            pointerEvents={isInlineAskVisible ? "none" : "box-none"}
          >
            <MiniAppDock
              accentColor={theme.accent}
              theme={uiTheme}
              language={language}
              tasks={tasks}
              onTaskPanelVisibilityChange={setIsDockTaskPanelVisible}
              onOpenChat={() =>
                router.push({ pathname: "/chat/[id]", params: { id: "mybot" } })
              }
            />
          </View>

          {shouldShowAskBar ? (
            <Pressable
              style={[
                styles.neoAskBar,
                !isNeo && styles.askBarClassic,
                {
                  bottom: neoAskBottom,
                  backgroundColor: theme.askBarBg,
                  borderColor: theme.askBarBorder,
                },
              ]}
              onPress={() => setIsInlineAskVisible(true)}
            >
              <View style={[styles.neoAskPlus, !isNeo && styles.askPlusClassic]}>
                <Ionicons name="add" size={20} color={isNeo ? "white" : "#0f172a"} />
              </View>
              <View
                style={[
                  styles.neoAskInput,
                  !isNeo && styles.askInputClassic,
                  {
                    backgroundColor: theme.askBarInputBg,
                    borderColor: isNeo ? "rgba(255,255,255,0.12)" : "#cbd5e1",
                  },
                ]}
              >
                <Text style={[styles.neoAskText, { color: theme.askBarInputText }]}>
                  {tr("随便问我", "Ask anything")}
                </Text>
                <View style={styles.neoAskIcons}>
                  <Ionicons name="mic-outline" size={16} color={askAuxIconColor} />
                  <Ionicons name="pulse-outline" size={16} color={askAuxIconColor} />
                </View>
              </View>
            </Pressable>
          ) : null}

          {isInlineAskVisible ? (
            <View
              style={[
                styles.inlineAskPanel,
                !isNeo && styles.inlineAskPanelClassic,
                {
                  bottom: neoAskBottom,
                },
              ]}
            >
              <View style={styles.inlineAskHeader}>
                <Pressable
                  style={[styles.inlineAskHeaderIcon, !isNeo && styles.inlineAskHeaderIconClassic]}
                  onPress={() => setIsInlineAskVisible(false)}
                >
                  <Ionicons name="chevron-back" size={20} color={isNeo ? "#60a5fa" : "#2563eb"} />
                </Pressable>
                <Image source={{ uri: botConfig.avatar }} style={styles.inlineAskHeaderAvatar} />
                <Text style={[styles.inlineAskHeaderTitle, !isNeo && styles.inlineAskHeaderTitleClassic]}>
                  MyBot
                </Text>
                <View style={styles.inlineAskHeaderSpacer} />
                <Pressable style={[styles.inlineAskHeaderIcon, !isNeo && styles.inlineAskHeaderIconClassic]}>
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={18}
                    color={isNeo ? "rgba(248,250,252,0.88)" : "#334155"}
                  />
                </Pressable>
              </View>

              <Text style={[styles.inlineAskTimeText, !isNeo && styles.inlineAskTimeTextClassic]}>
                {tr("刚刚", "Just now")}
              </Text>

              <ScrollView
                ref={inlineAskScrollRef}
                style={styles.inlineAskMessages}
                contentContainerStyle={styles.inlineAskMessagesContent}
                showsVerticalScrollIndicator={false}
              >
                {inlineAskMessages.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.inlineAskMessageRow,
                      item.isMe ? styles.inlineAskMessageRowMe : null,
                    ]}
                  >
                    {item.isMe ? null : (
                      <Image
                        source={{ uri: botConfig.avatar }}
                        style={styles.inlineAskMessageAvatar}
                      />
                    )}
                    <View
                      style={[
                        styles.inlineAskBubble,
                        item.isMe ? styles.inlineAskBubbleMe : styles.inlineAskBubbleBot,
                        !isNeo && !item.isMe ? styles.inlineAskBubbleBotClassic : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.inlineAskBubbleText,
                          !isNeo && styles.inlineAskBubbleTextClassic,
                          item.isMe ? styles.inlineAskBubbleTextMe : null,
                        ]}
                      >
                        {item.text}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={[styles.inlineAskComposer, !isNeo && styles.inlineAskComposerClassic]}>
                <Pressable style={[styles.inlineAskComposerIcon, !isNeo && styles.inlineAskComposerIconClassic]}>
                  <Ionicons name="add" size={22} color={isNeo ? "rgba(203,213,225,0.95)" : "#64748b"} />
                </Pressable>

                <View style={[styles.inlineAskInputWrap, !isNeo && styles.inlineAskInputWrapClassic]}>
                  <TextInput
                    style={[styles.inlineAskInput, !isNeo && styles.inlineAskInputClassic]}
                    placeholder={tr("iMessage", "iMessage")}
                    placeholderTextColor={isNeo ? "rgba(148,163,184,0.78)" : "#94a3b8"}
                    value={inlineAskInput}
                    onChangeText={setInlineAskInput}
                    returnKeyType="send"
                    onSubmitEditing={handleInlineAskSend}
                  />
                  <Ionicons
                    name="happy-outline"
                    size={20}
                    color={isNeo ? "rgba(148,163,184,0.88)" : "#94a3b8"}
                  />
                </View>

                <Pressable
                  style={[
                    styles.inlineAskComposerIcon,
                    styles.inlineAskComposerPrimary,
                    !isNeo && styles.inlineAskComposerPrimaryClassic,
                  ]}
                  onPress={handleInlineAskSend}
                >
                  <Ionicons
                    name={inlineAskInput.trim() ? "arrow-up" : "mic-outline"}
                    size={20}
                    color="rgba(248,250,252,0.95)"
                  />
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      <Animated.View
        style={[
          styles.chatSheet,
          isNeo && styles.chatSheetNeo,
          {
            backgroundColor: theme.chatSheetBg,
            borderTopColor: theme.chatSheetBorder,
          },
          {
            height: chatSheetHeight,
            transform: [{ translateY: chatSheetTranslateY }],
          },
        ]}
      >
        <Pressable
          style={[
            styles.chatSheetHeader,
            isNeo && styles.chatSheetHeaderNeo,
            { borderBottomColor: isNeo ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" },
          ]}
          onPress={() => {
            setChatSheetMode((prev) => {
              if (prev === "collapsed") return "normal";
              if (prev === "normal") return "fullscreen";
              return "collapsed";
            });
          }}
          {...chatSheetPanResponder.panHandlers}
        >
          {isNeo ? (
            <View style={styles.chatSheetHeaderNeoInner}>
              <View style={[styles.chatHandle, styles.chatHandleNeo, { backgroundColor: theme.chatHandle }]} />
            </View>
          ) : (
            <>
              <View style={[styles.chatHandle, { backgroundColor: theme.chatHandle }]} />
              <Text style={[styles.chatHeaderTitle, { color: theme.sheetTitle }]}>
                {isChatCollapsed
                  ? `${tr("聊天", "Chats")} (${chatThreads.length})`
                  : tr("聊天", "Chats")}
              </Text>
              <Ionicons
                name={isChatCollapsed ? "chevron-up" : "chevron-down"}
                size={18}
                color={theme.chatHeaderText}
              />
            </>
          )}
        </Pressable>

        <FlatList
          data={chatThreads}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatListItem
              chat={item}
              theme={uiTheme}
              language={language}
              onPress={() => openThread(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.chatListContent, isNeo && styles.chatListContentNeo]}
        />
      </Animated.View>

      <AddBotFriendModal
        visible={isAddBotModalVisible}
        accentColor={theme.accent}
        theme={uiTheme}
        language={language}
        onClose={() => setIsAddBotModalVisible(false)}
        onAdd={handleAddBotFriend}
      />

      <Pressable style={[styles.fab, { backgroundColor: theme.fabBg }]}>
        <Text style={[styles.fabText, { color: theme.fabText }]}>+</Text>
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
  neoDimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3,4,12,0.46)",
    zIndex: 0,
  },
  neoOverlayTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "28%",
    backgroundColor: "rgba(8,10,22,0.45)",
    zIndex: 0,
  },
  neoOverlayBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "34%",
    backgroundColor: "rgba(8,8,20,0.32)",
    zIndex: 0,
  },
  neoGlowPurple: {
    position: "absolute",
    right: -96,
    top: "66%",
    width: 320,
    height: 220,
    borderRadius: 140,
    backgroundColor: "rgba(220,38,127,0.24)",
    zIndex: 0,
  },
  neoGlowBlue: {
    position: "absolute",
    left: -90,
    top: "14%",
    width: 330,
    height: 260,
    borderRadius: 160,
    backgroundColor: "rgba(37,99,235,0.22)",
    zIndex: 0,
  },
  neoGlowMagenta: {
    position: "absolute",
    right: 28,
    top: "48%",
    width: 230,
    height: 190,
    borderRadius: 110,
    backgroundColor: "rgba(190,24,93,0.18)",
    zIndex: 0,
  },
  neoGrid: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  sceneWorldLayer: {
    position: "absolute",
    zIndex: 2,
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
  topBarNeo: {
    top: 6,
    left: 18,
    right: 18,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "white",
  },
  avatarButtonNeo: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(15,23,42,0.42)",
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
  worldButtonTextNeo: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.7,
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
  iconCircleNeo: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
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
    maxWidth: 260,
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
  neoDockWrap: {
    position: "absolute",
    left: 14,
    right: 14,
    zIndex: 34,
  },
  neoDockHidden: {
    opacity: 0,
  },
  classicDockWrap: {
    top: "20%",
    zIndex: 33,
  },
  neoAskBar: {
    position: "absolute",
    left: 16,
    right: 16,
    minHeight: 66,
    borderRadius: 34,
    borderWidth: 1,
    paddingHorizontal: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 36,
  },
  askBarClassic: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  neoAskPlus: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  askPlusClassic: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  neoAskInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  askInputClassic: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
  },
  neoAskText: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.12,
  },
  neoAskIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inlineAskPanel: {
    position: "absolute",
    top: 74,
    left: 14,
    right: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(8,10,18,0.95)",
    overflow: "hidden",
    zIndex: 38,
  },
  inlineAskPanelClassic: {
    borderColor: "rgba(148,163,184,0.28)",
    backgroundColor: "rgba(255,255,255,0.98)",
  },
  inlineAskHeader: {
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inlineAskHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  inlineAskHeaderIconClassic: {
    backgroundColor: "#f1f5f9",
  },
  inlineAskHeaderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#334155",
  },
  inlineAskHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f8fafc",
  },
  inlineAskHeaderTitleClassic: {
    color: "#0f172a",
  },
  inlineAskHeaderSpacer: {
    flex: 1,
  },
  inlineAskTimeText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 11,
    color: "rgba(148,163,184,0.72)",
  },
  inlineAskTimeTextClassic: {
    color: "#94a3b8",
  },
  inlineAskMessages: {
    maxHeight: 280,
  },
  inlineAskMessagesContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
  },
  inlineAskMessageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    maxWidth: "92%",
  },
  inlineAskMessageRowMe: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
  },
  inlineAskMessageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#334155",
  },
  inlineAskBubble: {
    maxWidth: "86%",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  inlineAskBubbleBot: {
    backgroundColor: "rgba(51,65,85,0.64)",
  },
  inlineAskBubbleBotClassic: {
    backgroundColor: "#e2e8f0",
  },
  inlineAskBubbleMe: {
    backgroundColor: "rgba(34,197,94,0.95)",
  },
  inlineAskBubbleText: {
    fontSize: 14,
    color: "rgba(248,250,252,0.92)",
    lineHeight: 20,
  },
  inlineAskBubbleTextClassic: {
    color: "#334155",
  },
  inlineAskBubbleTextMe: {
    color: "#052e16",
    fontWeight: "600",
  },
  inlineAskComposer: {
    minHeight: 70,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineAskComposerClassic: {
    borderTopColor: "rgba(148,163,184,0.28)",
  },
  inlineAskComposerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30,41,59,0.82)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  inlineAskComposerIconClassic: {
    backgroundColor: "#f1f5f9",
    borderColor: "#cbd5e1",
  },
  inlineAskComposerPrimary: {
    backgroundColor: "rgba(30,64,175,0.5)",
  },
  inlineAskComposerPrimaryClassic: {
    backgroundColor: "#2563eb",
    borderColor: "#1d4ed8",
  },
  inlineAskInputWrap: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingLeft: 14,
    paddingRight: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineAskInputWrapClassic: {
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
  },
  inlineAskInput: {
    flex: 1,
    color: "rgba(248,250,252,0.92)",
    fontSize: 16,
    paddingVertical: 0,
  },
  inlineAskInputClassic: {
    color: "#1e293b",
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
  chatSheetNeo: {
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.06)",
    borderRightColor: "rgba(255,255,255,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.36,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
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
  chatSheetHeaderNeo: {
    height: 34,
    paddingHorizontal: 0,
    borderBottomWidth: 0,
    justifyContent: "center",
  },
  chatSheetHeaderNeoInner: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  chatHandle: {
    width: 40,
    height: 5,
    borderRadius: 99,
    alignSelf: "center",
    backgroundColor: "#9ca3af",
  },
  chatHandleNeo: {
    width: 56,
    height: 4.5,
    borderRadius: 999,
  },
  chatHeaderTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  chatListContent: {
    paddingBottom: 80,
  },
  chatListContentNeo: {
    paddingTop: 2,
    paddingBottom: 90,
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
