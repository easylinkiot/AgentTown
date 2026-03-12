import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

type KeyframeBackgroundVariant = "default" | "home";

type KeyframeBackgroundProps = {
  children: React.ReactNode;
  variant?: KeyframeBackgroundVariant;
};

export function KeyframeBackground({ children, variant = "default" }: KeyframeBackgroundProps) {
  const isHome = variant === "home";

  return (
    <View style={styles.root}>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="bgBaseDefault" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#060915" />
            <Stop offset="48%" stopColor="#080712" />
            <Stop offset="100%" stopColor="#020308" />
          </LinearGradient>
          <LinearGradient id="bgBaseHome" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#050610" />
            <Stop offset="34%" stopColor="#0a0715" />
            <Stop offset="72%" stopColor="#0c0818" />
            <Stop offset="100%" stopColor="#020306" />
          </LinearGradient>
          <LinearGradient id="bgShadeDefault" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="rgba(2,6,23,0.10)" />
            <Stop offset="52%" stopColor="rgba(2,6,23,0.20)" />
            <Stop offset="100%" stopColor="rgba(2,6,23,0.48)" />
          </LinearGradient>
          <LinearGradient id="bgShadeHome" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="rgba(0,0,0,0.04)" />
            <Stop offset="58%" stopColor="rgba(1,2,10,0.10)" />
            <Stop offset="100%" stopColor="rgba(0,0,0,0.26)" />
          </LinearGradient>
          <RadialGradient id="blueGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="rgba(37,99,235,0.34)" />
            <Stop offset="38%" stopColor="rgba(37,99,235,0.12)" />
            <Stop offset="100%" stopColor="rgba(37,99,235,0)" />
          </RadialGradient>
          <RadialGradient id="violetGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="rgba(91,33,182,0.70)" />
            <Stop offset="40%" stopColor="rgba(76,29,149,0.30)" />
            <Stop offset="100%" stopColor="rgba(76,29,149,0)" />
          </RadialGradient>
          <RadialGradient id="magentaGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="rgba(157,23,77,0.38)" />
            <Stop offset="42%" stopColor="rgba(157,23,77,0.12)" />
            <Stop offset="100%" stopColor="rgba(157,23,77,0)" />
          </RadialGradient>
          <RadialGradient id="purpleGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="rgba(109,40,217,0.44)" />
            <Stop offset="45%" stopColor="rgba(109,40,217,0.14)" />
            <Stop offset="100%" stopColor="rgba(109,40,217,0)" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={isHome ? "url(#bgBaseHome)" : "url(#bgBaseDefault)"} />
        <Ellipse
          cx={isHome ? "18%" : "14%"}
          cy={isHome ? "16%" : "12%"}
          rx={isHome ? "24%" : "18%"}
          ry={isHome ? "18%" : "14%"}
          fill="url(#blueGlow)"
          opacity={isHome ? 0.04 : 0.24}
        />
        <Ellipse
          cx={isHome ? "54%" : "52%"}
          cy={isHome ? "54%" : "46%"}
          rx={isHome ? "44%" : "30%"}
          ry={isHome ? "30%" : "22%"}
          fill="url(#violetGlow)"
          opacity={isHome ? 0.16 : 0.28}
        />
        <Ellipse
          cx={isHome ? "56%" : "62%"}
          cy={isHome ? "66%" : "64%"}
          rx={isHome ? "36%" : "24%"}
          ry={isHome ? "26%" : "18%"}
          fill="url(#magentaGlow)"
          opacity={isHome ? 0.04 : 0.18}
        />
        <Ellipse
          cx={isHome ? "78%" : "78%"}
          cy={isHome ? "24%" : "20%"}
          rx={isHome ? "20%" : "16%"}
          ry={isHome ? "16%" : "12%"}
          fill="url(#purpleGlow)"
          opacity={isHome ? 0.03 : 0.14}
        />
        <Rect x="0" y="0" width="100%" height="100%" fill={isHome ? "url(#bgShadeHome)" : "url(#bgShadeDefault)"} />
      </Svg>
      <View pointerEvents="none" style={isHome ? styles.homeVignette : styles.defaultVignette} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#04050c",
  },
  defaultVignette: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.10)",
  },
  homeVignette: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
});
