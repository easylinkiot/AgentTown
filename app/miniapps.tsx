import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { KeyframeBackground } from "@/src/components/KeyframeBackground";
import { MiniAppStoreModal } from "@/src/components/MiniAppStoreModal";
import { APP_SAFE_AREA_EDGES } from "@/src/constants/safe-area";
import { findInstalledAppForDescriptor, getMiniToolStoreEntries, MiniToolStoreEntry } from "@/src/features/miniapps/parity-registry";
import { formatApiError } from "@/src/lib/api";
import { useAgentTown } from "@/src/state/agenttown-context";

export default function MiniAppsScreen() {
  const router = useRouter();
  const { miniApps, generateMiniApp, installMiniApp, installPresetMiniApp } = useAgentTown();
  const [busyId, setBusyId] = useState<string | null>(null);

  const installedStoreIds = useMemo(
    () =>
      getMiniToolStoreEntries()
        .filter((entry) => findInstalledAppForDescriptor(miniApps, entry.install)?.installed)
        .map((entry) => entry.id),
    [miniApps]
  );

  const handleAdd = async (entry: MiniToolStoreEntry) => {
    if (busyId) return;
    setBusyId(entry.id);
    try {
      const existing = findInstalledAppForDescriptor(miniApps, entry.install);
      if (existing?.installed) {
        router.replace(`/miniapp/${existing.id}`);
        return;
      }
      if (entry.install.presetKey) {
        const app = await installPresetMiniApp(entry.install.presetKey);
        router.replace(`/miniapp/${app.id}`);
        return;
      }
      const created = await generateMiniApp(entry.install.query || "", entry.install.sources || []);
      if (!created) {
        throw new Error("Failed to generate mini app");
      }
      await installMiniApp(created.id, true);
      router.replace(`/miniapp/${created.id}`);
    } catch (err) {
      console.warn(formatApiError(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <KeyframeBackground>
      <SafeAreaView edges={APP_SAFE_AREA_EDGES} style={{ flex: 1 }}>
        <MiniAppStoreModal
          visible
          installedItemIds={installedStoreIds}
          busyItemId={busyId}
          onClose={() => router.back()}
          onAddApp={(entry) => {
            void handleAdd(entry);
          }}
        />
      </SafeAreaView>
    </KeyframeBackground>
  );
}
