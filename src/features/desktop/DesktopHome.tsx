import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ChatListItem } from '@/src/components/ChatListItem';
import { MiniAppDock } from '@/src/components/MiniAppDock';
import { NpcListItem } from '@/src/components/NpcListItem';
import { LoadingSkeleton, StateBanner } from '@/src/components/StateBlocks';
import { ChatThread, NPC, AppLanguage } from '@/src/types';

export type DesktopPresenceItem = {
  id: string;
  entityId: string;
  name: string;
  avatar: string;
  entityType: 'human' | 'bot' | 'npc';
  role: 'human' | 'bot' | 'npc';
};

type DesktopHomeProps = {
  profileAvatar: string;
  language: AppLanguage;
  bootstrapReady: boolean;
  openingAskAnything: boolean;
  refreshingChats: boolean;
  uiError: string | null;
  chats: ChatThread[];
  npcList: NPC[];
  presence: DesktopPresenceItem[];
  tr: (zh: string, en: string) => string;
  onRefreshChats: () => Promise<void> | void;
  onOpenAskAnything: () => Promise<void> | void;
  onOpenThread: (thread: ChatThread) => void;
  onOpenNpc: (npc: NPC) => void;
  onOpenConfig: () => void;
  onOpenTownMap: () => void;
  onOpenPeopleModal: () => void;
  onOpenFriendModal: () => void;
  onOpenGroupModal: () => void;
  onOpenAgents: () => void;
  onOpenThreadAvatarConfig: (thread: ChatThread) => void;
  onOpenEntityConfig: (entity: { entityType: 'human' | 'bot' | 'npc'; entityId?: string; name?: string; avatar?: string }) => void;
};

function roleIcon(role: DesktopPresenceItem['role']): React.ComponentProps<typeof Ionicons>['name'] {
  if (role === 'npc') return 'sparkles';
  if (role === 'bot') return 'hardware-chip';
  return 'person';
}

export function DesktopHome({
  profileAvatar,
  language,
  bootstrapReady,
  openingAskAnything,
  refreshingChats,
  uiError,
  chats,
  npcList,
  presence,
  tr,
  onRefreshChats,
  onOpenAskAnything,
  onOpenThread,
  onOpenNpc,
  onOpenConfig,
  onOpenTownMap,
  onOpenPeopleModal,
  onOpenFriendModal,
  onOpenGroupModal,
  onOpenAgents,
  onOpenThreadAvatarConfig,
  onOpenEntityConfig,
}: DesktopHomeProps) {
  return (
    <View style={styles.shell}>
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Pressable style={styles.profileChip} onPress={onOpenConfig}>
            <Image source={{ uri: profileAvatar }} style={styles.profileAvatar} />
            <View style={styles.onlineDot} />
          </Pressable>
          <View style={styles.sidebarTitleWrap}>
            <Text style={styles.sidebarTitle}>UsChat</Text>
            <Text style={styles.sidebarSubtitle}>{tr('桌面沟通中心', 'Desktop communication hub')}</Text>
          </View>
          <Pressable style={styles.headerIcon} onPress={onOpenPeopleModal}>
            <Ionicons name="people-outline" size={18} color="rgba(226,232,240,0.92)" />
          </Pressable>
        </View>

        <Pressable testID="desktop-home-mybot-entry" style={styles.askBar} onPress={() => void onOpenAskAnything()}>
          <View style={styles.askLead}>
            <Ionicons name="sparkles-outline" size={18} color="rgba(191,219,254,0.95)" />
          </View>
          <View style={styles.askBody}>
            <Text style={styles.askTitle}>MyBot</Text>
            <Text style={styles.askSubtitle}>{tr('私有总结、待办和提醒', 'Private summaries, tasks, and reminders')}</Text>
          </View>
          {openingAskAnything ? (
            <ActivityIndicator size="small" color="rgba(226,232,240,0.8)" />
          ) : (
            <Ionicons name="arrow-forward" size={18} color="rgba(226,232,240,0.82)" />
          )}
        </Pressable>

        {uiError ? (
          <StateBanner
            variant="error"
            title={tr('加载失败', 'Something went wrong')}
            message={uiError}
            actionLabel={tr('关闭', 'Dismiss')}
            onAction={() => null}
          />
        ) : null}
        {refreshingChats ? (
          <View style={styles.refreshHint}>
            <ActivityIndicator size="small" color="#93c5fd" />
            <Text style={styles.refreshHintText}>{tr('刷新会话中...', 'Refreshing chats...')}</Text>
          </View>
        ) : null}

        {!bootstrapReady ? (
          <LoadingSkeleton kind="chat_list" />
        ) : (
          <FlatList
            testID="desktop-home-chat-list"
            data={chats}
            keyExtractor={(item) => item.id}
            style={styles.chatList}
            contentContainerStyle={styles.chatListContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshingChats}
                onRefresh={() => void onRefreshChats()}
                tintColor="rgba(226,232,240,0.92)"
                colors={['#60a5fa']}
                progressBackgroundColor="rgba(15,23,42,0.92)"
              />
            }
            renderItem={({ item }) => (
              <ChatListItem
                chat={item}
                language={language}
                theme="neo"
                onPress={() => onOpenThread(item)}
                onAvatarPress={onOpenThreadAvatarConfig}
              />
            )}
          />
        )}

        <View style={styles.sidebarFooter}>
          <Pressable style={styles.sidebarCtaGhost} onPress={onOpenFriendModal}>
            <Ionicons name="person-add-outline" size={16} color="rgba(226,232,240,0.9)" />
            <Text style={styles.sidebarCtaGhostText}>{tr('加好友', 'Add Friend')}</Text>
          </Pressable>
          <Pressable style={styles.sidebarCtaPrimary} onPress={onOpenGroupModal}>
            <Ionicons name="people-outline" size={16} color="#eff6ff" />
            <Text style={styles.sidebarCtaPrimaryText}>{tr('建群', 'New Group')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.main}>
        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>{tr('Mac 桌面版', 'Mac desktop')}</Text>
            <Text style={styles.heroTitle}>{tr('聊天优先，像桌面 IM 一样工作', 'Chat-first collaboration for desktop')}</Text>
            <Text style={styles.heroText}>
              {tr(
                '把最近会话放在左侧，把群聊、私有 MyBot、NPC 协作和 Mini Apps 放在桌面工作台里。',
                'Keep recent chats on the left and use the workspace for group threads, private MyBot help, NPC collaboration, and Mini Apps.'
              )}
            </Text>
          </View>
          <View style={styles.heroActions}>
            <Pressable style={styles.heroPrimary} onPress={() => void onOpenAskAnything()}>
              <Ionicons name="sparkles-outline" size={16} color="#eff6ff" />
              <Text style={styles.heroPrimaryText}>MyBot</Text>
            </Pressable>
            <Pressable style={styles.heroGhost} onPress={onOpenTownMap}>
              <Ionicons name="globe-outline" size={16} color="rgba(226,232,240,0.92)" />
              <Text style={styles.heroGhostText}>{tr('世界地图', 'World Map')}</Text>
            </Pressable>
            <Pressable style={styles.heroGhost} onPress={onOpenAgents}>
              <Ionicons name="hardware-chip-outline" size={16} color="rgba(226,232,240,0.92)" />
              <Text style={styles.heroGhostText}>{tr('Bots / NPCs', 'Bots / NPCs')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.workspaceGrid}>
          <View style={[styles.card, styles.cardTall]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{tr('最近活跃成员', 'Active people')}</Text>
              <Pressable style={styles.cardHeaderAction} onPress={onOpenPeopleModal}>
                <Ionicons name="add" size={16} color="rgba(226,232,240,0.9)" />
              </Pressable>
            </View>
            <ScrollView style={styles.presencePanel} contentContainerStyle={styles.presencePanelContent}>
              {presence.length ? (
                presence.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.presenceItem}
                    onPress={() =>
                      onOpenEntityConfig({
                        entityType: item.entityType,
                        entityId: item.entityId,
                        name: item.name,
                        avatar: item.avatar,
                      })
                    }
                  >
                    <View style={styles.presenceAvatarWrap}>
                      {item.avatar ? (
                        <Image source={{ uri: item.avatar }} style={styles.presenceAvatar} />
                      ) : (
                        <View style={[styles.presenceAvatar, styles.presenceAvatarFallback]}>
                          <Ionicons name="person-outline" size={18} color="rgba(226,232,240,0.82)" />
                        </View>
                      )}
                      <View
                        style={[
                          styles.presenceRoleBadge,
                          item.role === 'npc'
                            ? styles.presenceRoleBadgeNpc
                            : item.role === 'bot'
                              ? styles.presenceRoleBadgeBot
                              : styles.presenceRoleBadgeHuman,
                        ]}
                      >
                        <Ionicons
                          name={roleIcon(item.role)}
                          size={9}
                          color={item.role === 'human' ? 'rgba(12,18,32,0.95)' : 'rgba(248,250,252,0.95)'}
                        />
                      </View>
                    </View>
                    <View style={styles.presenceMeta}>
                      <Text style={styles.presenceName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.presenceRoleText}>
                        {item.role === 'npc'
                          ? 'NPC'
                          : item.role === 'bot'
                            ? 'Bot'
                            : tr('联系人', 'Contact')}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="rgba(148,163,184,0.82)" />
                  </Pressable>
                ))
              ) : (
                <Text style={styles.emptyText}>{tr('还没有联系人或 NPC。', 'No contacts or NPCs yet.')}</Text>
              )}
            </ScrollView>
          </View>

          <View style={[styles.card, styles.cardTall]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{tr('NPC 协作区', 'NPC workspace')}</Text>
              <Pressable style={styles.cardHeaderAction} onPress={onOpenAgents}>
                <Ionicons name="open-outline" size={16} color="rgba(226,232,240,0.9)" />
              </Pressable>
            </View>
            <ScrollView style={styles.npcPanel} contentContainerStyle={styles.npcPanelContent}>
              {npcList.length ? (
                npcList.map((npc) => <NpcListItem key={npc.id} npc={npc} onPress={() => onOpenNpc(npc)} />)
              ) : (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyTitle}>{tr('还没有 NPC', 'No NPCs yet')}</Text>
                  <Text style={styles.emptyText}>
                    {tr('创建自己的虚拟角色，或把它们加入群聊做协作。', 'Create your own roles and bring them into group conversations.')}
                  </Text>
                  <Pressable style={styles.heroPrimary} onPress={onOpenAgents}>
                    <Ionicons name="sparkles-outline" size={16} color="#eff6ff" />
                    <Text style={styles.heroPrimaryText}>{tr('创建 NPC', 'Create NPC')}</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>

          <View style={[styles.card, styles.cardWide]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{tr('Mini Apps 工作台', 'Mini Apps workspace')}</Text>
            </View>
            <MiniAppDock />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
  },
  sidebar: {
    width: 360,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(7,10,20,0.72)',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  sidebarTitleWrap: {
    flex: 1,
  },
  sidebarTitle: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sidebarSubtitle: {
    color: 'rgba(148,163,184,0.92)',
    fontSize: 13,
    marginTop: 2,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(15,23,42,0.78)',
  },
  profileChip: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(191,219,254,0.3)',
    backgroundColor: 'rgba(15,23,42,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  onlineDot: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: 'rgba(15,23,42,0.92)',
  },
  askBar: {
    minHeight: 78,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15,23,42,0.68)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  askLead: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37,99,235,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.28)',
  },
  askBody: {
    flex: 1,
  },
  askTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  askSubtitle: {
    color: 'rgba(148,163,184,0.92)',
    fontSize: 13,
    marginTop: 4,
  },
  refreshHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  refreshHintText: {
    color: 'rgba(191,219,254,0.92)',
    fontSize: 12,
    fontWeight: '700',
  },
  chatList: {
    flex: 1,
    marginTop: 4,
  },
  chatListContent: {
    paddingBottom: 12,
  },
  sidebarFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  sidebarCtaGhost: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(15,23,42,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sidebarCtaGhostText: {
    color: 'rgba(226,232,240,0.96)',
    fontSize: 13,
    fontWeight: '700',
  },
  sidebarCtaPrimary: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  sidebarCtaPrimaryText: {
    color: '#eff6ff',
    fontSize: 13,
    fontWeight: '800',
  },
  main: {
    flex: 1,
    gap: 20,
  },
  heroCard: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(7,10,20,0.58)',
    paddingHorizontal: 24,
    paddingVertical: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
  },
  heroCopy: {
    flex: 1,
    maxWidth: 720,
  },
  heroEyebrow: {
    color: 'rgba(147,197,253,0.95)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    color: '#f8fafc',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    marginBottom: 12,
  },
  heroText: {
    color: 'rgba(203,213,225,0.92)',
    fontSize: 15,
    lineHeight: 24,
  },
  heroActions: {
    width: 280,
    gap: 10,
  },
  heroPrimary: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  heroPrimaryText: {
    color: '#eff6ff',
    fontSize: 14,
    fontWeight: '800',
  },
  heroGhost: {
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(15,23,42,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  heroGhostText: {
    color: 'rgba(226,232,240,0.96)',
    fontSize: 13,
    fontWeight: '700',
  },
  workspaceGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    alignContent: 'flex-start',
  },
  card: {
    minWidth: 320,
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(7,10,20,0.58)',
    padding: 20,
    overflow: 'hidden',
  },
  cardTall: {
    minHeight: 420,
  },
  cardWide: {
    flexBasis: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
  },
  cardHeaderAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37,99,235,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.22)',
  },
  presencePanel: {
    flex: 1,
  },
  presencePanelContent: {
    gap: 12,
    paddingBottom: 8,
  },
  presenceItem: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15,23,42,0.62)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  presenceAvatarWrap: {
    position: 'relative',
  },
  presenceAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  presenceAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30,41,59,0.88)',
  },
  presenceRoleBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.88)',
  },
  presenceRoleBadgeHuman: {
    backgroundColor: 'rgba(226,232,240,0.95)',
  },
  presenceRoleBadgeBot: {
    backgroundColor: 'rgba(37,99,235,0.96)',
  },
  presenceRoleBadgeNpc: {
    backgroundColor: 'rgba(16,185,129,0.96)',
  },
  presenceMeta: {
    flex: 1,
  },
  presenceName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  presenceRoleText: {
    color: 'rgba(148,163,184,0.88)',
    fontSize: 12,
    marginTop: 4,
  },
  npcPanel: {
    flex: 1,
  },
  npcPanelContent: {
    gap: 12,
    paddingBottom: 8,
  },
  emptyWrap: {
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 12,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: 'rgba(148,163,184,0.92)',
    fontSize: 13,
    lineHeight: 20,
  },
});
