import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { KeyframeBackground } from "@/src/components/KeyframeBackground";
import { EmptyState, LoadingSkeleton, StateBanner } from "@/src/components/StateBlocks";
import { APP_SAFE_AREA_EDGES } from "@/src/constants/safe-area";
import { tx } from "@/src/i18n/translate";
import { formatApiError } from "@/src/lib/api";
import { useAgentTown } from "@/src/state/agenttown-context";

type InviteFilter = "all" | "human" | "agent" | "role";

export default function GroupsScreen() {
  const router = useRouter();
  const { chatThreads, threadMembers, friends, agents, language, bootstrapReady, listMembers, addMember, removeMember } =
    useAgentTown();
  const tr = (zh: string, en: string) => tx(language, zh, en);

  const groups = useMemo(() => chatThreads.filter((t) => t.isGroup), [chatThreads]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(groups[0]?.id || null);
  const [memberModal, setMemberModal] = useState(false);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [inviteFilter, setInviteFilter] = useState<InviteFilter>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groups.length) {
      setSelectedGroupId(null);
      return;
    }
    if (!selectedGroupId || !groups.some((g) => g.id === selectedGroupId)) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  useEffect(() => {
    if (!selectedGroupId) return;
    void listMembers(selectedGroupId).catch((err) => setError(formatApiError(err)));
  }, [listMembers, selectedGroupId]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const members = selectedGroupId ? threadMembers[selectedGroupId] || [] : [];

  const candidates = useMemo(() => {
    const usedFriendIds = new Set(members.map((m) => m.friendId).filter(Boolean));
    const usedAgentIds = new Set(members.map((m) => m.agentId).filter(Boolean));

    const friendItems = friends
      .filter((f) => !usedFriendIds.has(f.id))
      .map((f) => ({
        key: `friend:${f.id}`,
        type: f.kind === "bot" ? ("role" as const) : ("human" as const),
        label: f.name,
        desc: f.role || f.company || f.kind,
        onAdd: async () => {
          if (!selectedGroupId) return;
          await addMember(selectedGroupId, { friendId: f.id, memberType: f.kind === "bot" ? "role" : "human" });
          await listMembers(selectedGroupId);
          setMemberModal(false);
        },
      }));

    const agentItems = agents
      .filter((a) => !usedAgentIds.has(a.id))
      .map((a) => ({
        key: `agent:${a.id}`,
        type: "agent" as const,
        label: a.name,
        desc: a.persona || "agent",
        onAdd: async () => {
          if (!selectedGroupId) return;
          await addMember(selectedGroupId, { agentId: a.id, memberType: "agent" });
          await listMembers(selectedGroupId);
          setMemberModal(false);
        },
      }));

    const all = [...friendItems, ...agentItems];
    const keyword = candidateQuery.trim().toLowerCase();

    return all.filter((item) => {
      if (inviteFilter !== "all" && item.type !== inviteFilter) return false;
      if (!keyword) return true;
      return item.label.toLowerCase().includes(keyword) || item.desc.toLowerCase().includes(keyword);
    });
  }, [addMember, agents, candidateQuery, friends, inviteFilter, listMembers, members, selectedGroupId]);

  const confirmRemoveMember = (groupId: string, memberId: string, memberName: string) => {
    Alert.alert(
      tr("移除成员", "Remove member"),
      tr(
        `确认将 ${memberName || tr("该成员", "this member")} 移出群聊吗？`,
        `Remove ${memberName || "this member"} from this group?`
      ),
      [
        { text: tr("取消", "Cancel"), style: "cancel" },
        {
          text: tr("移除", "Remove"),
          style: "destructive",
          onPress: () => {
            void removeMember(groupId, memberId).catch((err) =>
              setError(formatApiError(err))
            );
          },
        },
      ]
    );
  };

  return (
    <KeyframeBackground>
      <SafeAreaView edges={APP_SAFE_AREA_EDGES} style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={18} color="#e2e8f0" />
            </Pressable>
            <Text style={styles.title}>{tr("Groups", "Groups")}</Text>
            <View style={{ width: 40 }} />
          </View>

          {error ? (
            <StateBanner
              variant="error"
              title={tr("加载失败", "Failed to load")}
              message={error}
              actionLabel={tr("关闭", "Dismiss")}
              onAction={() => setError(null)}
            />
          ) : null}

          {!bootstrapReady ? (
            <LoadingSkeleton kind="cards" />
          ) : groups.length === 0 ? (
            <EmptyState
              title={tr("暂无群聊", "No groups")}
              hint={tr("去首页右上角创建一个群聊", "Create a group from the home top-right menu")}
              icon="people-outline"
            />
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupRow}>
                {groups.map((g) => {
                  const active = g.id === selectedGroupId;
                  return (
                    <Pressable
                      key={g.id}
                      style={[styles.groupCard, active && styles.groupCardActive]}
                      onPress={() => setSelectedGroupId(g.id)}
                    >
                      <Text style={styles.groupName} numberOfLines={1}>
                        {g.name}
                      </Text>
                      <Text style={styles.groupMeta}>
                        {tr("成员", "Members")}: {g.memberCount || members.length}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {selectedGroup ? (
                <View style={styles.panel}>
                  <View style={styles.panelHeader}>
                    <Text style={styles.panelTitle}>{tr("成员列表", "Members")}</Text>
                    <Pressable style={styles.addBtn} onPress={() => setMemberModal(true)}>
                      <Ionicons name="person-add-outline" size={16} color="#0b1220" />
                    </Pressable>
                  </View>

                  <ScrollView contentContainerStyle={styles.memberList} showsVerticalScrollIndicator={false}>
                    {members.map((m) => (
                      <View key={m.id} style={styles.memberItem}>
                        <View style={styles.memberMain}>
                          <Text style={styles.memberName}>{m.name}</Text>
                          <Text style={styles.memberDesc}>{m.memberType.toUpperCase()}</Text>
                        </View>
                        <Pressable
                          style={styles.removeBtn}
                          onPress={() => confirmRemoveMember(selectedGroup.id, m.id, m.name)}
                        >
                          <Ionicons name="trash-outline" size={16} color="rgba(248,113,113,0.95)" />
                        </Pressable>
                      </View>
                    ))}
                    {members.length === 0 ? (
                      <EmptyState title={tr("暂无成员", "No members")} hint={tr("点右上角添加成员", "Tap the plus to add members")} icon="person-add-outline" />
                    ) : null}
                  </ScrollView>
                </View>
              ) : null}
            </>
          )}
        </View>

        <Modal visible={memberModal} transparent animationType="fade" onRequestClose={() => setMemberModal(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setMemberModal(false)}>
            <Pressable style={styles.modalCard} onPress={() => null}>
              <Text style={styles.modalTitle}>{tr("添加成员", "Add Member")}</Text>
              <View style={styles.searchWrap}>
                <Ionicons name="search" size={14} color="rgba(148,163,184,0.9)" />
                <TextInput
                  value={candidateQuery}
                  onChangeText={setCandidateQuery}
                  placeholder={tr("搜索成员", "Search")}
                  placeholderTextColor="rgba(148,163,184,0.9)"
                  style={styles.searchInput}
                />
              </View>

              <View style={styles.filterRow}>
                {([
                  { key: "all", zh: "全部", en: "All" },
                  { key: "human", zh: "真人", en: "Human" },
                  { key: "agent", zh: "Agent", en: "Agent" },
                  { key: "role", zh: "角色", en: "Role" },
                ] as const).map((item) => (
                  <Pressable
                    key={item.key}
                    style={[styles.filterBtn, inviteFilter === item.key && styles.filterBtnActive]}
                    onPress={() => setInviteFilter(item.key)}
                  >
                    <Text style={[styles.filterText, inviteFilter === item.key && styles.filterTextActive]}>
                      {tr(item.zh, item.en)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <ScrollView contentContainerStyle={styles.candidateList} showsVerticalScrollIndicator={false}>
                {candidates.map((c) => (
                  <Pressable key={c.key} style={styles.candidateItem} onPress={() => void c.onAdd().catch((err) => setError(formatApiError(err)))}>
                    <View style={styles.candidateMain}>
                      <Text style={styles.candidateName}>{c.label}</Text>
                      <Text style={styles.candidateDesc} numberOfLines={1}>{c.desc}</Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={18} color="#93c5fd" />
                  </Pressable>
                ))}
                {candidates.length === 0 ? (
                  <EmptyState title={tr("没有可添加对象", "No candidates")} hint={tr("换个关键词试试", "Try another search")} icon="person-add-outline" />
                ) : null}
              </ScrollView>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    color: "#e2e8f0",
    fontSize: 16,
    fontWeight: "900",
  },
  groupRow: {
    gap: 10,
    paddingBottom: 4,
  },
  groupCard: {
    width: 210,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(15,23,42,0.55)",
    padding: 14,
    gap: 6,
  },
  groupCardActive: {
    borderColor: "rgba(59,130,246,0.35)",
    backgroundColor: "rgba(30,64,175,0.18)",
  },
  groupName: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "900",
  },
  groupMeta: {
    color: "rgba(148,163,184,0.95)",
    fontSize: 11,
    fontWeight: "700",
  },
  panel: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(15,23,42,0.55)",
    padding: 14,
    gap: 10,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  panelTitle: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "900",
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  memberList: {
    gap: 10,
    paddingBottom: 10,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  memberMain: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "900",
  },
  memberDesc: {
    color: "rgba(148,163,184,0.95)",
    fontSize: 11,
    fontWeight: "700",
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 18,
    justifyContent: "center",
  },
  modalCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(15,23,42,0.92)",
    padding: 14,
    gap: 10,
    maxHeight: "92%",
  },
  modalTitle: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "900",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: "#e2e8f0",
    fontSize: 13,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  filterBtnActive: {
    borderColor: "rgba(59,130,246,0.35)",
    backgroundColor: "rgba(30,64,175,0.22)",
  },
  filterText: {
    color: "rgba(203,213,225,0.78)",
    fontSize: 11,
    fontWeight: "900",
  },
  filterTextActive: {
    color: "#e2e8f0",
  },
  candidateList: {
    gap: 10,
    paddingBottom: 10,
  },
  candidateItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  candidateMain: {
    flex: 1,
    gap: 2,
  },
  candidateName: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "900",
  },
  candidateDesc: {
    color: "rgba(148,163,184,0.95)",
    fontSize: 11,
    fontWeight: "700",
  },
});
