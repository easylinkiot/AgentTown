import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MiniApp } from "@/src/types";

import { buildMiniAppViewModel } from "./model";

type Props = {
  app: MiniApp;
};

export function MiniAppRenderer({ app }: Props) {
  const vm = useMemo(() => buildMiniAppViewModel(app), [app]);
  const [flipped, setFlipped] = useState(false);

  if (vm.uiType === "news_feed") {
    return (
      <View style={styles.posterSection}>
        {vm.newsItems.map((item, index) => (
          <View key={item.id} style={styles.posterItem}>
            <Text style={styles.posterIndex}>{String(index + 1).padStart(2, "0")}</Text>
            <View style={styles.posterBody}>
              <Text style={styles.posterTitle}>{item.title}</Text>
              <View style={styles.posterMetaRow}>
                <Text style={styles.posterSource}>{item.source}</Text>
                <Text style={styles.posterSummary} numberOfLines={1}>
                  {item.summary}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (vm.uiType === "flashcard") {
    return (
      <Pressable style={[styles.posterSingleCard, styles.flashCard]} onPress={() => setFlipped((v) => !v)}>
        {!flipped ? (
          <>
            <Text style={styles.flashWord}>{vm.flashcard.word}</Text>
            <Text style={styles.flashPron}>{vm.flashcard.pronunciation}</Text>
            <Text style={styles.posterHint}>Tap to flip</Text>
          </>
        ) : (
          <>
            <Text style={styles.posterSummary}>{vm.flashcard.definition}</Text>
            <Text style={styles.posterSummary}>{vm.flashcard.example}</Text>
            <Text style={styles.posterHint}>
              Synonyms: {vm.flashcard.synonyms.join(", ") || "-"}
            </Text>
          </>
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
          return (
            <View key={item.id} style={styles.posterItemNoIndex}>
              <View style={styles.rowBetween}>
                <Text style={styles.posterTitle}>{item.product}</Text>
                <View style={styles.rowInline}>
                  <Ionicons
                    name={down ? "trending-down-outline" : up ? "trending-up-outline" : "remove-outline"}
                    size={14}
                    color={down ? "#22c55e" : up ? "#ef4444" : "#94a3b8"}
                  />
                  <Text style={styles.posterHint}>{item.retailer}</Text>
                </View>
              </View>
              <View style={styles.rowInline}>
                <Text style={styles.priceText}>${item.price.toFixed(2)}</Text>
                <Text style={styles.oldPrice}>${item.originalPrice.toFixed(2)}</Text>
              </View>
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
          <View key={item.id} style={[styles.posterSingleCard, styles.gridCard]}>
            <Text style={styles.posterHint}>{item.label}</Text>
            <Text style={styles.gridValue}>{item.value}</Text>
            <Text style={styles.gridDelta}>{item.delta}</Text>
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
              <View key={block.id} style={styles.posterSingleCard}>
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
                    <View key={`${block.id}_${idx}`} style={styles.chip}>
                      <Text style={styles.chipText}>{String(item.label || item.text || item.name || "Item")}</Text>
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
  },
  posterSource: {
    color: "#2563eb",
    fontSize: 11,
    fontWeight: "900",
  },
  posterSummary: {
    flex: 1,
    color: "rgba(15,23,42,0.60)",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  posterHint: {
    color: "rgba(15,23,42,0.55)",
    fontSize: 11,
    fontWeight: "700",
  },
  flashCard: {
    minHeight: 220,
    alignItems: "center",
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
  },
  flashWord: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "900",
  },
  flashPron: {
    color: "rgba(15,23,42,0.55)",
    fontSize: 12,
    fontWeight: "700",
  },
  priceText: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "900",
  },
  oldPrice: {
    color: "rgba(148,163,184,0.85)",
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "line-through",
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
    backgroundColor: "rgba(37,99,235,0.10)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.22)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    color: "#1d4ed8",
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
