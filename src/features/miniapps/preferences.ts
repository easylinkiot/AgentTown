import AsyncStorage from "@react-native-async-storage/async-storage";

const HIDDEN_QUICK_ACTIONS_KEY_PREFIX = "agenttown:miniapps:hidden-quick-actions:";

function storageKey(userId?: string) {
  const safeUserId = (userId || "guest").trim() || "guest";
  return `${HIDDEN_QUICK_ACTIONS_KEY_PREFIX}${safeUserId}`;
}

export async function loadHiddenMiniToolQuickActions(userId?: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  } catch {
    return [];
  }
}

export async function saveHiddenMiniToolQuickActions(userId: string | undefined, ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter((item) => item.trim().length > 0)));
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(uniqueIds));
}
