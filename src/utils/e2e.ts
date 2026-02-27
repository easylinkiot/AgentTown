import { NativeModules, Platform } from "react-native";

function readDetoxLaunchArgs() {
  if (Platform.OS === "ios") {
    const settings = NativeModules?.SettingsManager?.settings;
    if (settings && typeof settings === "object") {
      return settings as Record<string, unknown>;
    }
  }

  const detox = NativeModules?.Detox;
  if (detox && typeof detox.launchArgs === "object" && detox.launchArgs) {
    return detox.launchArgs as Record<string, unknown>;
  }

  return null;
}

export function isE2ETestMode() {
  const args = readDetoxLaunchArgs();
  if (!args) return false;
  return Boolean(args.detoxServer || args.detoxSessionId || args.e2eMode);
}
