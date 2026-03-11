import React from "react";
import { Image, StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

const WALLPAPER_URI =
  "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1000&auto=format&fit=crop";

export function KeyframeBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image source={{ uri: WALLPAPER_URI }} style={styles.wallpaper} resizeMode="cover" />
      </View>
      <View pointerEvents="none" style={styles.darkOverlay} />
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="bgShade" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="rgba(0,0,0,0.12)" />
            <Stop offset="60%" stopColor="rgba(0,0,0,0.24)" />
            <Stop offset="100%" stopColor="rgba(0,0,0,0.76)" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bgShade)" />
      </Svg>
      <View pointerEvents="none" style={styles.vignette} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  wallpaper: {
    position: "absolute",
    top: -22,
    right: -22,
    bottom: -22,
    left: -22,
    transform: [{ scale: 1.1 }],
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.40)",
  },
  vignette: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
});
