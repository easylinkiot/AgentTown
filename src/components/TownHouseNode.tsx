import React from "react";
import { StyleSheet, View } from "react-native";

import { LotVisualType } from "@/src/features/townmap/world";

interface TownHouseNodeProps {
  type: LotVisualType;
  selected?: boolean;
  scale?: number;
}

const HOUSE_PALETTE: Record<
  Exclude<LotVisualType, "market-stall">,
  { roof: string; wall: string; door: string }
> = {
  "red-cottage": { roof: "#c92a2a", wall: "#fff7ed", door: "#78350f" },
  "blue-villa": { roof: "#3b5bdb", wall: "#ffffff", door: "#5c4033" },
  "dark-cabin": { roof: "#343a40", wall: "#f8f9fa", door: "#495057" },
  "brown-manor": { roof: "#78350f", wall: "#fffbeb", door: "#451a03" },
  "river-lodge": { roof: "#0f766e", wall: "#ecfeff", door: "#115e59" },
  "sea-villa": { roof: "#1d4ed8", wall: "#eff6ff", door: "#1e3a8a" },
  "mountain-chalet": { roof: "#57534e", wall: "#f5f5f4", door: "#44403c" },
};

export function TownHouseNode({
  type,
  selected = false,
  scale = 1,
}: TownHouseNodeProps) {
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

  const palette = HOUSE_PALETTE[type];

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

const styles = StyleSheet.create({
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
});

