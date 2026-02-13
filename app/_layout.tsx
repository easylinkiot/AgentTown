import { Stack } from "expo-router";
import React from "react";

import { AgentTownProvider } from "@/src/state/agenttown-context";

export { ErrorBoundary } from "expo-router";

export default function RootLayout() {
  return (
    <AgentTownProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#f3f4f6" },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="config" />
        <Stack.Screen name="town-map" />
        <Stack.Screen name="living-room" />
      </Stack>
    </AgentTownProvider>
  );
}
