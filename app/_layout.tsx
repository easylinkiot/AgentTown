import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet } from "react-native";

import { AgentTownProvider } from "@/src/state/agenttown-context";
import { AuthProvider, useAuth } from "@/src/state/auth-context";

export { ErrorBoundary } from "expo-router";

function RootStack() {
  const router = useRouter();
  const segments = useSegments();
  const { isHydrated, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isHydrated) return;
    const inSignIn = segments[0] === "sign-in";
    if (!isSignedIn && !inSignIn) {
      router.replace("/sign-in");
      return;
    }
    if (isSignedIn && inSignIn) {
      router.replace("/");
    }
  }, [isHydrated, isSignedIn, router, segments]);

  if (!isHydrated) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#070a14" },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="sign-in" options={{ animation: "fade" }} />
      <Stack.Screen name="index" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="config" />
      <Stack.Screen name="town-map" />
      <Stack.Screen name="living-room" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AgentTownProvider>
        <RootStack />
      </AgentTownProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#070a14",
  },
});
