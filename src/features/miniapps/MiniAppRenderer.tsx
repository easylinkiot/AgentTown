import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MiniApp } from "@/src/types";

import { buildMiniAppViewModel } from "./model";

type Props = {
  app: MiniApp;
};

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

function trendIcon(trend: "up" | "down" | "stable"): keyof typeof Ionicons.glyphMap {
  if (trend === "up") return "trending-up-outline";
  if (trend === "down") return "trending-down-outline";
  return "remove-outline";
}

function trendColor(trend: "up" | "down" | "stable") {
  if (trend === "up") return "#ef4444";
  if (trend === "down") return "#22c55e";
  return "#64748b";
}

export function MiniAppRenderer({ app }: Props) {
  const vm = useMemo(() => buildMiniAppViewModel(app), [app]);
  const [flipped, setFlipped] = useState(false);
  const accent = vm.color || "#2563eb";
  const accentSoft = hexToRgba(accent, 0.1);
  const accentLine = hexToRgba(accent, 0.24);

  if (vm.uiType === "news_feed") {
    const featured = vm.newsItems[0];
    const list = vm.newsItems.slice(1, 5);
    if (!featured) {
      return (
        <View style={styles.posterSingleCard}>
          <Text style={styles.posterSummary}>{vm.lastRunOutput || app.summary}</Text>
        </View>
      );
    }
    return (
      <View style={styles.posterSection}>
        <View style={[styles.posterSingleCard, styles.featuredCard, { backgroundColor: accentSoft, borderColor: accentLine }]}>
          <View style={styles.rowBetween}>
            <View style={[styles.pill, { borderColor: accentLine }]}>
              <Text style={[styles.pillText, { color: accent }]}>{(featured.tag || "TREND").toUpperCase()}</Text>
            </View>
            <Text style={styles.heatValue}>{clampPercent(featured.heat)}</Text>
          </View>
          <Text style={styles.featuredTitle}>{featured.title}</Text>
          <Text style={styles.posterSummary}>{featured.summary}</Text>
          {featured.insight ? <Text style={styles.featuredInsight}>Insight: {featured.insight}</Text> : null}
          <View style={styles.rowInline}>
            <Text style={[styles.posterHint, styles.posterHintStrong]}>{featured.source}</Text>
            <Text style={styles.posterHint}>·</Text>
            <Text style={styles.posterHint}>{featured.time}</Text>
          </View>
        </View>

        {list.map((item, index) => (
          <View key={item.id} style={styles.posterItem}>
            <Text style={styles.posterIndex}>{String(index + 2).padStart(2, "0")}</Text>
            <View style={styles.posterBody}>
              <Text style={styles.posterTitle}>{item.title}</Text>
              <View style={styles.posterMetaRow}>
                <Text style={styles.posterSource}>{item.source}</Text>
                <Text style={styles.posterHint}>{item.time}</Text>
                {!!item.tag ? <Text style={styles.posterHint}>#{item.tag}</Text> : null}
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (vm.uiType === "flashcard") {
    return (
      <Pressable
        style={[styles.posterSingleCard, styles.flashCard, { borderColor: accentLine, backgroundColor: accentSoft }]}
        onPress={() => setFlipped((v) => !v)}
      >
        {!flipped ? (
          <>
            <Text style={styles.flashWord}>{vm.flashcard.word}</Text>
            <Text style={styles.flashPron}>{vm.flashcard.pronunciation}</Text>
            <View style={styles.chipWrap}>
              {vm.flashcard.collocations.slice(0, 3).map((item, idx) => (
                <View key={`col_${idx}`} style={[styles.chip, { borderColor: accentLine, backgroundColor: "#ffffff" }]}>
                  <Text style={[styles.chipText, { color: accent }]}>{item}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.posterHint}>Tap to flip</Text>
          </>
        ) : (
          <View style={styles.posterBody}>
            <Text style={styles.posterSummary}>{vm.flashcard.definition}</Text>
            {!!vm.flashcard.example ? <Text style={styles.posterHint}>{vm.flashcard.example}</Text> : null}
            {!!vm.flashcard.memoryTip ? <Text style={styles.posterHint}>Tip: {vm.flashcard.memoryTip}</Text> : null}
            {!!vm.flashcard.quiz ? <Text style={styles.posterHint}>Quiz: {vm.flashcard.quiz}</Text> : null}
            <Text style={styles.posterHint}>
              Synonyms: {vm.flashcard.synonyms.join(", ") || "-"}
            </Text>
            <Text style={styles.posterHint}>
              Antonyms: {vm.flashcard.antonyms.join(", ") || "-"}
            </Text>
          </View>
        )}
      </Pressable>
    );
  }

  if (vm.uiType === "price_tracker") {
    return (
      <View style={styles.posterSection}>
        {vm.priceItems.map((item) => {
          const down = item.trend === "down";
          const up = item.trend === "up";
          const discount = item.discountPct > 0 ? item.discountPct : item.originalPrice > 0 ? ((item.originalPrice - item.price) / item.originalPrice) * 100 : 0;
          return (
            <View key={item.id} style={[styles.posterItemNoIndex, { borderColor: accentLine }]}>
              <View style={styles.rowBetween}>
                <Text style={styles.posterTitle}>{item.product}</Text>
                <View style={[styles.badgeSoft, { backgroundColor: down ? "rgba(34,197,94,0.14)" : up ? "rgba(239,68,68,0.14)" : "rgba(100,116,139,0.14)" }]}>
                  <Ionicons name={trendIcon(item.trend)} size={12} color={trendColor(item.trend)} />
                  <Text style={styles.badgeText}>{clampPercent(discount)}% OFF</Text>
                </View>
              </View>
              <View style={styles.rowBetween}>
                <View style={styles.rowInline}>
                  <Text style={styles.priceText}>${item.price.toFixed(2)}</Text>
                  <Text style={styles.oldPrice}>${item.originalPrice.toFixed(2)}</Text>
                </View>
                <Text style={styles.posterHint}>{item.retailer}</Text>
              </View>
              <View style={styles.dealTrack}>
                <View style={[styles.dealFill, { width: `${clampPercent(discount)}%`, backgroundColor: down ? "#22c55e" : up ? "#ef4444" : "#64748b" }]} />
              </View>
              {!!item.note ? <Text style={styles.posterHint}>{item.note}</Text> : null}
            </View>
          );
        })}
      </View>
    );
  }

  if (vm.uiType === "dashboard") {
    return (
      <View style={styles.gridWrap}>
        {vm.dashboardPanels.map((item) => (
          <View key={item.id} style={[styles.posterSingleCard, styles.gridCard, { borderColor: accentLine }]}>
            <View style={styles.rowBetween}>
              <Text style={styles.posterHint}>{item.label}</Text>
              <Ionicons name={trendIcon(item.trend)} size={14} color={trendColor(item.trend)} />
            </View>
            <Text style={styles.gridValue}>{item.value}</Text>
            <Text style={[styles.gridDelta, { color: trendColor(item.trend) }]}>{item.delta}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (vm.genericBlocks.length > 0) {
    return (
      <View style={styles.posterSection}>
        {vm.genericBlocks.map((block) => {
          if (block.kind === "title") {
            return (
              <View key={block.id} style={[styles.posterSingleCard, { backgroundColor: accentSoft, borderColor: accentLine }]}>
                <Text style={styles.posterTitle}>{block.text || app.name}</Text>
              </View>
            );
          }
          if (block.kind === "paragraph") {
            return (
              <View key={block.id} style={styles.posterSingleCard}>
                <Text style={styles.posterSummary}>{block.text || vm.lastRunOutput || app.summary}</Text>
              </View>
            );
          }
          if (block.kind === "chips") {
            return (
              <View key={block.id} style={styles.posterSingleCard}>
                <View style={styles.chipWrap}>
                  {(block.items || []).map((item, idx) => (
                    <View key={`${block.id}_${idx}`} style={[styles.chip, { borderColor: accentLine, backgroundColor: accentSoft }]}>
                      <Text style={[styles.chipText, { color: accent }]}>{String(item.label || item.text || item.name || "Item")}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          }
          if (block.kind === "list") {
            return (
              <View key={block.id} style={styles.posterSingleCard}>
                {(block.items || []).map((item, idx) => (
                  <View key={`${block.id}_list_${idx}`} style={styles.genericListItem}>
                    <Text style={styles.posterTitle}>{String(item.title || item.name || `Item ${idx + 1}`)}</Text>
                    <Text style={styles.posterHint}>{String(item.summary || item.description || item.value || "")}</Text>
                  </View>
                ))}
              </View>
            );
          }
          if (block.kind === "stats") {
            return (
              <View key={block.id} style={styles.gridWrap}>
                {(block.items || []).map((item, idx) => (
                  <View key={`${block.id}_stat_${idx}`} style={[styles.posterSingleCard, styles.gridCard]}>
                    <Text style={styles.posterHint}>{String(item.label || item.name || "Metric")}</Text>
                    <Text style={styles.gridValue}>{String(item.value || 0)}</Text>
                    <Text style={styles.gridDelta}>{String(item.delta || "")}</Text>
                  </View>
                ))}
              </View>
            );
          }
          return (
            <View key={block.id} style={styles.posterSingleCard}>
              <Text style={styles.posterHint}>{JSON.stringify(block.value || block.items || {}, null, 2)}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.posterSingleCard}>
      <Text style={styles.posterSummary}>{vm.lastRunOutput || app.summary}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  posterSection: {
    gap: 10,
  },
  featuredCard: {
    gap: 10,
  },
  featuredTitle: {
    color: "#0f172a",
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 26,
  },
  featuredInsight: {
    color: "rgba(15,23,42,0.68)",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#ffffff",
  },
  pillText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  heatValue: {
    color: "rgba(15,23,42,0.28)",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1,
  },
  posterItem: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  posterItemNoIndex: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  posterSingleCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    backgroundColor: "#ffffff",
    padding: 12,
    gap: 8,
  },
  posterIndex: {
    color: "rgba(15,23,42,0.14)",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 30,
    width: 42,
    textAlign: "center",
    marginTop: 2,
  },
  posterBody: {
    flex: 1,
    gap: 6,
  },
  posterTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22,
  },
  posterMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  posterSource: {
    color: "#2563eb",
    fontSize: 11,
    fontWeight: "900",
  },
  posterSummary: {
    flex: 1,
    color: "rgba(15,23,42,0.62)",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  posterHint: {
    color: "rgba(15,23,42,0.55)",
    fontSize: 11,
    fontWeight: "700",
  },
  posterHintStrong: {
    color: "rgba(15,23,42,0.78)",
  },
  flashCard: {
    minHeight: 240,
    justifyContent: "center",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  rowInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  flashWord: {
    color: "#0f172a",
    fontSize: 30,
    fontWeight: "900",
  },
  flashPron: {
    color: "rgba(15,23,42,0.55)",
    fontSize: 13,
    fontWeight: "800",
  },
  priceText: {
    color: "#0f172a",
    fontSize: 19,
    fontWeight: "900",
  },
  oldPrice: {
    color: "rgba(148,163,184,0.9)",
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "line-through",
  },
  badgeSoft: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  badgeText: {
    color: "#0f172a",
    fontSize: 10,
    fontWeight: "900",
  },
  dealTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.08)",
    overflow: "hidden",
  },
  dealFill: {
    height: "100%",
    borderRadius: 999,
  },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridCard: {
    width: "48%",
  },
  gridValue: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "900",
  },
  gridDelta: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "800",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "800",
  },
  genericListItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    backgroundColor: "#f8fafc",
    padding: 10,
    gap: 4,
    marginBottom: 8,
  },
});
