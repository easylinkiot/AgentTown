import type { Friend, NPC } from "@/src/types";

export type MentionPickerEntityType = "user" | "npc";

export type MentionPickerItem = {
  key: string;
  id: string;
  name: string;
  avatar?: string;
  type: MentionPickerEntityType;
  subtitle?: string;
};

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

export function shouldOpenMentionPicker(value: string) {
  return value.startsWith("@");
}

export function buildMentionPickerItems(friends: Friend[], npcs: NPC[]): MentionPickerItem[] {
  const userItems = friends
    .filter((friend) => friend.kind === "human")
    .map((friend) => ({
      key: `user:${friend.id}`,
      id: friend.id,
      name: friend.name,
      avatar: friend.avatar,
      type: "user" as const,
      subtitle: friend.role || friend.company || "",
    }))
    .filter((item) => item.name.trim().length > 0);

  const npcItems = npcs
    .map((npc) => ({
      key: `npc:${npc.id}`,
      id: npc.id,
      name: npc.name,
      avatar: npc.avatarUrl,
      type: "npc" as const,
      subtitle: npc.intro || "",
    }))
    .filter((item) => item.name.trim().length > 0);

  return [...userItems, ...npcItems];
}

export function filterMentionPickerItems(items: MentionPickerItem[], keyword: string) {
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) return items;
  return items.filter((item) => normalizeText(item.name).includes(normalizedKeyword));
}

export function formatMentionValue(names: string[]) {
  return names
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => `@${name}`)
    .join(" ");
}

export function applyMentionSelection(_input: string, items: Pick<MentionPickerItem, "name">[]) {
  return formatMentionValue(items.map((item) => item.name));
}
