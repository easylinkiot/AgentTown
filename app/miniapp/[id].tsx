import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MiniAppOverlayRenderer } from "@/src/components/MiniAppOverlayRenderer";
import { EmptyState } from "@/src/components/StateBlocks";
import { KeyframeBackground } from "@/src/components/KeyframeBackground";
import { APP_SAFE_AREA_EDGES } from "@/src/constants/safe-area";
import { tx } from "@/src/i18n/translate";
import { useAgentTown } from "@/src/state/agenttown-context";

export default function MiniAppDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { miniApps, language } = useAgentTown();
  const tr = (zh: string, en: string) => tx(language, zh, en);

  const app = useMemo(
    () => miniApps.find((item) => item.id === String(params.id || "")) || null,
    [miniApps, params.id]
  );

  if (!app) {
    return (
      <KeyframeBackground>
        <SafeAreaView edges={APP_SAFE_AREA_EDGES} style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 16 }}>
            <EmptyState
              title={tr("Mini App 不存在", "Mini app not found")}
              hint={tr("请返回后重试", "Go back and try again")}
              icon="alert-circle-outline"
            />
          </View>
        </SafeAreaView>
      </KeyframeBackground>
    );
  }

  return (
    <KeyframeBackground>
      <SafeAreaView edges={APP_SAFE_AREA_EDGES} style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <MiniAppOverlayRenderer app={app} visible onClose={() => router.back()} />
        </View>
      </SafeAreaView>
    </KeyframeBackground>
  );
}
