import React from "react";
import { StyleSheet, View } from "react-native";

const COLORS = [
  { roof: "#b91c1c", wall: "#ffedd5" },
  { roof: "#334155", wall: "#dbeafe" },
  { roof: "#312e81", wall: "#f9fafb" },
  { roof: "#92400e", wall: "#fef3c7" },
];

export function HousePreview({ type = 0, scale = 1 }: { type?: number; scale?: number }) {
  const palette = COLORS[type % COLORS.length];

  return (
    <View style={[styles.container, { transform: [{ scale }] }]}>
      <View
        style={[
          styles.roof,
          {
            borderBottomColor: palette.roof,
          },
        ]}
      />
      <View style={[styles.wall, { backgroundColor: palette.wall }]}>
        <View style={styles.door} />
      </View>
      <View style={styles.shadow} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  roof: {
    width: 0,
    height: 0,
    borderLeftWidth: 26,
    borderRightWidth: 26,
    borderBottomWidth: 28,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  wall: {
    width: 42,
    height: 34,
    marginTop: -1,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 2,
  },
  door: {
    width: 12,
    height: 16,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: "#78350f",
  },
  shadow: {
    width: 50,
    height: 6,
    marginTop: 2,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
});
