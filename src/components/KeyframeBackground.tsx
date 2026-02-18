import React from "react";
import { StyleSheet, View } from "react-native";

export function KeyframeBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={[styles.blob, styles.blobBlue]} />
      <View pointerEvents="none" style={[styles.blob, styles.blobPurple]} />
      <View pointerEvents="none" style={[styles.blob, styles.blobPink]} />
      <View pointerEvents="none" style={styles.vignette} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#070a14",
  },
  blob: {
    position: "absolute",
    width: 440,
    height: 440,
    borderRadius: 440,
    opacity: 0.55,
  },
  blobBlue: {
    top: -170,
    left: -170,
    backgroundColor: "rgba(59,130,246,0.35)",
  },
  blobPurple: {
    top: 140,
    right: -220,
    backgroundColor: "rgba(139,92,246,0.28)",
  },
  blobPink: {
    bottom: -220,
    left: -170,
    backgroundColor: "rgba(236,72,153,0.22)",
  },
  vignette: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.22)",
  },
});

