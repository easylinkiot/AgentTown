import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Circle, Defs, LinearGradient, Polygon, Polyline, Stop } from "react-native-svg";

import { formatApiError } from "@/src/lib/api";
import { useAgentTown } from "@/src/state/agenttown-context";
import { MiniApp } from "@/src/types";

import { asToggleValue, buildMiniAppViewModel, FlashcardData, MiniAppViewModel } from "./model";

type Props = {
  app: MiniApp;
};

type FashionResults = {
  rendering: string;
  model: string;
  plan: string;
} | null;

type PriceCategory = "全部" | "鞋履" | "数码" | "家居";

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.trim().replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return `rgba(37,99,235,${alpha})`;
  }
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function resolveIcon(name: string, fallback: keyof typeof Ionicons.glyphMap): keyof typeof Ionicons.glyphMap {
  const glyphMap = (Ionicons as { glyphMap?: Record<string, unknown> }).glyphMap;
  if (!glyphMap) return fallback;
  return Object.prototype.hasOwnProperty.call(glyphMap, name) ? (name as keyof typeof Ionicons.glyphMap) : fallback;
}

function trendIcon(trend: "up" | "down" | "stable"): keyof typeof Ionicons.glyphMap {
  if (trend === "up") return "trending-up-outline";
  if (trend === "down") return "trending-down-outline";
  return "remove-outline";
}

function trendColor(trend: "up" | "down" | "stable") {
  if (trend === "up") return "#ef4444";
  if (trend === "down") return "#10b981";
  return "#64748b";
}

function getPriceCategory(product: string): PriceCategory {
  const text = product.toLowerCase();
  if (
    text.includes("shoe") ||
    text.includes("sneaker") ||
    text.includes("running") ||
    text.includes("nike") ||
    text.includes("adidas")
  ) {
    return "鞋履";
  }
  if (
    text.includes("keyboard") ||
    text.includes("earbud") ||
    text.includes("ssd") ||
    text.includes("phone") ||
    text.includes("camera") ||
    text.includes("lego")
  ) {
    return "数码";
  }
  return "家居";
}

function getProductEmoji(product: string) {
  const text = product.toLowerCase();
  if (text.includes("lego")) return "🧱";
  if (text.includes("lulu") || text.includes("yoga")) return "🧘";
  if (text.includes("keyboard") || text.includes("ssd") || text.includes("earbud")) return "⌨️";
  if (text.includes("shoe") || text.includes("sneaker") || text.includes("running")) return "👟";
  return "🛍️";
}

function buildViews(heat: number, index: number) {
  return 1000 + clampPercent(heat) * 37 + index * 241;
}

function buildPriceHistory(price: number, originalPrice: number) {
  const base = Math.max(price, 1);
  const peak = Math.max(originalPrice || base * 1.08, base);
  return [
    Number((peak * 1.02).toFixed(1)),
    Number((peak * 0.99).toFixed(1)),
    Number((peak * 1.04).toFixed(1)),
    Number((peak * 1.01).toFixed(1)),
    Number((base * 0.98).toFixed(1)),
    Number(base.toFixed(1)),
  ];
}

function buildFlashcardHistory(word: string) {
  const seed = Math.max(word.trim().length, 4);
  return [20, 32 + seed, 48 + seed, 56 + seed, 60 + seed].map((item) => clampPercent(item));
}

function buildFlashcardStats(data: FlashcardData) {
  const mastery = clampPercent(58 + data.synonyms.length * 4 + data.collocations.length * 2);
  const streak = Math.max(3, 8 + data.collocations.length);
  const nextReview = data.quiz ? "4小时后" : "8小时后";
  return {
    mastery,
    streak,
    nextReview,
    history: buildFlashcardHistory(data.word),
  };
}

function buildFashionResults(vm: MiniAppViewModel["fashionDesigner"]): FashionResults {
  const first = vm.renders[0]?.image?.trim() || "";
  const second = vm.renders[1]?.image?.trim() || "";
  if (!first && !second && vm.steps.length === 0) return null;
  const planSections = [
    vm.materials.length ? `面料建议\n${vm.materials.map((item) => `- ${item}`).join("\n")}` : "",
    vm.steps.length ? `工艺说明\n${vm.steps.map((item, index) => `${index + 1}. ${item}`).join("\n")}` : "",
    vm.looks.length
      ? `设计亮点\n${vm.looks.map((item) => `- ${item.label}: ${item.description}`).join("\n")}`
      : "",
  ].filter(Boolean);
  return {
    rendering: first,
    model: second || first,
    plan: planSections.join("\n\n"),
  };
}

function ProgressBar({
  value,
  color,
  trackColor = "#f3f4f6",
  height = 6,
}: {
  value: number;
  color: string;
  trackColor?: string;
  height?: number;
}) {
  return (
    <View style={[styles.progressTrack, { backgroundColor: trackColor, height }]}>
      <View style={[styles.progressFill, { width: `${clampPercent(value)}%`, backgroundColor: color }]} />
    </View>
  );
}

function CircularProgress({
  value,
  size = 40,
  color = "#8b5cf6",
  label,
}: {
  value: number;
  size?: number;
  color?: string;
  label?: string;
}) {
  const radius = (size - 4) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clampPercent(value) / 100) * circumference;
  return (
    <View style={styles.circularWrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#f3f4f6" strokeWidth={4} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={4}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            originX={size / 2}
            originY={size / 2}
            rotation={-90}
          />
        </Svg>
        <View style={styles.circularLabel}>
          <Text style={styles.circularValue}>{clampPercent(value)}%</Text>
        </View>
      </View>
      {label ? <Text style={styles.circularCaption}>{label}</Text> : null}
    </View>
  );
}

function Sparkline({
  data,
  color = "#10b981",
  height = 24,
  width = 80,
  fill = true,
}: {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  fill?: boolean;
}) {
  const gradientSeed = useId().replace(/[:]/g, "");
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / Math.max(data.length - 1, 1);
  const points = data
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
  const last = data[data.length - 1] || 0;
  const lastY = height - ((last - min) / range) * height;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id={gradientSeed} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {fill ? <Polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#${gradientSeed})`} /> : null}
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={width} cy={lastY} r={2} fill={color} />
    </Svg>
  );
}

function NewsFeedView({ vm, accent }: { vm: MiniAppViewModel; accent: string }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.stackGap}>
        {vm.newsItems.map((item, index) => {
          const views = buildViews(item.heat, index);
          return (
            <View key={item.id} style={styles.storyCard}>
              <View style={styles.storyHeader}>
                <View style={styles.storyMeta}>
                  <View style={[styles.storySourceBadge, { backgroundColor: hexToRgba(accent, 0.08), borderColor: hexToRgba(accent, 0.16) }]}>
                    <Text style={[styles.storySourceText, { color: accent }]}>{item.source || "快讯"}</Text>
                  </View>
                  <View style={styles.storyMetaInline}>
                    <Ionicons name="time-outline" size={9} color="#6b7280" />
                    <Text style={styles.storyMetaText}>{item.time || "2小时前"}</Text>
                  </View>
                </View>
                <View style={styles.storyMetaInline}>
                  <Ionicons name="eye-outline" size={11} color="#6b7280" />
                  <Text style={styles.storyMetaText}>{views}</Text>
                </View>
              </View>

              <Text style={styles.storyTitle}>{item.title}</Text>
              <Text style={styles.storySummary} numberOfLines={2}>
                {item.summary}
              </Text>

              <View style={styles.storyFooter}>
                <View style={styles.storyHeatWrap}>
                  <View style={styles.storyHeatHeader}>
                    <Text style={styles.storyHeatLabel}>热度指数</Text>
                    <Text style={styles.storyHeatValue}>{clampPercent(item.heat)}/100</Text>
                  </View>
                  <ProgressBar value={item.heat} color="#f97316" trackColor="#fff7ed" height={4} />
                </View>
                {item.tag ? (
                  <View style={styles.storyTagBadge}>
                    <Text style={styles.storyTagText}>#{item.tag}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function FlashcardView({ app, data }: { app: MiniApp; data: FlashcardData }) {
  const { runMiniApp } = useAgentTown();
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rotation = useRef(new Animated.Value(0)).current;
  const stats = useMemo(() => buildFlashcardStats(data), [data]);

  const frontRotation = rotation.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });
  const backRotation = rotation.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  const handleFlip = () => {
    const next = !flipped;
    setFlipped(next);
    Animated.spring(rotation, {
      toValue: next ? 180 : 0,
      useNativeDriver: true,
      bounciness: 6,
      speed: 12,
    }).start();
  };

  const resetFlip = () => {
    setFlipped(false);
    Animated.spring(rotation, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
      speed: 12,
    }).start();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.flashScreenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.flashStatsBar}>
        <View style={styles.flashStatsLeft}>
          <CircularProgress value={stats.mastery} color="#8b5cf6" size={42} label="掌握度" />
          <View>
            <Text style={styles.flashTinyLabel}>连续打卡</Text>
            <View style={styles.flashStreakRow}>
              <Text style={styles.flashStreakValue}>{stats.streak}</Text>
              <Text style={styles.flashStreakUnit}>天</Text>
            </View>
          </View>
        </View>
        <View style={styles.flashReviewWrap}>
          <Text style={styles.flashTinyLabel}>下次复习</Text>
          <Text style={styles.flashReviewValue}>{stats.nextReview}</Text>
        </View>
      </View>

      <View style={styles.flashCardOuter}>
        <Pressable onPress={handleFlip} style={styles.flashCardPressable}>
          <View style={styles.flashCardStage}>
            <Animated.View style={[styles.flashCardFace, styles.flashCardFront, { transform: [{ perspective: 1000 }, { rotateY: frontRotation }] }]}>
              <View style={styles.flashFaceHeader}>
                <View style={styles.flashDailyBadge}>
                  <Text style={styles.flashDailyText}>每日单词</Text>
                </View>
                <Ionicons name="volume-medium-outline" size={16} color="#6b7280" />
              </View>

              <View style={styles.flashFrontMain}>
                <Text style={styles.flashWord}>{data.word}</Text>
                <View style={styles.flashPronBubble}>
                  <Text style={styles.flashPronText}>{data.pronunciation || "/-/"} </Text>
                </View>
              </View>

              <View style={styles.flashBottomHint}>
                <Text style={styles.flashHintText}>点击翻转卡片</Text>
                <View style={styles.flashHintLine} />
              </View>
            </Animated.View>

            <Animated.View style={[styles.flashCardFace, styles.flashCardBack, { transform: [{ perspective: 1000 }, { rotateY: backRotation }] }]}>
              <View style={styles.flashBackBody}>
                <Text style={styles.flashBackLabel}>释义</Text>
                <Text style={styles.flashDefinition}>{data.definition}</Text>

                <View style={styles.flashExampleCard}>
                  <Text style={styles.flashExampleLabel}>例句</Text>
                  <Text style={styles.flashExampleText}>“{data.example}”</Text>
                </View>
              </View>

              <View style={styles.flashHistorySection}>
                <Text style={styles.flashHistoryLabel}>记忆曲线</Text>
                <Sparkline data={stats.history} color="#a78bfa" height={30} width={220} />
              </View>
            </Animated.View>
          </View>
        </Pressable>
      </View>

      <View style={styles.flashSupportCards}>
        {data.memoryTip ? (
          <View style={styles.flashTipCard}>
            <Text style={styles.flashTipTitle}>记忆提示</Text>
            <Text style={styles.flashTipText}>{data.memoryTip}</Text>
          </View>
        ) : null}
        {data.collocations.length > 0 ? (
          <View style={styles.flashChipCard}>
            {data.collocations.slice(0, 3).map((item, index) => (
              <View key={`${item}_${index}`} style={styles.flashChip}>
                <Text style={styles.flashChipText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.flashNextWrap}>
        <Pressable
          style={styles.flashNextBtn}
          onPress={async () => {
            if (busy) return;
            setBusy(true);
            setError("");
            try {
              await runMiniApp(app.id, "", {
                action: "next_flashcard",
                currentWord: data.word,
              });
              resetFlip();
            } catch (err) {
              setError(formatApiError(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? <ActivityIndicator size="small" color="#6b7280" /> : <Ionicons name="refresh-outline" size={14} color="#6b7280" />}
          <Text style={styles.flashNextText}>下一个</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </ScrollView>
  );
}

function PriceTrackerView({ vm }: { vm: MiniAppViewModel }) {
  const [category, setCategory] = useState<PriceCategory>("全部");
  const [expandedItemId, setExpandedItemId] = useState("");
  const categories: PriceCategory[] = ["全部", "鞋履", "数码", "家居"];
  const items =
    category === "全部" ? vm.priceItems : vm.priceItems.filter((item) => getPriceCategory(item.product) === category);
  const totalSavings = vm.priceItems.reduce((sum, item) => sum + Math.max(0, item.originalPrice - item.price), 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.priceTabs}>
        {categories.map((item) => {
          const active = item === category;
          return (
            <Pressable key={item} style={[styles.priceTab, active ? styles.priceTabActive : null]} onPress={() => setCategory(item)}>
              <Text style={[styles.priceTabText, active ? styles.priceTabTextActive : null]}>{item}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.stackGapLg}>
        {items.map((item) => {
          const history = buildPriceHistory(item.price, item.originalPrice);
          const isDrop = item.trend === "down";
          const percentChange =
            item.discountPct > 0
              ? item.discountPct
              : item.originalPrice > 0
                ? clampPercent(((item.originalPrice - item.price) / item.originalPrice) * 100)
                : 0;
          const expanded = expandedItemId === item.id;
          return (
            <View key={item.id} style={styles.priceCard}>
              <View style={styles.priceTopRow}>
                <View style={styles.priceThumb}>
                  <Text style={styles.priceThumbText}>{getProductEmoji(item.product)}</Text>
                </View>
                <View style={styles.priceInfo}>
                  <Text style={styles.priceTitle} numberOfLines={1}>
                    {item.product}
                  </Text>
                  <View style={styles.priceRetailerRow}>
                    <Ionicons name="pricetag-outline" size={10} color="#6b7280" />
                    <Text style={styles.priceRetailerText}>{item.retailer}</Text>
                  </View>
                </View>
                <View style={styles.priceStat}>
                  <Text style={styles.priceCurrent}>¥{item.price.toFixed(0)}</Text>
                  <View style={styles.priceChangeRow}>
                    <Ionicons name={isDrop ? "trending-down-outline" : "trending-up-outline"} size={10} color={isDrop ? "#16a34a" : "#ef4444"} />
                    <Text style={[styles.priceChangeText, { color: isDrop ? "#16a34a" : "#ef4444" }]}>{percentChange}%</Text>
                  </View>
                </View>
              </View>

              <View style={styles.priceBottomRow}>
                <View style={styles.priceTrendWrap}>
                  <Text style={styles.priceTrendLabel}>30天价格趋势</Text>
                  <Sparkline data={history} color={isDrop ? "#10b981" : "#ef4444"} width={88} height={24} />
                </View>
                <View style={styles.priceDivider} />
                <Pressable style={styles.priceDetailBtn} onPress={() => setExpandedItemId(expanded ? "" : item.id)}>
                  <Text style={styles.priceDetailBtnText}>查看详情</Text>
                </Pressable>
              </View>

              {expanded ? <Text style={styles.priceExpandedText}>{item.note || "当前价格稳定，可继续关注后续波动。"}</Text> : null}
            </View>
          );
        })}

        <View style={styles.savingsCard}>
          <View style={styles.savingsHeader}>
            <Text style={styles.savingsLabel}>潜在节省</Text>
            <Ionicons name="flash" size={14} color="#ffffff" />
          </View>
          <View style={styles.savingsValueRow}>
            <Text style={styles.savingsValue}>¥{totalSavings.toFixed(2)}</Text>
            <Text style={styles.savingsSuffix}>今日发现</Text>
          </View>
          <ProgressBar value={Math.min(100, totalSavings / 6)} color="#ffffff" trackColor="rgba(255,255,255,0.4)" />
        </View>
      </View>
    </ScrollView>
  );
}

function TaskListView({ app, vm }: { app: MiniApp; vm: MiniAppViewModel }) {
  const { runMiniApp } = useAgentTown();
  const [overrides, setOverrides] = useState<Record<string, MiniAppViewModel["taskItems"][number]["status"]>>({});
  const [busyTaskId, setBusyTaskId] = useState("");
  const [error, setError] = useState("");
  const items = vm.taskItems.map((item) => ({
    ...item,
    status: overrides[item.id] || item.status,
  }));

  if (items.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="checkmark-done-circle-outline" size={48} color="rgba(100,116,139,0.24)" />
        <Text style={styles.emptyStateText}>No tasks yet</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.stackGap}>
        {items.map((item) => {
          const done = item.status === "Done";
          return (
            <Pressable
              key={item.id}
              style={styles.taskCard}
              onPress={async () => {
                if (busyTaskId) return;
                const nextStatus = done ? "Pending" : "Done";
                setOverrides((prev) => ({
                  ...prev,
                  [item.id]: nextStatus,
                }));
                setBusyTaskId(item.id);
                setError("");
                try {
                  await runMiniApp(app.id, item.title, {
                    action: "toggle_task",
                    taskId: item.id,
                    nextStatus,
                  });
                } catch (err) {
                  setOverrides((prev) => ({
                    ...prev,
                    [item.id]: item.status,
                  }));
                  setError(formatApiError(err));
                } finally {
                  setBusyTaskId("");
                }
              }}
            >
              <View style={[styles.taskCheck, done ? styles.taskCheckDone : null]}>
                {busyTaskId === item.id ? <ActivityIndicator size="small" color={done ? "#ffffff" : "#6b7280"} /> : null}
                {busyTaskId !== item.id && done ? <Ionicons name="checkmark" size={12} color="#ffffff" /> : null}
              </View>
              <View style={styles.taskBody}>
                <Text style={[styles.taskTitle, done ? styles.taskTitleDone : null]}>{item.title}</Text>
                <View style={styles.taskMetaRow}>
                  <View
                    style={[
                      styles.taskPriorityBadge,
                      item.priority === "High"
                        ? styles.taskPriorityHigh
                        : item.priority === "Medium"
                          ? styles.taskPriorityMedium
                          : styles.taskPriorityLow,
                    ]}
                  >
                    <Text
                      style={[
                        styles.taskPriorityText,
                        item.priority === "High"
                          ? styles.taskPriorityTextHigh
                          : item.priority === "Medium"
                            ? styles.taskPriorityTextMedium
                            : styles.taskPriorityTextLow,
                      ]}
                    >
                      {item.priority}
                    </Text>
                  </View>
                  <View style={styles.taskAssigneeRow}>
                    <Ionicons name="person-outline" size={10} color="#6b7280" />
                    <Text style={styles.taskAssigneeText}>{item.assignee}</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </ScrollView>
  );
}

function GenerativeAppView({ app, vm }: { app: MiniApp; vm: MiniAppViewModel }) {
  const { runMiniApp } = useAgentTown();
  const [states, setStates] = useState<Record<number, boolean>>({});
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const nextStates: Record<number, boolean> = {};
    vm.widgets.forEach((widget, index) => {
      if (widget.type === "toggle") {
        nextStates[index] = asToggleValue(widget);
      }
    });
    setStates(nextStates);
  }, [vm.widgets]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.widgetGrid}>
        {vm.widgets.map((widget, index) => {
          const iconName = resolveIcon(widget.icon || "ellipse-outline", "ellipse-outline");
          const fullWidth = widget.type === "list" || widget.type === "chart" || widget.type === "text";
          const accent = widget.color || "#6b7280";
          return (
            <View key={`${widget.label}_${index}`} style={[styles.widgetCard, fullWidth ? styles.widgetCardFull : null]}>
              <View style={styles.widgetHeader}>
                <Text style={styles.widgetLabel}>{widget.label}</Text>
                <Ionicons name={iconName} size={14} color={accent} />
              </View>

              {widget.type === "stat" ? (
                <View style={styles.widgetStatRow}>
                  <Text style={styles.widgetStatValue}>{String(widget.value || 0)}</Text>
                  {widget.subValue ? <Text style={styles.widgetStatSub}>{widget.subValue}</Text> : null}
                </View>
              ) : null}

              {widget.type === "button" ? (
                <Pressable
                  style={styles.widgetButton}
                  onPress={async () => {
                    setBusyIndex(index);
                    setError("");
                    try {
                      await runMiniApp(app.id, widget.action || widget.label, {
                        action: "run_widget_action",
                        widgetLabel: widget.label,
                        widgetAction: widget.action || widget.label,
                      });
                    } catch (err) {
                      setError(formatApiError(err));
                    } finally {
                      setBusyIndex(null);
                    }
                  }}
                >
                  {busyIndex === index ? <ActivityIndicator size="small" color="#111827" /> : null}
                  <Text style={styles.widgetButtonText}>{String(widget.value || "执行")}</Text>
                </Pressable>
              ) : null}

              {widget.type === "toggle" ? (
                <View style={styles.widgetToggleRow}>
                  <Text style={styles.widgetToggleText}>{states[index] ? "已开启" : "已关闭"}</Text>
                  <Pressable
                    testID={`miniapp-widget-toggle-${index}`}
                    style={[styles.widgetToggleTrack, states[index] ? styles.widgetToggleTrackOn : null]}
                    onPress={async () => {
                      if (busyIndex !== null) return;
                      const nextValue = !states[index];
                      setStates((prev) => ({
                        ...prev,
                        [index]: nextValue,
                      }));
                      setBusyIndex(index);
                      setError("");
                      try {
                        await runMiniApp(app.id, "", {
                          action: "toggle_widget",
                          widgetLabel: widget.label,
                          nextValue,
                        });
                      } catch (err) {
                        setStates((prev) => ({
                          ...prev,
                          [index]: !nextValue,
                        }));
                        setError(formatApiError(err));
                      } finally {
                        setBusyIndex(null);
                      }
                    }}
                  >
                    <View style={[styles.widgetToggleThumb, states[index] ? styles.widgetToggleThumbOn : null]} />
                  </Pressable>
                </View>
              ) : null}

              {widget.type === "list" ? (
                <View style={styles.widgetList}>
                  {(Array.isArray(widget.data) ? widget.data : []).map((item, itemIndex) => {
                    const next = (item || {}) as { label?: string; value?: string };
                    return (
                      <View key={`${widget.label}_${itemIndex}`} style={styles.widgetListItem}>
                        <Text style={styles.widgetListLabel}>{next.label || String(item)}</Text>
                        <Text style={styles.widgetListValue}>{next.value || ""}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              {widget.type === "chart" ? (
                <View style={styles.widgetChart}>
                  {(Array.isArray(widget.data) ? widget.data : [40, 70, 45, 90, 65, 80, 50]).map((item, itemIndex) => {
                    const value = clampPercent(Number(item) || 0);
                    return <View key={`${widget.label}_bar_${itemIndex}`} style={[styles.widgetChartBar, { height: `${Math.max(16, value)}%` }]} />;
                  })}
                </View>
              ) : null}

              {widget.type === "text" ? <Text style={styles.widgetText}>{String(widget.value || widget.subValue || "")}</Text> : null}
            </View>
          );
        })}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </ScrollView>
  );
}

function FashionDesignerView({
  app,
  vm,
}: {
  app: MiniApp;
  vm: MiniAppViewModel;
}) {
  const { runMiniApp } = useAgentTown();
  const [requirements, setRequirements] = useState("");
  const [referenceImage, setReferenceImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FashionResults>(() => buildFashionResults(vm.fashionDesigner));
  const [error, setError] = useState("");

  useEffect(() => {
    setResults(buildFashionResults(vm.fashionDesigner));
  }, [vm.fashionDesigner]);

  const handleGenerate = async () => {
    if (!requirements.trim() && !referenceImage) return;
    setLoading(true);
    setError("");
    try {
      await runMiniApp(app.id, requirements.trim() || "生成新的服装设计方案", {
        referenceImageUri: referenceImage,
      });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.stackGapLg}>
        <View style={styles.fashionInputCard}>
          <View style={styles.fashionSectionHeader}>
            <Ionicons name="shirt-outline" size={18} color="#ec4899" />
            <Text style={styles.fashionSectionTitle}>设计需求</Text>
          </View>

          <TextInput
            value={requirements}
            onChangeText={setRequirements}
            placeholder="描述您的设计灵感、风格、受众..."
            placeholderTextColor="#9ca3af"
            multiline
            style={styles.fashionInput}
          />

          <Pressable
            style={styles.fashionUploadBtn}
            onPress={async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                quality: 0.7,
                allowsEditing: false,
              });
              if (!result.canceled && result.assets[0]?.uri) {
                setReferenceImage(result.assets[0].uri);
              }
            }}
          >
            <Ionicons name={referenceImage ? "checkmark-outline" : "cloud-upload-outline"} size={16} color={referenceImage ? "#16a34a" : "#6b7280"} />
            <Text style={styles.fashionUploadText}>{referenceImage ? "参考图已上传" : "上传参考图"}</Text>
          </Pressable>

          {referenceImage ? <Image source={{ uri: referenceImage }} style={styles.fashionReferencePreview} /> : null}

          <Pressable style={[styles.fashionGenerateBtn, loading ? styles.fashionGenerateBtnDisabled : null]} onPress={() => void handleGenerate()}>
            {loading ? <ActivityIndicator size="small" color="#111827" /> : <Ionicons name="sparkles-outline" size={18} color="#111827" />}
            <Text style={styles.fashionGenerateText}>{loading ? "正在生成设计..." : "开始生成设计"}</Text>
          </Pressable>
        </View>

        {results ? (
          <View style={styles.stackGapLg}>
            <View style={styles.fashionResultGrid}>
              <View style={styles.fashionResultCol}>
                <View style={styles.fashionResultLabelRow}>
                  <Ionicons name="image-outline" size={14} color="#3b82f6" />
                  <Text style={styles.fashionResultLabel}>设计效果图</Text>
                </View>
                <View style={styles.fashionResultCard}>
                  {results.rendering ? <Image source={{ uri: results.rendering }} style={styles.fashionResultImage} /> : null}
                </View>
              </View>

              <View style={styles.fashionResultCol}>
                <View style={styles.fashionResultLabelRow}>
                  <Ionicons name="people-outline" size={14} color="#8b5cf6" />
                  <Text style={styles.fashionResultLabel}>模特展示图</Text>
                </View>
                <View style={styles.fashionResultCard}>
                  {results.model ? <Image source={{ uri: results.model }} style={styles.fashionResultImage} /> : null}
                </View>
              </View>
            </View>

            <View style={styles.fashionPlanCard}>
              <View style={styles.fashionSectionHeader}>
                <Ionicons name="document-text-outline" size={18} color="#f97316" />
                <Text style={styles.fashionSectionTitle}>生产方案</Text>
              </View>
              <Text style={styles.fashionPlanText}>{results.plan}</Text>
            </View>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </ScrollView>
  );
}

function CarCaringGameView({ app, vm }: { app: MiniApp; vm: MiniAppViewModel }) {
  const { runMiniApp } = useAgentTown();
  const [busyAction, setBusyAction] = useState("");
  const [message, setMessage] = useState(vm.carCaring.message);
  const [stats, setStats] = useState(vm.carCaring.stats);
  const [error, setError] = useState("");

  useEffect(() => {
    setMessage(vm.carCaring.message);
    setStats(vm.carCaring.stats);
  }, [vm.carCaring]);

  const actions = vm.carCaring.actions.length > 0 ? vm.carCaring.actions : ["Wash", "Refuel", "Repair"];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.carScreenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.carHeroSection}>
        <View style={styles.carHeroWrap}>
          <View style={styles.carHeroCard}>
            <Ionicons name="car-sport" size={64} color="#2563eb" />
          </View>
          {stats.cleanliness < 40 ? (
            <View style={styles.carStatusBadgeTop}>
              <Text style={styles.carStatusBadgeText}>Dirty!</Text>
            </View>
          ) : null}
          {stats.fuel < 20 ? (
            <View style={styles.carStatusBadgeBottom}>
              <Text style={styles.carStatusBadgeBottomText}>Low Fuel!</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.carPanel}>
          <Text style={styles.carName}>{vm.carCaring.carName || "My Car"}</Text>

          <View style={styles.stackGap}>
            <View>
              <View style={styles.carMetricHeader}>
                <Text style={styles.carMetricLabel}>Cleanliness</Text>
                <Text style={styles.carMetricValue}>{clampPercent(stats.cleanliness)}%</Text>
              </View>
              <ProgressBar value={stats.cleanliness} color="#60a5fa" />
            </View>

            <View>
              <View style={styles.carMetricHeader}>
                <Text style={styles.carMetricLabel}>Fuel</Text>
                <Text style={styles.carMetricValue}>{clampPercent(stats.fuel)}%</Text>
              </View>
              <ProgressBar value={stats.fuel} color="#facc15" />
            </View>

            <View>
              <View style={styles.carMetricHeader}>
                <Text style={styles.carMetricLabel}>Health</Text>
                <Text style={styles.carMetricValue}>{clampPercent(stats.health)}%</Text>
              </View>
              <ProgressBar value={stats.health} color="#4ade80" />
            </View>
          </View>
        </View>

        <Text style={styles.carMessage}>{message}</Text>
      </View>

      <View style={styles.carActionGrid}>
        {actions.map((action) => {
          const lower = action.toLowerCase();
          const icon: keyof typeof Ionicons.glyphMap =
            lower === "wash" ? "water-outline" : lower === "refuel" ? "flash-outline" : "construct-outline";
          return (
            <Pressable
              key={action}
              style={styles.carActionBtn}
              onPress={async () => {
                if (busyAction) return;
                setBusyAction(action);
                setError("");
                setStats((prev) => {
                  if (lower === "wash") {
                    return { ...prev, cleanliness: Math.min(100, prev.cleanliness + 30) };
                  }
                  if (lower === "refuel") {
                    return { ...prev, fuel: Math.min(100, prev.fuel + 40) };
                  }
                  return { ...prev, health: Math.min(100, prev.health + 20) };
                });
                setMessage(lower === "wash" ? "Car washed! Sparkling clean." : lower === "refuel" ? "Tank full! Ready to go." : "Repairs done! Good as new.");
                try {
                  await runMiniApp(app.id, action, { action });
                } catch (err) {
                  setError(formatApiError(err));
                } finally {
                  setBusyAction("");
                }
              }}
            >
              <View style={styles.carActionIcon}>
                {busyAction === action ? <ActivityIndicator size="small" color="#2563eb" /> : <Ionicons name={icon} size={20} color="#2563eb" />}
              </View>
              <Text style={styles.carActionText}>{action}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </ScrollView>
  );
}

function DashboardView({ vm }: { vm: MiniAppViewModel }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.dashboardHero}>
        <Text style={styles.dashboardHeroLabel}>运营看板</Text>
        <Text style={styles.dashboardHeroValue}>
          {vm.dashboardPanels.reduce((sum, item) => sum + Number(item.value || 0), 0)}
        </Text>
        <Text style={styles.dashboardHeroHint}>聚合本轮核心指标与节奏信号</Text>
      </View>

      <View style={styles.dashboardGrid}>
        {vm.dashboardPanels.map((item) => (
          <View key={item.id} style={styles.dashboardCard}>
            <View style={styles.dashboardCardHeader}>
              <Text style={styles.dashboardCardLabel}>{item.label}</Text>
              <Ionicons name={trendIcon(item.trend)} size={14} color={trendColor(item.trend)} />
            </View>
            <Text style={styles.dashboardCardValue}>{item.value}</Text>
            <Text style={[styles.dashboardCardDelta, { color: trendColor(item.trend) }]}>{item.delta}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function GenericView({ app, vm }: { app: MiniApp; vm: MiniAppViewModel }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.stackGap}>
        {vm.genericBlocks.map((block) => {
          if (block.kind === "title") {
            return (
              <View key={block.id} style={styles.genericHeroCard}>
                <Text style={styles.genericHeroText}>{block.text || app.name}</Text>
              </View>
            );
          }
          if (block.kind === "paragraph") {
            return (
              <View key={block.id} style={styles.genericCard}>
                <Text style={styles.genericText}>{block.text || vm.lastRunOutput || app.summary}</Text>
              </View>
            );
          }
          if (block.kind === "chips") {
            return (
              <View key={block.id} style={styles.genericCard}>
                <View style={styles.flashChipCard}>
                  {(block.items || []).map((item, index) => (
                    <View key={`${block.id}_${index}`} style={styles.flashChip}>
                      <Text style={styles.flashChipText}>{String(item.label || `Item ${index + 1}`)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          }
          if (block.kind === "list") {
            return (
              <View key={block.id} style={styles.genericCard}>
                {(block.items || []).map((item, index) => (
                  <View key={`${block.id}_item_${index}`} style={styles.genericListItem}>
                    <Text style={styles.genericListTitle}>{String(item.title || item.label || `Item ${index + 1}`)}</Text>
                    <Text style={styles.genericListText}>{String(item.summary || item.value || "")}</Text>
                  </View>
                ))}
              </View>
            );
          }
          if (block.kind === "stats") {
            return (
              <View key={block.id} style={styles.dashboardGrid}>
                {(block.items || []).map((item, index) => (
                  <View key={`${block.id}_stat_${index}`} style={styles.dashboardCard}>
                    <Text style={styles.dashboardCardLabel}>{String(item.label || `Stat ${index + 1}`)}</Text>
                    <Text style={styles.dashboardCardValue}>{String(item.value || 0)}</Text>
                    <Text style={styles.dashboardCardDelta}>{String(item.delta || "")}</Text>
                  </View>
                ))}
              </View>
            );
          }
          return (
            <View key={block.id} style={styles.genericCard}>
              <Text style={styles.genericText}>{JSON.stringify(block.value || block.items || block.text || {}, null, 2)}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

export function MiniAppRenderer({ app }: Props) {
  const vm = useMemo(() => buildMiniAppViewModel(app), [app]);
  const accent = vm.color || "#2563eb";

  if (vm.uiType === "news_feed") {
    return <NewsFeedView vm={vm} accent={accent} />;
  }
  if (vm.uiType === "flashcard") {
    return <FlashcardView app={app} data={vm.flashcard} />;
  }
  if (vm.uiType === "price_tracker") {
    return <PriceTrackerView vm={vm} />;
  }
  if (vm.uiType === "task_list") {
    return <TaskListView app={app} vm={vm} />;
  }
  if (vm.uiType === "generative_app") {
    return <GenerativeAppView app={app} vm={vm} />;
  }
  if (vm.uiType === "fashion_designer") {
    return <FashionDesignerView app={app} vm={vm} />;
  }
  if (vm.uiType === "car_caring") {
    return <CarCaringGameView app={app} vm={vm} />;
  }
  if (vm.uiType === "dashboard") {
    return <DashboardView vm={vm} />;
  }
  return <GenericView app={app} vm={vm} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  screenContent: {
    padding: 16,
    paddingBottom: 24,
  },
  flashScreenContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  carScreenContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 20,
  },
  stackGap: {
    gap: 12,
  },
  stackGapLg: {
    gap: 16,
  },
  progressTrack: {
    width: "100%",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  circularWrap: {
    alignItems: "center",
    gap: 4,
  },
  circularLabel: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  circularValue: {
    fontSize: 8,
    fontWeight: "900",
    color: "#374151",
  },
  circularCaption: {
    fontSize: 8,
    fontWeight: "600",
    color: "#6b7280",
  },
  storyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  storyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  storyMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  storySourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  storySourceText: {
    fontSize: 9,
    fontWeight: "800",
  },
  storyMetaInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  storyMetaText: {
    fontSize: 9,
    color: "#6b7280",
  },
  storyTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 6,
  },
  storySummary: {
    fontSize: 11,
    lineHeight: 16,
    color: "#6b7280",
    marginBottom: 12,
  },
  storyFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f9fafb",
  },
  storyHeatWrap: {
    flex: 1,
    gap: 4,
  },
  storyHeatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  storyHeatLabel: {
    fontSize: 8,
    color: "#6b7280",
  },
  storyHeatValue: {
    fontSize: 8,
    fontWeight: "800",
    color: "#f97316",
  },
  storyTagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#f9fafb",
  },
  storyTagText: {
    fontSize: 9,
    color: "#6b7280",
    fontWeight: "600",
  },
  flashStatsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    gap: 12,
  },
  flashStatsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  flashTinyLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  flashStreakRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  flashStreakValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },
  flashStreakUnit: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 3,
  },
  flashReviewWrap: {
    alignItems: "flex-end",
    gap: 3,
  },
  flashReviewValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#7c3aed",
  },
  flashCardOuter: {
    marginBottom: 16,
  },
  flashCardPressable: {
    width: "100%",
    minHeight: 420,
  },
  flashCardStage: {
    width: "100%",
    height: 420,
  },
  flashCardFace: {
    position: "absolute",
    inset: 0,
    borderRadius: 32,
    padding: 28,
    backfaceVisibility: "hidden",
    shadowColor: "#111827",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },
  flashCardFront: {
    backgroundColor: "#ffffff",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  flashCardBack: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    justifyContent: "space-between",
  },
  flashFaceHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  flashDailyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#8b5cf6",
    shadowColor: "#c4b5fd",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
  },
  flashDailyText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#ffffff",
  },
  flashFrontMain: {
    alignItems: "center",
    gap: 10,
  },
  flashWord: {
    fontSize: 34,
    fontWeight: "900",
    color: "#1f2937",
    textAlign: "center",
  },
  flashPronBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  flashPronText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  flashBottomHint: {
    alignItems: "center",
    gap: 8,
  },
  flashHintText: {
    fontSize: 10,
    color: "#6b7280",
    fontWeight: "500",
  },
  flashHintLine: {
    width: 64,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
  },
  flashBackBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  flashBackLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#6b7280",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  flashDefinition: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 22,
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 18,
  },
  flashExampleCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 14,
    gap: 4,
  },
  flashExampleLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  flashExampleText: {
    fontSize: 12,
    lineHeight: 18,
    fontStyle: "italic",
    color: "#4b5563",
  },
  flashHistorySection: {
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
    paddingTop: 14,
    gap: 8,
  },
  flashHistoryLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  flashSupportCards: {
    gap: 10,
    marginBottom: 16,
  },
  flashTipCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ece7ff",
    padding: 14,
    gap: 4,
  },
  flashTipTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#7c3aed",
  },
  flashTipText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#4b5563",
  },
  flashChipCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  flashChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f5f3ff",
    borderWidth: 1,
    borderColor: "#ddd6fe",
  },
  flashChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7c3aed",
  },
  flashNextWrap: {
    alignItems: "center",
  },
  flashNextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  flashNextText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6b7280",
  },
  priceTabs: {
    gap: 8,
    paddingBottom: 6,
    marginBottom: 12,
  },
  priceTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  priceTabActive: {
    borderColor: "#ffffff",
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  priceTabText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6b7280",
  },
  priceTabTextActive: {
    color: "#111827",
  },
  priceCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    gap: 12,
  },
  priceTopRow: {
    flexDirection: "row",
    gap: 12,
  },
  priceThumb: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  priceThumbText: {
    fontSize: 22,
  },
  priceInfo: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  priceTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1f2937",
  },
  priceRetailerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  priceRetailerText: {
    fontSize: 10,
    color: "#6b7280",
  },
  priceStat: {
    alignItems: "flex-end",
    gap: 4,
  },
  priceCurrent: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  priceChangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  priceChangeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  priceBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  priceTrendWrap: {
    gap: 4,
  },
  priceTrendLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  priceDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "#e5e7eb",
  },
  priceDetailBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  priceDetailBtnText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#111827",
  },
  priceExpandedText: {
    fontSize: 11,
    lineHeight: 16,
    color: "#6b7280",
  },
  savingsCard: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: "#fb923c",
    gap: 10,
  },
  savingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  savingsLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffffff",
    textTransform: "uppercase",
  },
  savingsValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  savingsValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#ffffff",
  },
  savingsSuffix: {
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyStateText: {
    fontSize: 12,
    color: "#6b7280",
  },
  taskCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  taskCheck: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  taskCheckDone: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  taskBody: {
    flex: 1,
    gap: 8,
  },
  taskTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    color: "#1f2937",
  },
  taskTitleDone: {
    textDecorationLine: "line-through",
    color: "#9ca3af",
  },
  taskMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  taskPriorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  taskPriorityHigh: {
    backgroundColor: "#fef2f2",
  },
  taskPriorityMedium: {
    backgroundColor: "#fff7ed",
  },
  taskPriorityLow: {
    backgroundColor: "#eff6ff",
  },
  taskPriorityText: {
    fontSize: 9,
    fontWeight: "800",
  },
  taskPriorityTextHigh: {
    color: "#ef4444",
  },
  taskPriorityTextMedium: {
    color: "#f97316",
  },
  taskPriorityTextLow: {
    color: "#3b82f6",
  },
  taskAssigneeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  taskAssigneeText: {
    fontSize: 10,
    color: "#6b7280",
  },
  widgetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  widgetCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    padding: 14,
    gap: 10,
  },
  widgetCardFull: {
    width: "100%",
  },
  widgetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  widgetLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6b7280",
    textTransform: "uppercase",
    flex: 1,
  },
  widgetStatRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    flexWrap: "wrap",
  },
  widgetStatValue: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111827",
  },
  widgetStatSub: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 4,
  },
  widgetButton: {
    minHeight: 40,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  widgetButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },
  widgetToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  widgetToggleText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#374151",
  },
  widgetToggleTrack: {
    width: 40,
    height: 20,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    padding: 2,
  },
  widgetToggleTrackOn: {
    backgroundColor: "#22c55e",
  },
  widgetToggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  widgetToggleThumbOn: {
    marginLeft: 20,
  },
  widgetList: {
    gap: 8,
  },
  widgetListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#f3f4f6",
    gap: 12,
  },
  widgetListLabel: {
    fontSize: 11,
    color: "#374151",
    fontWeight: "600",
    flex: 1,
  },
  widgetListValue: {
    fontSize: 10,
    color: "#111827",
    fontWeight: "800",
  },
  widgetChart: {
    height: 72,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  widgetChartBar: {
    flex: 1,
    backgroundColor: "rgba(59,130,246,0.24)",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  widgetText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#4b5563",
  },
  fashionInputCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    gap: 14,
  },
  fashionSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fashionSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1f2937",
    textTransform: "uppercase",
  },
  fashionInput: {
    minHeight: 96,
    borderRadius: 16,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#f3f4f6",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    lineHeight: 18,
    color: "#111827",
    textAlignVertical: "top",
  },
  fashionUploadBtn: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  fashionUploadText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6b7280",
  },
  fashionReferencePreview: {
    width: "100%",
    aspectRatio: 1.4,
    borderRadius: 18,
  },
  fashionGenerateBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: "#ec4899",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  fashionGenerateBtnDisabled: {
    opacity: 0.72,
  },
  fashionGenerateText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
  },
  fashionResultGrid: {
    flexDirection: "row",
    gap: 12,
  },
  fashionResultCol: {
    flex: 1,
    gap: 8,
  },
  fashionResultLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 4,
  },
  fashionResultLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  fashionResultCard: {
    aspectRatio: 0.75,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  fashionResultImage: {
    width: "100%",
    height: "100%",
  },
  fashionPlanCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    padding: 20,
    gap: 14,
  },
  fashionPlanText: {
    fontSize: 12,
    lineHeight: 19,
    color: "#4b5563",
  },
  carHeroSection: {
    alignItems: "center",
    gap: 18,
  },
  carHeroWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  carHeroCard: {
    width: 192,
    height: 128,
    borderRadius: 28,
    backgroundColor: "#dbeafe",
    borderWidth: 4,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563eb",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  carStatusBadgeTop: {
    position: "absolute",
    top: -8,
    right: -6,
    backgroundColor: "#facc15",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  carStatusBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#111827",
  },
  carStatusBadgeBottom: {
    position: "absolute",
    left: -6,
    bottom: -8,
    backgroundColor: "#ef4444",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  carStatusBadgeBottomText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#ffffff",
  },
  carPanel: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    padding: 20,
    gap: 16,
  },
  carName: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    color: "#1f2937",
  },
  carMetricHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  carMetricLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7280",
  },
  carMetricValue: {
    fontSize: 11,
    fontWeight: "800",
    color: "#374151",
  },
  carMessage: {
    minHeight: 20,
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
  carActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  carActionBtn: {
    width: "31%",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  carActionIcon: {
    minHeight: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  carActionText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#374151",
  },
  dashboardHero: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    padding: 18,
    gap: 6,
    marginBottom: 12,
  },
  dashboardHeroLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  dashboardHeroValue: {
    fontSize: 30,
    fontWeight: "900",
    color: "#111827",
  },
  dashboardHeroHint: {
    fontSize: 12,
    color: "#6b7280",
  },
  dashboardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  dashboardCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    padding: 16,
    gap: 8,
  },
  dashboardCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dashboardCardLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: "700",
    color: "#6b7280",
  },
  dashboardCardValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
  },
  dashboardCardDelta: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6b7280",
  },
  genericHeroCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  genericHeroText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1d4ed8",
  },
  genericCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    padding: 16,
    gap: 10,
  },
  genericText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#4b5563",
  },
  genericListItem: {
    gap: 4,
  },
  genericListTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },
  genericListText: {
    fontSize: 11,
    lineHeight: 16,
    color: "#6b7280",
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#dc2626",
  },
});
