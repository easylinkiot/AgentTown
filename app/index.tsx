import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { createChatThread, discoverUsers, type DiscoverUser } from "@/src/lib/api";
import { tx } from "@/src/i18n/translate";
import { useAuth } from "@/src/state/auth-context";
import { useAgentTown } from "@/src/state/agenttown-context";
import { ChatThread } from "@/src/types";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
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

  const [friendQuery, setFriendQuery] = useState("");
  const [friendCandidates, setFriendCandidates] = useState<DiscoverUser[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

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
    const displayName = (user?.displayName || "").trim();
    const assistantNameEN = displayName ? `${displayName}'s Bot` : "";
    const assistantNameZH = displayName ? `${displayName}的助理` : "";

    const items = [
      ...friends
        .filter((f) => {
          const uid = (f.userId || "").trim();
          return !uid || uid !== (user?.id || "").trim();
        })
        .map((f) => ({ id: `friend:${f.id}`, avatar: f.avatar })),
      ...agents
        .filter((a) => {
          const name = (a.name || "").trim();
          if (a.id === "agent_mybot") return false;
          if (assistantNameEN && name === assistantNameEN) return false;
          if (assistantNameZH && name === assistantNameZH) return false;
          return true;
        })
        .map((a) => ({ id: `agent:${a.id}`, avatar: a.avatar })),
    ].filter((x) => !!x.avatar);
    return items.slice(0, 9);
  }, [agents, friends, user?.displayName, user?.id]);

  useEffect(() => {
    if (!friendModal) return;
    let cancelled = false;

    const run = async () => {
      setLoadingCandidates(true);
      try {
        const list = await discoverUsers(friendQuery.trim());
        if (!cancelled) {
          setFriendCandidates(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        if (!cancelled) {
          setFriendCandidates([]);
          setUiError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoadingCandidates(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [friendModal, friendQuery]);

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

  const handleCreateFriend = async (candidate: DiscoverUser) => {
    if (!candidate?.id || addingUserId) return;
    setUiError(null);
    setAddingUserId(candidate.id);

    try {
      const threadId = `dm_${Date.now()}`;
      const avatar = candidate.avatar?.trim() || "https://img.freepik.com/free-psd/3d-illustration-human-avatar-profile_23-2150671142.jpg?w=200";

      const thread: ChatThread = {
        id: threadId,
        name: candidate.displayName,
        avatar,
        message: tr("新联系人", "New contact"),
        time: "Now",
        isGroup: false,
        supportsVideo: true,
      };

      const created = await createChatThread(thread);
      addChatThread(created);
      await createFriend({
        userId: candidate.id,
        name: candidate.displayName,
        kind: "human",
        avatar: created.avatar,
        threadId: created.id,
      });

      setFriendModal(false);
      setPeopleModal(false);
      setFriendQuery("");
      setFriendCandidates([]);
      handleOpenThread(created);
    } catch (err) {
      setUiError(err instanceof Error ? err.message : String(err));
    } finally {
      setAddingUserId(null);
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
            {presence.length ? (
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
            ) : (
              <View style={styles.presenceSpacer} />
            )}

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
                value={friendQuery}
                onChangeText={setFriendQuery}
                placeholder={tr("搜索系统账户（名字或邮箱）", "Search account by name or email")}
                placeholderTextColor="rgba(148,163,184,0.9)"
                style={styles.input}
              />

              <View style={styles.candidateList}>
                {loadingCandidates ? (
                  <View style={styles.candidateLoading}>
                    <ActivityIndicator color="#93c5fd" />
                  </View>
                ) : friendCandidates.length ? (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {friendCandidates.map((candidate) => (
                      <Pressable
                        key={candidate.id}
                        style={styles.candidateItem}
                        disabled={Boolean(addingUserId)}
                        onPress={() => handleCreateFriend(candidate)}
                      >
                        <Image source={{ uri: candidate.avatar }} style={styles.candidateAvatar} />
                        <View style={styles.candidateBody}>
                          <Text numberOfLines={1} style={styles.candidateName}>
                            {candidate.displayName}
                          </Text>
                          <Text numberOfLines={1} style={styles.candidateMeta}>
                            {candidate.email || candidate.provider}
                          </Text>
                        </View>
                        <Text style={styles.candidateAction}>
                          {addingUserId === candidate.id ? tr("添加中...", "Adding...") : tr("添加", "Add")}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.candidateEmpty}>
                    {tr("没有可添加的系统账户。请先让对方注册登录。", "No discoverable accounts. Ask your friend to sign up first.")}
                  </Text>
                )}
              </View>

              <View style={styles.formFooter}>
                <Pressable style={styles.formGhost} onPress={() => setFriendModal(false)}>
                  <Text style={styles.formGhostText}>{tr("取消", "Cancel")}</Text>
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
  presenceSpacer: {
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
  candidateList: {
    minHeight: 180,
    maxHeight: 320,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 8,
  },
  candidateLoading: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  candidateItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 8,
  },
  candidateAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  candidateBody: {
    flex: 1,
  },
  candidateName: {
    color: "rgba(226,232,240,0.94)",
    fontSize: 13,
    fontWeight: "800",
  },
  candidateMeta: {
    color: "rgba(148,163,184,0.9)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  candidateAction: {
    color: "#bfdbfe",
    fontSize: 12,
    fontWeight: "900",
  },
  candidateEmpty: {
    color: "rgba(148,163,184,0.92)",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 12,
    lineHeight: 18,
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
