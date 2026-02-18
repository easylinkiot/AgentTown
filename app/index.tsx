import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatListItem } from "@/src/components/ChatListItem";
import { KeyframeBackground } from "@/src/components/KeyframeBackground";
import { EmptyState, LoadingSkeleton, StateBanner } from "@/src/components/StateBlocks";
import { MiniAppDock } from "@/src/components/MiniAppDock";
import { createChatThread } from "@/src/lib/api";
import { tx } from "@/src/i18n/translate";
import { useAgentTown } from "@/src/state/agenttown-context";
import { ChatThread } from "@/src/types";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    chatThreads,
    friends,
    agents,
    botConfig,
    language,
    bootstrapReady,
    addChatThread,
    createFriend,
    createGroup,
  } = useAgentTown();
  const tr = (zh: string, en: string) => tx(language, zh, en);

  const [peopleModal, setPeopleModal] = useState(false);
  const [friendModal, setFriendModal] = useState(false);
  const [groupModal, setGroupModal] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);

  const [friendName, setFriendName] = useState("");
  const [friendRole, setFriendRole] = useState("");
  const [friendCompany, setFriendCompany] = useState("");
  const [friendAvatar, setFriendAvatar] = useState("");
  const [friendKind, setFriendKind] = useState<"human" | "bot">("human");
  const [creatingFriend, setCreatingFriend] = useState(false);

  const [groupName, setGroupName] = useState("");
  const [groupAvatar, setGroupAvatar] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  const list = useMemo(() => {
    const sorted = [...chatThreads];
    sorted.sort((a, b) => {
      const au = a.unreadCount || 0;
      const bu = b.unreadCount || 0;
      if (au !== bu) return bu - au;
      return (b.time || "").localeCompare(a.time || "");
    });
    return sorted;
  }, [chatThreads]);

  const presence = useMemo(() => {
    const items = [
      ...friends.map((f) => ({ id: `friend:${f.id}`, avatar: f.avatar })),
      ...agents.map((a) => ({ id: `agent:${a.id}`, avatar: a.avatar })),
    ].filter((x) => !!x.avatar);
    if (!items.length) {
      return [{ id: "me", avatar: botConfig.avatar }];
    }
    return items.slice(0, 9);
  }, [agents, botConfig.avatar, friends]);

  const handleOpenThread = (thread: ChatThread) => {
    router.push({
      pathname: "/chat/[id]",
      params: {
        id: thread.id,
        name: thread.name,
        avatar: thread.avatar,
        isGroup: thread.isGroup ? "true" : "false",
      },
    });
  };

  const handleCreateFriend = async () => {
    const safeName = friendName.trim();
    if (!safeName || creatingFriend) return;
    setUiError(null);
    setCreatingFriend(true);

    try {
      const threadId = `dm_${Date.now()}`;
      const avatar =
        friendAvatar.trim() ||
        (friendKind === "bot"
          ? "https://img.freepik.com/premium-psd/3d-cartoon-character-avatar-isolated-3d-rendering_235528-554.jpg?w=200"
          : "https://img.freepik.com/free-psd/3d-illustration-human-avatar-profile_23-2150671142.jpg?w=200");

      const thread: ChatThread = {
        id: threadId,
        name: safeName,
        avatar,
        message: friendRole.trim() || tr("新联系人", "New contact"),
        time: "Now",
        isGroup: false,
        supportsVideo: true,
      };

      const created = await createChatThread(thread);
      addChatThread(created);
      await createFriend({
        name: safeName,
        role: friendRole.trim() || undefined,
        company: friendCompany.trim() || undefined,
        kind: friendKind,
        avatar: created.avatar,
        threadId: created.id,
      });

      setFriendModal(false);
      setPeopleModal(false);
      setFriendName("");
      setFriendRole("");
      setFriendCompany("");
      setFriendAvatar("");
      setFriendKind("human");
      handleOpenThread(created);
    } catch (err) {
      setUiError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingFriend(false);
    }
  };

  const handleCreateGroup = async () => {
    const safeName = groupName.trim();
    if (!safeName || creatingGroup) return;
    setUiError(null);
    setCreatingGroup(true);
    try {
      const created = await createGroup({
        name: safeName,
        avatar: groupAvatar.trim() || undefined,
        memberCount: 1,
      });
      setGroupModal(false);
      setPeopleModal(false);
      setGroupName("");
      setGroupAvatar("");
      if (created) {
        handleOpenThread(created);
      }
    } catch (err) {
      setUiError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingGroup(false);
    }
  };

  return (
    <KeyframeBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.topBar}>
            <Pressable style={styles.profileChip} onPress={() => router.push("/config" as never)}>
              <Image source={{ uri: botConfig.avatar }} style={styles.profileAvatar} />
              <View style={styles.onlineDot} />
            </Pressable>

            <Pressable style={styles.worldMapPill} onPress={() => router.push("/town-map" as never)}>
              <Ionicons name="globe-outline" size={14} color="rgba(226,232,240,0.92)" />
              <Text style={styles.worldMapText}>WORLD MAP</Text>
            </Pressable>

            <View style={styles.topActions}>
              <Pressable style={styles.topIcon} onPress={() => router.push("/town-map" as never)}>
                <Ionicons name="locate-outline" size={16} color="rgba(226,232,240,0.92)" />
              </Pressable>
              <Pressable style={styles.topIcon} onPress={() => setPeopleModal(true)}>
                <Ionicons name="people-outline" size={16} color="rgba(226,232,240,0.92)" />
              </Pressable>
            </View>
          </View>

          <MiniAppDock />

          <Pressable
            style={styles.askBar}
            onPress={() =>
              router.push({
                pathname: "/chat/[id]",
                params: { id: "mybot", name: botConfig.name, avatar: botConfig.avatar, isGroup: "false" },
              })
            }
          >
            <View style={styles.askPlus}>
              <Ionicons name="add" size={16} color="rgba(226,232,240,0.92)" />
            </View>
            <Text style={styles.askPlaceholder}>{tr("Ask anything", "Ask anything")}</Text>
            <View style={styles.askRight}>
              <Ionicons name="mic-outline" size={16} color="rgba(226,232,240,0.75)" />
              <Ionicons name="send" size={16} color="rgba(226,232,240,0.75)" />
            </View>
          </Pressable>

          {uiError ? (
            <StateBanner
              variant="error"
              title={tr("加载失败", "Something went wrong")}
              message={uiError}
              actionLabel={tr("关闭", "Dismiss")}
              onAction={() => setUiError(null)}
            />
          ) : null}

          {!bootstrapReady ? (
            <LoadingSkeleton kind="chat_list" />
          ) : (
            <FlatList
              data={list}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ChatListItem chat={item} language={language} theme="neo" onPress={() => handleOpenThread(item)} />
              )}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <EmptyState
                  title={tr("暂无会话", "No chats yet")}
                  hint={tr("点击右上角创建朋友或群聊", "Tap the top-right icon to add a friend or create a group")}
                />
              }
            />
          )}

          <View style={[styles.presenceBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.presenceScroll}
              contentContainerStyle={styles.presenceRow}
            >
              {presence.map((item) => (
                <View key={item.id} style={styles.presenceItem}>
                  <Image source={{ uri: item.avatar }} style={styles.presenceAvatar} />
                  <View style={styles.presenceDot} />
                </View>
              ))}
            </ScrollView>

            <Pressable style={styles.presenceAdd} onPress={() => setPeopleModal(true)}>
              <Ionicons name="add" size={18} color="rgba(226,232,240,0.92)" />
            </Pressable>
          </View>
        </View>

        <Modal
          visible={peopleModal}
          transparent
          animationType="fade"
          onRequestClose={() => setPeopleModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setPeopleModal(false)}>
            <Pressable style={styles.actionSheet} onPress={() => null}>
              <Text style={styles.sheetTitle}>{tr("快捷入口", "Quick Actions")}</Text>
              <Pressable
                style={styles.sheetItem}
                onPress={() => {
                  setPeopleModal(false);
                  setTimeout(() => setFriendModal(true), 120);
                }}
              >
                <Ionicons name="person-add-outline" size={16} color="#bfdbfe" />
                <Text style={styles.sheetText}>{tr("添加朋友", "Add Friend")}</Text>
              </Pressable>
              <Pressable
                style={styles.sheetItem}
                onPress={() => {
                  setPeopleModal(false);
                  setTimeout(() => setGroupModal(true), 120);
                }}
              >
                <Ionicons name="people-outline" size={16} color="#bfdbfe" />
                <Text style={styles.sheetText}>{tr("新建群聊", "New Group")}</Text>
              </Pressable>
              <Pressable style={styles.sheetItem} onPress={() => router.push("/agents" as never)}>
                <Ionicons name="hardware-chip-outline" size={16} color="#bfdbfe" />
                <Text style={styles.sheetText}>{tr("Agent / Bot", "Agents / Bots")}</Text>
              </Pressable>
              <Pressable style={styles.sheetItem} onPress={() => router.push("/miniapps" as never)}>
                <Ionicons name="apps-outline" size={16} color="#bfdbfe" />
                <Text style={styles.sheetText}>{tr("Mini Apps", "Mini Apps")}</Text>
              </Pressable>
              <Pressable style={styles.sheetClose} onPress={() => setPeopleModal(false)}>
                <Text style={styles.sheetCloseText}>{tr("关闭", "Close")}</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={friendModal} transparent animationType="fade" onRequestClose={() => setFriendModal(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setFriendModal(false)}>
            <Pressable style={styles.formCard} onPress={() => null}>
              <Text style={styles.formTitle}>{tr("添加朋友", "Add Friend")}</Text>
              <TextInput
                value={friendName}
                onChangeText={setFriendName}
                placeholder={tr("名称", "Name")}
                placeholderTextColor="rgba(148,163,184,0.9)"
                style={styles.input}
              />
              <TextInput
                value={friendRole}
                onChangeText={setFriendRole}
                placeholder={tr("角色（可选）", "Role (optional)")}
                placeholderTextColor="rgba(148,163,184,0.9)"
                style={styles.input}
              />
              <TextInput
                value={friendCompany}
                onChangeText={setFriendCompany}
                placeholder={tr("公司（可选）", "Company (optional)")}
                placeholderTextColor="rgba(148,163,184,0.9)"
                style={styles.input}
              />
              <TextInput
                value={friendAvatar}
                onChangeText={setFriendAvatar}
                placeholder={tr("头像 URL（可选）", "Avatar URL (optional)")}
                placeholderTextColor="rgba(148,163,184,0.9)"
                style={styles.input}
              />

              <View style={styles.choiceRow}>
                <Pressable
                  style={[styles.choiceBtn, friendKind === "human" && styles.choiceBtnActive]}
                  onPress={() => setFriendKind("human")}
                >
                  <Text style={styles.choiceText}>{tr("真人", "Human")}</Text>
                </Pressable>
                <Pressable
                  style={[styles.choiceBtn, friendKind === "bot" && styles.choiceBtnActive]}
                  onPress={() => setFriendKind("bot")}
                >
                  <Text style={styles.choiceText}>Bot</Text>
                </Pressable>
              </View>

              <View style={styles.formFooter}>
                <Pressable style={styles.formGhost} onPress={() => setFriendModal(false)}>
                  <Text style={styles.formGhostText}>{tr("取消", "Cancel")}</Text>
                </Pressable>
                <Pressable
                  style={[styles.formCta, (!friendName.trim() || creatingFriend) && styles.formCtaDisabled]}
                  onPress={handleCreateFriend}
                >
                  <Text style={styles.formCtaText}>
                    {creatingFriend ? tr("创建中...", "Creating...") : tr("创建", "Create")}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={groupModal} transparent animationType="fade" onRequestClose={() => setGroupModal(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setGroupModal(false)}>
            <Pressable style={styles.formCard} onPress={() => null}>
              <Text style={styles.formTitle}>{tr("新建群聊", "New Group")}</Text>
              <TextInput
                value={groupName}
                onChangeText={setGroupName}
                placeholder={tr("群名称", "Group name")}
                placeholderTextColor="rgba(148,163,184,0.9)"
                style={styles.input}
              />
              <TextInput
                value={groupAvatar}
                onChangeText={setGroupAvatar}
                placeholder={tr("头像 URL（可选）", "Avatar URL (optional)")}
                placeholderTextColor="rgba(148,163,184,0.9)"
                style={styles.input}
              />
              <View style={styles.formFooter}>
                <Pressable style={styles.formGhost} onPress={() => setGroupModal(false)}>
                  <Text style={styles.formGhostText}>{tr("取消", "Cancel")}</Text>
                </Pressable>
                <Pressable
                  style={[styles.formCta, (!groupName.trim() || creatingGroup) && styles.formCtaDisabled]}
                  onPress={handleCreateGroup}
                >
                  <Text style={styles.formCtaText}>
                    {creatingGroup ? tr("创建中...", "Creating...") : tr("创建", "Create")}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </KeyframeBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 12,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  profileChip: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  profileAvatar: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  onlineDot: {
    position: "absolute",
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#22c55e",
    bottom: 9,
    right: 9,
    borderWidth: 2,
    borderColor: "rgba(15,23,42,0.95)",
  },
  worldMapPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  worldMapText: {
    color: "rgba(226,232,240,0.92)",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  topActions: {
    flexDirection: "row",
    gap: 10,
  },
  topIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  askBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(15,23,42,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  askPlus: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  askPlaceholder: {
    flex: 1,
    color: "rgba(148,163,184,0.95)",
    fontSize: 13,
    fontWeight: "700",
  },
  askRight: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  listContent: {
    paddingTop: 6,
    paddingBottom: 18,
  },
  presenceRow: {
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  presenceBar: {
    flexDirection: "row",
    alignItems: "center",
  },
  presenceScroll: {
    flex: 1,
  },
  presenceItem: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  presenceAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  presenceAdd: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  presenceDot: {
    position: "absolute",
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#22c55e",
    bottom: 4,
    right: 4,
    borderWidth: 2,
    borderColor: "rgba(15,23,42,0.95)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 18,
    justifyContent: "center",
  },
  actionSheet: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(15,23,42,0.92)",
    padding: 14,
    gap: 10,
  },
  sheetTitle: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "900",
  },
  sheetItem: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  sheetText: {
    color: "rgba(226,232,240,0.92)",
    fontSize: 13,
    fontWeight: "800",
  },
  sheetClose: {
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  sheetCloseText: {
    color: "rgba(226,232,240,0.9)",
    fontSize: 13,
    fontWeight: "900",
  },
  formCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(15,23,42,0.92)",
    padding: 14,
    gap: 10,
  },
  formTitle: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "900",
  },
  input: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#e2e8f0",
    paddingHorizontal: 12,
    fontSize: 13,
  },
  choiceRow: {
    flexDirection: "row",
    gap: 10,
  },
  choiceBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  choiceBtnActive: {
    borderColor: "rgba(59,130,246,0.35)",
    backgroundColor: "rgba(30,64,175,0.22)",
  },
  choiceText: {
    color: "rgba(226,232,240,0.9)",
    fontSize: 12,
    fontWeight: "900",
  },
  formFooter: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    paddingTop: 4,
  },
  formGhost: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  formGhostText: {
    color: "rgba(226,232,240,0.82)",
    fontSize: 12,
    fontWeight: "900",
  },
  formCta: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#e2e8f0",
  },
  formCtaDisabled: {
    opacity: 0.55,
  },
  formCtaText: {
    color: "#0b1220",
    fontSize: 12,
    fontWeight: "900",
  },
});
