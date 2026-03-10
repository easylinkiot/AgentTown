import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StateBanner } from "@/src/components/StateBlocks";
import type { MentionPickerItem } from "@/src/features/chat/mention-picker";

type MentionPickerModalProps = {
  visible: boolean;
  items: MentionPickerItem[];
  loading: boolean;
  error: string | null;
  isMultiSelectMode: boolean;
  selectedItems: MentionPickerItem[];
  searchKeyword: string;
  translate: (zh: string, en: string) => string;
  onClose: () => void;
  onRetry: () => void;
  onToggleMultiSelectMode: () => void;
  onSelectItem: (item: MentionPickerItem) => void;
  onDone: () => void;
  onSearchKeywordChange: (value: string) => void;
};

function toMentionTestId(key: string) {
  return key.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function MentionAvatar({ item }: { item: MentionPickerItem }) {
  if (item.avatar) {
    return <Image source={{ uri: item.avatar }} style={styles.avatar} />;
  }

  const isNpc = item.type === "npc";
  return (
    <View style={[styles.avatar, styles.avatarFallback, isNpc ? styles.avatarFallbackNpc : styles.avatarFallbackUser]}>
      <Ionicons
        name={isNpc ? "sparkles" : "person"}
        size={16}
        color={isNpc ? "rgba(147,197,253,0.98)" : "rgba(226,232,240,0.92)"}
      />
    </View>
  );
}

export function MentionPickerModal({
  visible,
  items,
  loading,
  error,
  isMultiSelectMode,
  selectedItems,
  searchKeyword,
  translate,
  onClose,
  onRetry,
  onToggleMultiSelectMode,
  onSelectItem,
  onDone,
  onSearchKeywordChange,
}: MentionPickerModalProps) {
  const insets = useSafeAreaInsets();
  const selectedKeys = useMemo(() => new Set(selectedItems.map((item) => item.key)), [selectedItems]);
  const actionLabel = isMultiSelectMode ? translate("完成", "Done") : translate("多选", "Multi-select");

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardAvoid}
        >
          <Pressable
            testID="chat-mention-picker-modal"
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
            onPress={() => null}
          >
            <View style={styles.handle} />
            <View style={styles.header}>
              <Pressable testID="chat-mention-picker-close" style={styles.headerIcon} onPress={onClose}>
                <Ionicons name="chevron-down" size={18} color="rgba(226,232,240,0.92)" />
              </Pressable>
              <Text style={styles.title}>{translate("选择提醒的人", "Choose someone to mention")}</Text>
              <Pressable
                testID={isMultiSelectMode ? "chat-mention-picker-done" : "chat-mention-picker-toggle-multi"}
                style={styles.headerAction}
                onPress={isMultiSelectMode ? onDone : onToggleMultiSelectMode}
              >
                <Text style={styles.headerActionText}>{actionLabel}</Text>
              </Pressable>
            </View>

            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color="rgba(148,163,184,0.9)" />
              <TextInput
                testID="chat-mention-picker-search-input"
                value={searchKeyword}
                onChangeText={onSearchKeywordChange}
                placeholder={translate("搜索用户或 NPC", "Search users or NPCs")}
                placeholderTextColor="rgba(148,163,184,0.9)"
                style={styles.searchInput}
                autoComplete="off"
                textContentType="oneTimeCode"
                importantForAutofill="no"
              />
            </View>

            <View style={styles.listWrap}>
              {error ? (
                <StateBanner
                  variant="error"
                  title={translate("加载失败", "Load failed")}
                  message={error}
                  actionLabel={translate("重试", "Retry")}
                  onAction={onRetry}
                />
              ) : null}

              {loading && items.length === 0 ? (
                <View style={styles.stateBox}>
                  <ActivityIndicator size="small" color="rgba(147,197,253,0.98)" />
                  <Text style={styles.stateText}>{translate("正在加载提醒对象...", "Loading mention candidates...")}</Text>
                </View>
              ) : (
                <FlatList
                  data={items}
                  keyExtractor={(item) => item.key}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                  renderItem={({ item }) => {
                    const isSelected = selectedKeys.has(item.key);
                    return (
                      <Pressable
                        testID={`chat-mention-picker-item-${toMentionTestId(item.key)}`}
                        style={[styles.item, isSelected && styles.itemSelected]}
                        onPress={() => onSelectItem(item)}
                      >
                        <View style={styles.itemIdentity}>
                          <MentionAvatar item={item} />
                          <View style={styles.itemCopy}>
                            <View style={styles.itemTitleRow}>
                              <Text style={styles.itemName} numberOfLines={1}>
                                {item.name}
                              </Text>
                              <View style={[styles.typeBadge, item.type === "npc" ? styles.typeBadgeNpc : styles.typeBadgeUser]}>
                                <Text style={styles.typeBadgeText}>{item.type === "npc" ? "NPC" : translate("用户", "User")}</Text>
                              </View>
                            </View>
                            {item.subtitle ? (
                              <Text style={styles.itemSubtitle} numberOfLines={1}>
                                {item.subtitle}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                        {isMultiSelectMode ? (
                          <Ionicons
                            name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                            size={20}
                            color={isSelected ? "rgba(147,197,253,0.98)" : "rgba(100,116,139,0.96)"}
                          />
                        ) : (
                          <Ionicons name="chevron-forward" size={16} color="rgba(100,116,139,0.96)" />
                        )}
                      </Pressable>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.stateBox}>
                      <Text style={styles.stateText}>{translate("没有匹配的提醒对象", "No matching mention candidates")}</Text>
                    </View>
                  }
                />
              )}
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,23,0.58)",
  },
  keyboardAvoid: {
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "rgba(15,23,42,0.98)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 12,
    minHeight: 420,
    maxHeight: "78%",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.36)",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30,41,59,0.88)",
  },
  title: {
    flex: 1,
    marginHorizontal: 10,
    textAlign: "center",
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "800",
  },
  headerAction: {
    minWidth: 56,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59,130,246,0.16)",
  },
  headerActionText: {
    color: "#bfdbfe",
    fontSize: 13,
    fontWeight: "700",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: "rgba(15,23,42,0.72)",
    paddingHorizontal: 14,
    minHeight: 48,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 15,
    paddingVertical: 12,
  },
  listWrap: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
    gap: 10,
  },
  item: {
    minHeight: 68,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(15,23,42,0.8)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemSelected: {
    borderColor: "rgba(96,165,250,0.55)",
    backgroundColor: "rgba(30,41,59,0.96)",
  },
  itemIdentity: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
    marginRight: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(30,41,59,0.95)",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackUser: {
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.22)",
  },
  avatarFallbackNpc: {
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.3)",
  },
  itemCopy: {
    flex: 1,
    gap: 6,
  },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemName: {
    flexShrink: 1,
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
  },
  itemSubtitle: {
    color: "rgba(148,163,184,0.96)",
    fontSize: 12,
  },
  typeBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeUser: {
    backgroundColor: "rgba(34,197,94,0.18)",
  },
  typeBadgeNpc: {
    backgroundColor: "rgba(59,130,246,0.18)",
  },
  typeBadgeText: {
    color: "#e2e8f0",
    fontSize: 10,
    fontWeight: "700",
  },
  stateBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
  },
  stateText: {
    color: "rgba(148,163,184,0.96)",
    fontSize: 13,
  },
});
