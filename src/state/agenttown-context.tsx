import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as FileSystem from "expo-file-system";

import { DEFAULT_MYBOT_AVATAR } from "@/src/constants/chat";
import {
  addThreadMember as addThreadMemberApi,
  createAgent as createAgentApi,
  createChatThread,
  createCustomSkill as createCustomSkillApi,
  createFriend as createFriendApi,
  createTask as createTaskApi,
  createTaskFromMessage as createTaskFromMessageApi,
  deleteCustomSkill as deleteCustomSkillApi,
  deleteFriend as deleteFriendApi,
  deleteMiniApp as deleteMiniAppApi,
  executeCustomSkill as executeCustomSkillApi,
  fetchBootstrap,
  generateMiniApp as generateMiniAppApi,
  generateRoleReplies as generateRoleRepliesApi,
  installMiniApp as installMiniAppApi,
  listThreadMembers as listThreadMembersApi,
  listThreadMessages as listThreadMessagesApi,
  patchTask as patchTaskApi,
  patchCustomSkill as patchCustomSkillApi,
  removeThreadMember as removeThreadMemberApi,
  runMiniApp as runMiniAppApi,
  saveBotConfig,
  sendThreadMessage as sendThreadMessageApi,
  subscribeRealtime,
  toggleAgentSkill as toggleAgentSkillApi,
  type AddThreadMemberInput,
  type CreateAgentInput,
  type CreateCustomSkillInput,
  type SendThreadMessageInput,
  type SendThreadMessageOutput,
} from "@/src/lib/api";
import {
  Agent,
  AppLanguage,
  BotConfig,
  ChatThread,
  ConversationMessage,
  CustomSkill,
  Friend,
  MiniApp,
  MiniAppTemplate,
  RealtimeEvent,
  SkillCatalogItem,
  TaskItem,
  ThreadMember,
  UiTheme,
} from "@/src/types";

import { useAuth } from "@/src/state/auth-context";

interface AgentTownContextValue {
  botConfig: BotConfig;
  tasks: TaskItem[];
  chatThreads: ChatThread[];
  messagesByThread: Record<string, ConversationMessage[]>;
  friends: Friend[];
  threadMembers: Record<string, ThreadMember[]>;
  agents: Agent[];
  skillCatalog: SkillCatalogItem[];
  customSkills: CustomSkill[];
  miniApps: MiniApp[];
  miniAppTemplates: MiniAppTemplate[];
  miniAppGeneration: {
    active: boolean;
    stage: string;
    progress: number;
  };
  myHouseType: number;
  uiTheme: UiTheme;
  language: AppLanguage;
  voiceModeEnabled: boolean;
  bootstrapReady: boolean;
  updateBotConfig: (next: BotConfig) => void;
  addTask: (task: TaskItem) => void;
  addChatThread: (thread: ChatThread) => void;
  updateHouseType: (next: number) => void;
  updateUiTheme: (next: UiTheme) => void;
  updateLanguage: (next: AppLanguage) => void;
  updateVoiceModeEnabled: (next: boolean) => void;
  refreshAll: () => Promise<void>;
  refreshThreadMessages: (threadId: string) => Promise<void>;
  loadOlderMessages: (threadId: string) => Promise<number>;
  sendMessage: (threadId: string, payload: SendThreadMessageInput) => Promise<SendThreadMessageOutput | null>;
  createFriend: (input: {
    name: string;
    avatar?: string;
    kind?: "human" | "bot";
    role?: string;
    company?: string;
    threadId?: string;
  }) => Promise<Friend | null>;
  removeFriend: (friendId: string) => Promise<void>;
  createAgent: (input: CreateAgentInput) => Promise<Agent | null>;
  toggleAgentSkill: (agentId: string, skillId: string, install: boolean) => Promise<void>;
  createGroup: (input: { name: string; avatar?: string; memberCount?: number }) => Promise<ChatThread | null>;
  listMembers: (threadId: string) => Promise<void>;
  addMember: (threadId: string, input: AddThreadMemberInput) => Promise<void>;
  removeMember: (threadId: string, memberId: string) => Promise<void>;
  createTaskFromMessage: (threadId: string, messageId: string, title?: string) => Promise<TaskItem | null>;
  updateTask: (taskId: string, patch: {
    title?: string;
    assignee?: string;
    priority?: "High" | "Medium" | "Low";
    status?: "Pending" | "In Progress" | "Done";
    dueAt?: string;
  }) => Promise<void>;
  createCustomSkill: (input: CreateCustomSkillInput) => Promise<CustomSkill | null>;
  patchCustomSkill: (
    skillId: string,
    patch: Partial<CreateCustomSkillInput> & { enabled?: boolean }
  ) => Promise<CustomSkill | null>;
  removeCustomSkill: (skillId: string) => Promise<void>;
  executeCustomSkill: (
    skillId: string,
    input: string,
    threadId?: string,
    variables?: Record<string, unknown>
  ) => Promise<string | null>;
  generateRoleReplies: (threadId: string, prompt: string, memberIds?: string[]) => Promise<ConversationMessage[]>;
  generateMiniApp: (query: string, sources: string[]) => Promise<MiniApp | null>;
  installMiniApp: (appId: string, install?: boolean) => Promise<void>;
  runMiniApp: (
    appId: string,
    input: string,
    params?: Record<string, unknown>,
    threadId?: string
  ) => Promise<string | null>;
  removeMiniApp: (appId: string) => Promise<void>;
}

const MESSAGE_PAGE_SIZE = 50;
const MESSAGE_RENDER_WINDOW = 160;
const MESSAGE_CACHE_LIMIT = 2000;

function safeThreadKey(threadId: string) {
  return threadId.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
}

function cacheDir() {
  const base = FileSystem.documentDirectory;
  if (!base) return null;
  return `${base}agenttown_cache/messages`;
}

async function ensureCacheDir() {
  const dir = cacheDir();
  if (!dir) return null;
  try {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
  } catch {
    // ignore
  }
  return dir;
}

function cachePath(threadId: string) {
  const dir = cacheDir();
  if (!dir) return null;
  return `${dir}/${safeThreadKey(threadId)}.json`;
}

async function readThreadCache(threadId: string): Promise<ConversationMessage[] | null> {
  const path = cachePath(threadId);
  if (!path) return null;
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(path);
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as ConversationMessage[];
  } catch {
    return null;
  }
}

async function writeThreadCache(threadId: string, messages: ConversationMessage[]) {
  const dir = await ensureCacheDir();
  const path = cachePath(threadId);
  if (!dir || !path) return;
  const next = messages.length > MESSAGE_CACHE_LIMIT ? messages.slice(-MESSAGE_CACHE_LIMIT) : messages;
  try {
    await FileSystem.writeAsStringAsync(path, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function mergeAppendUnique(base: ConversationMessage[], incoming: ConversationMessage[]) {
  const seen = new Set(base.map((m) => m.id));
  const next = [...base];
  for (const msg of incoming) {
    if (!msg?.id) continue;
    if (seen.has(msg.id)) continue;
    seen.add(msg.id);
    next.push(msg);
  }
  return next;
}

function mergePrependUnique(base: ConversationMessage[], incoming: ConversationMessage[]) {
  const seen = new Set(base.map((m) => m.id));
  const head: ConversationMessage[] = [];
  for (const msg of incoming) {
    if (!msg?.id) continue;
    if (seen.has(msg.id)) continue;
    seen.add(msg.id);
    head.push(msg);
  }
  return [...head, ...base];
}

async function upsertThreadCache(threadId: string, messages: ConversationMessage[]) {
  if (!threadId || messages.length === 0) return;
  const cached = (await readThreadCache(threadId)) || [];
  const merged = mergeAppendUnique(cached, messages);
  await writeThreadCache(threadId, merged);
}

const defaultBotConfig: BotConfig = {
  name: "MyBot",
  avatar: DEFAULT_MYBOT_AVATAR,
  systemInstruction:
    "You are a helpful and friendly digital assistant living in AgentTown.",
  documents: [],
  installedSkillIds: ["skill_task_decomposer", "skill_code_assistant"],
  knowledgeKeywords: ["startup", "product", "execution"],
};

const defaultTasks: TaskItem[] = [
  {
    id: "seed-task",
    title: "Review UI Prototype",
    assignee: "Jason",
    priority: "High",
    status: "Pending",
    owner: "Jason",
  },
];

const defaultChatThreads: ChatThread[] = [
  {
    id: "group_14",
    name: "powerhoo AIR 项目沟通群(14)",
    avatar:
      "https://img.freepik.com/free-psd/3d-illustration-human-avatar-profile_23-2150671142.jpg?w=200",
    message: "子非鱼: 👌",
    time: "3:30 AM",
    highlight: true,
    unreadCount: 2,
    isGroup: true,
    memberCount: 4,
    supportsVideo: true,
  },
  {
    id: "mybot",
    name: "MyBot",
    avatar: DEFAULT_MYBOT_AVATAR,
    message: "Ask me anything",
    time: "Now",
    isGroup: false,
    supportsVideo: false,
  },
];

const defaultMessagesByThread: Record<string, ConversationMessage[]> = {
  mybot: [
    {
      id: "mybot-welcome",
      threadId: "mybot",
      senderId: "agent_mybot",
      senderName: "MyBot",
      senderAvatar: DEFAULT_MYBOT_AVATAR,
      senderType: "agent",
      content: "Hi! I'm your AI startup copilot. Let's talk about your project.",
      type: "text",
      isMe: false,
      time: "Just now",
    },
  ],
};

const defaultFriends: Friend[] = [];
const defaultThreadMembers: Record<string, ThreadMember[]> = {};
const defaultAgents: Agent[] = [];
const defaultSkills: SkillCatalogItem[] = [];
const defaultCustomSkills: CustomSkill[] = [];
const defaultMiniApps: MiniApp[] = [];
const defaultMiniAppTemplates: MiniAppTemplate[] = [];

const AgentTownContext = createContext<AgentTownContextValue | null>(null);

function upsertById<T extends { id: string }>(
  list: T[],
  item: T,
  placeAtFront = true
): T[] {
  const rest = list.filter((entry) => entry.id !== item.id);
  return placeAtFront ? [item, ...rest] : [...rest, item];
}

function removeById<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((entry) => entry.id !== id);
}

function updateThreadPreview(threads: ChatThread[], threadId: string, preview: string): ChatThread[] {
  const next = [...threads];
  const index = next.findIndex((item) => item.id === threadId);
  if (index < 0) return next;

  const updated: ChatThread = {
    ...next[index],
    message: preview,
    time: "Now",
  };

  next.splice(index, 1);
  next.unshift(updated);
  return next;
}

function previewMessage(message: ConversationMessage): string {
  if (message.type === "image") {
    return message.content ? `[Image] ${message.content}` : "[Image]";
  }
  if (message.type === "voice") {
    return "[Voice]";
  }
  return message.content;
}

export function AgentTownProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();

  const [botConfig, setBotConfig] = useState<BotConfig>(defaultBotConfig);
  const [tasks, setTasks] = useState<TaskItem[]>(defaultTasks);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>(defaultChatThreads);
  const [messagesByThread, setMessagesByThread] =
    useState<Record<string, ConversationMessage[]>>(defaultMessagesByThread);
  const messagesByThreadRef = useRef<Record<string, ConversationMessage[]>>(defaultMessagesByThread);
  useEffect(() => {
    messagesByThreadRef.current = messagesByThread;
  }, [messagesByThread]);
  const [friends, setFriends] = useState<Friend[]>(defaultFriends);
  const [threadMembers, setThreadMembers] =
    useState<Record<string, ThreadMember[]>>(defaultThreadMembers);
  const [agents, setAgents] = useState<Agent[]>(defaultAgents);
  const [skillCatalog, setSkillCatalog] = useState<SkillCatalogItem[]>(defaultSkills);
  const [customSkills, setCustomSkills] = useState<CustomSkill[]>(defaultCustomSkills);
  const [miniApps, setMiniApps] = useState<MiniApp[]>(defaultMiniApps);
  const [miniAppTemplates, setMiniAppTemplates] =
    useState<MiniAppTemplate[]>(defaultMiniAppTemplates);
  const [miniAppGeneration, setMiniAppGeneration] = useState({
    active: false,
    stage: "idle",
    progress: 0,
  });
  const [myHouseType, setMyHouseType] = useState<number>(3);
  const [uiTheme, setUiTheme] = useState<UiTheme>("neo");
  const [language, setLanguage] = useState<AppLanguage>("en");
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
  const [bootstrapReady, setBootstrapReady] = useState(false);

  const refreshAll = useCallback(async () => {
    const payload = await fetchBootstrap();

    if (payload.botConfig) setBotConfig(payload.botConfig);
    if (Array.isArray(payload.tasks)) setTasks(payload.tasks);
    if (Array.isArray(payload.chatThreads) && payload.chatThreads.length > 0) {
      setChatThreads(payload.chatThreads);
    }
    if (payload.messages && typeof payload.messages === "object") {
      setMessagesByThread(payload.messages);
    }
    if (Array.isArray(payload.friends)) {
      setFriends(payload.friends);
    }
    if (payload.threadMembers && typeof payload.threadMembers === "object") {
      setThreadMembers(payload.threadMembers);
    }
    if (Array.isArray(payload.agents)) {
      setAgents(payload.agents);
    }
    if (Array.isArray(payload.skillCatalog)) {
      setSkillCatalog(payload.skillCatalog);
    }
    if (Array.isArray(payload.customSkills)) {
      setCustomSkills(payload.customSkills);
    }
    if (Array.isArray(payload.miniApps)) {
      setMiniApps(payload.miniApps);
    }
    if (Array.isArray(payload.miniAppTemplates)) {
      setMiniAppTemplates(payload.miniAppTemplates);
    }
    if (typeof payload.myHouseType === "number") {
      setMyHouseType(payload.myHouseType);
    }
    if (payload.uiTheme === "classic" || payload.uiTheme === "neo") {
      setUiTheme(payload.uiTheme);
    }
    if (payload.language === "zh" || payload.language === "en") {
      setLanguage(payload.language);
    }
    if (typeof payload.voiceModeEnabled === "boolean") {
      setVoiceModeEnabled(payload.voiceModeEnabled);
    }
  }, []);

  const refreshThreadMessages = useCallback(async (threadId: string) => {
    if (!threadId) return;

    // Load from local cache first for instant paint.
    const cached = await readThreadCache(threadId);
    if (cached && cached.length > 0) {
      setMessagesByThread((prev) => ({
        ...prev,
        [threadId]: cached.slice(-MESSAGE_RENDER_WINDOW),
      }));
    }

    const latest = await listThreadMessagesApi(threadId, { limit: MESSAGE_PAGE_SIZE });
    const merged = cached && cached.length > 0 ? mergeAppendUnique(cached, latest) : latest;
    void writeThreadCache(threadId, merged);

    setMessagesByThread((prev) => ({
      ...prev,
      [threadId]: merged.slice(-MESSAGE_RENDER_WINDOW),
    }));
  }, []);

  const loadOlderMessages = useCallback(async (threadId: string) => {
    if (!threadId) return 0;
    const current = messagesByThreadRef.current[threadId] || [];
    if (current.length === 0) return 0;
    const oldest = current[0]?.id;
    if (!oldest) return 0;

    // Try local cache first.
    const cached = await readThreadCache(threadId);
    if (cached && cached.length > 0) {
      const idx = cached.findIndex((m) => m.id === oldest);
      if (idx > 0) {
        const start = Math.max(0, idx - MESSAGE_PAGE_SIZE);
        const chunk = cached.slice(start, idx);
        if (chunk.length > 0) {
          setMessagesByThread((prev) => {
            const history = prev[threadId] || [];
            return {
              ...prev,
              [threadId]: [...chunk, ...history],
            };
          });
          return chunk.length;
        }
      }
    }

    // Fetch older page from server.
    const older = await listThreadMessagesApi(threadId, { limit: MESSAGE_PAGE_SIZE, before: oldest });
    if (!Array.isArray(older) || older.length === 0) return 0;

    setMessagesByThread((prev) => {
      const history = prev[threadId] || [];
      return {
        ...prev,
        [threadId]: [...older, ...history],
      };
    });
    void (async () => {
      const base = (await readThreadCache(threadId)) || [];
      const merged = mergePrependUnique(base, older);
      await writeThreadCache(threadId, merged);
    })();

    return older.length;
  }, []);

  const listMembers = useCallback(async (threadId: string) => {
    if (!threadId) return;
    try {
      const members = await listThreadMembersApi(threadId);
      setThreadMembers((prev) => ({
        ...prev,
        [threadId]: members,
      }));
    } catch {
      // Ignore loading failure.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!isSignedIn) {
      setBootstrapReady(true);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        await refreshAll();
      } catch {
        // Keep local fallback state when backend is unavailable.
      } finally {
        if (!cancelled) {
          setBootstrapReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, refreshAll]);

  useEffect(() => {
    if (!isSignedIn) return;

    const unsubscribe = subscribeRealtime((event: RealtimeEvent) => {
      if (!event?.type) return;

      switch (event.type) {
        case "chat.thread.created": {
          const payload = event.payload as ChatThread;
          if (!payload?.id) break;
          setChatThreads((prev) => upsertById(prev, payload, true));
          break;
        }
        case "chat.message.created": {
          const payload = event.payload as ConversationMessage;
          const threadId = event.threadId || payload?.threadId;
          if (!threadId || !payload?.id) break;

          setMessagesByThread((prev) => {
            const history = prev[threadId] || [];
            if (history.some((item) => item.id === payload.id)) {
              return prev;
            }
            return {
              ...prev,
              [threadId]: [...history, { ...payload, threadId }],
            };
          });

          void upsertThreadCache(threadId, [{ ...payload, threadId }]);
          setChatThreads((prev) => updateThreadPreview(prev, threadId, previewMessage(payload)));
          break;
        }
        case "task.created":
        case "task.created_from_message": {
          const payload = event.payload as TaskItem;
          if (!payload?.id) break;
          setTasks((prev) => [payload, ...prev.filter((item) => item.id !== payload.id)]);
          break;
        }
        case "task.updated": {
          const payload = event.payload as TaskItem;
          if (!payload?.id) break;
          setTasks((prev) => prev.map((item) => (item.id === payload.id ? payload : item)));
          break;
        }
        case "task.deleted": {
          const payload = event.payload as { id?: string };
          if (!payload?.id) break;
          setTasks((prev) => prev.filter((item) => item.id !== payload.id));
          break;
        }
        case "agent.created":
        case "agent.updated":
        case "agent.skills.updated": {
          const payload = event.payload as Agent;
          if (!payload?.id) break;
          setAgents((prev) => upsertById(prev, payload, true));
          break;
        }
        case "agent.deleted": {
          const payload = event.payload as { id?: string };
          if (!payload?.id) break;
          setAgents((prev) => prev.filter((item) => item.id !== payload.id));
          break;
        }
        case "friend.created": {
          const payload = event.payload as Friend;
          if (!payload?.id) break;
          setFriends((prev) => upsertById(prev, payload, true));
          break;
        }
        case "friend.deleted": {
          const payload = event.payload as { id?: string };
          if (!payload?.id) break;
          setFriends((prev) => prev.filter((item) => item.id !== payload.id));
          break;
        }
        case "thread.member.added": {
          const payload = event.payload as ThreadMember;
          const threadId = event.threadId || payload?.threadId;
          if (!threadId || !payload?.id) break;
          setThreadMembers((prev) => {
            const members = prev[threadId] || [];
            if (members.some((item) => item.id === payload.id)) {
              return prev;
            }
	  return {
              ...prev,
              [threadId]: [...members, { ...payload, threadId }],
            };
          });
          break;
        }
        case "thread.member.removed": {
          const payload = event.payload as { id?: string; threadId?: string };
          const threadId = event.threadId || payload?.threadId;
          if (!threadId || !payload?.id) break;
          setThreadMembers((prev) => {
            const members = prev[threadId] || [];
            return {
              ...prev,
              [threadId]: members.filter((item) => item.id !== payload.id),
            };
          });
          break;
        }
        case "miniapp.generated":
        case "miniapp.updated": {
          const payload = event.payload as MiniApp;
          if (!payload?.id) break;
          setMiniApps((prev) => upsertById(prev, payload, true));
          setMiniAppGeneration({
            active: false,
            stage: "ready",
            progress: 100,
          });
          break;
        }
        case "miniapp.deleted": {
          const payload = event.payload as { id?: string };
          if (!payload?.id) break;
          setMiniApps((prev) => prev.filter((item) => item.id !== payload.id));
          break;
        }
        case "miniapp.generation.progress": {
          const payload = event.payload as { stage?: string; progress?: number };
          const progress = typeof payload?.progress === "number" ? payload.progress : 0;
          const stage = payload?.stage || "working";
          setMiniAppGeneration({
            active: progress < 100,
            stage,
            progress,
          });
          break;
        }
        case "skill.custom.created": {
          const payload = event.payload as CustomSkill;
          if (!payload?.id) break;
          setCustomSkills((prev) => upsertById(prev, payload, true));
          break;
        }
        default:
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isSignedIn]);

  const value = useMemo<AgentTownContextValue>(() => {
    return {
      botConfig,
      tasks,
      chatThreads,
      messagesByThread,
      friends,
      threadMembers,
      agents,
      skillCatalog,
      customSkills,
      miniApps,
      miniAppTemplates,
      miniAppGeneration,
      myHouseType,
      uiTheme,
      language,
      voiceModeEnabled,
      bootstrapReady,
      updateBotConfig: (next) => {
        setBotConfig(next);
        void saveBotConfig(next).catch(() => {
          // Keep optimistic state.
        });
      },
      addTask: (task) => {
        const nextTask: TaskItem = {
          ...task,
          id: task.id || `task_${Date.now()}`,
        };
        setTasks((prev) => [nextTask, ...prev]);
        void createTaskApi(nextTask).catch(() => {
          // Keep optimistic state.
        });
      },
      addChatThread: (thread) => {
        const nextThread: ChatThread = {
          ...thread,
          id: thread.id || `thread_${Date.now()}`,
          time: thread.time || "Now",
        };
        setChatThreads((prev) => upsertById(prev, nextThread, true));
        void createChatThread(nextThread).catch(() => {
          // Keep optimistic state.
        });
      },
      updateHouseType: setMyHouseType,
      updateUiTheme: setUiTheme,
      updateLanguage: setLanguage,
      updateVoiceModeEnabled: setVoiceModeEnabled,
      refreshAll,
      refreshThreadMessages,
      loadOlderMessages,
      sendMessage: async (threadId, payload) => {
        if (!threadId) return null;
        try {
          const result = await sendThreadMessageApi(threadId, payload);
          if (Array.isArray(result.messages)) {
            setMessagesByThread((prev) => ({
              ...prev,
              [threadId]: result.messages,
            }));
            void upsertThreadCache(threadId, result.messages);
          }
          const preview = result.aiMessage
            ? previewMessage(result.aiMessage)
            : previewMessage(result.userMessage);
          setChatThreads((prev) => updateThreadPreview(prev, threadId, preview));
          return result;
        } catch {
          return null;
        }
      },
      createFriend: async (input) => {
        try {
          const created = await createFriendApi(input);
          setFriends((prev) => upsertById(prev, created, true));
          return created;
        } catch {
          return null;
        }
      },
      removeFriend: async (friendId) => {
        if (!friendId) return;
        setFriends((prev) => removeById(prev, friendId));
        try {
          await deleteFriendApi(friendId);
        } catch {
          // Keep optimistic state.
        }
      },
      createAgent: async (input) => {
        try {
          const created = await createAgentApi(input);
          setAgents((prev) => upsertById(prev, created, true));
          return created;
        } catch {
          return null;
        }
      },
      toggleAgentSkill: async (agentId, skillId, install) => {
        if (!agentId || !skillId) return;
        try {
          const updated = await toggleAgentSkillApi(agentId, skillId, install);
          setAgents((prev) => upsertById(prev, updated, true));
        } catch {
          // Keep local state untouched.
        }
      },
      createGroup: async (input) => {
        if (!input.name.trim()) return null;

        const draft: ChatThread = {
          id: `group_${Date.now()}`,
          name: input.name.trim(),
          avatar:
            input.avatar?.trim() ||
            "https://img.freepik.com/free-psd/3d-illustration-human-avatar-profile_23-2150671142.jpg?w=200",
          message: "Say hello",
          time: "Now",
          isGroup: true,
          memberCount: input.memberCount || 1,
          supportsVideo: true,
        };

        setChatThreads((prev) => upsertById(prev, draft, true));
        try {
          const created = await createChatThread(draft);
          setChatThreads((prev) => upsertById(prev, created, true));
          return created;
        } catch {
          return draft;
        }
      },
      listMembers,
      addMember: async (threadId, input) => {
        if (!threadId) return;
        try {
          const member = await addThreadMemberApi(threadId, input);
          setThreadMembers((prev) => {
            const members = prev[threadId] || [];
            if (members.some((item) => item.id === member.id)) {
              return prev;
            }
            return {
              ...prev,
              [threadId]: [...members, member],
            };
          });
          setChatThreads((prev) =>
            prev.map((thread) =>
              thread.id === threadId && thread.isGroup
                ? { ...thread, memberCount: (thread.memberCount || 0) + 1 }
                : thread
            )
          );
        } catch {
          // Ignore operation failure.
        }
      },
      removeMember: async (threadId, memberId) => {
        if (!threadId || !memberId) return;
        setThreadMembers((prev) => {
          const members = prev[threadId] || [];
          return {
            ...prev,
            [threadId]: members.filter((item) => item.id !== memberId),
          };
        });
        setChatThreads((prev) =>
          prev.map((thread) =>
            thread.id === threadId && thread.isGroup
              ? { ...thread, memberCount: Math.max(0, (thread.memberCount || 1) - 1) }
              : thread
          )
        );
        try {
          await removeThreadMemberApi(threadId, memberId);
        } catch {
          // Keep optimistic state.
        }
      },
      createTaskFromMessage: async (threadId, messageId, title) => {
        if (!threadId || !messageId) return null;
        try {
          const created = await createTaskFromMessageApi({
            threadId,
            messageId,
            title,
          });
          setTasks((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
          return created;
        } catch {
          return null;
        }
      },
      updateTask: async (taskId, patch) => {
        if (!taskId) return;
        try {
          const updated = await patchTaskApi(taskId, patch);
          setTasks((prev) => prev.map((item) => (item.id === taskId ? updated : item)));
        } catch {
          // Ignore update failure.
        }
      },
      createCustomSkill: async (input) => {
        try {
          const created = await createCustomSkillApi(input);
          setCustomSkills((prev) => upsertById(prev, created, true));
          setSkillCatalog((prev) =>
            upsertById(prev, {
              id: created.id,
              name: created.name,
              description: created.description || "Custom Markdown Skill",
              type: "custom",
              permissionScope: created.permissionScope,
              version: created.version,
              tags: ["custom", "markdown"],
            }, true)
          );
          return created;
        } catch {
          return null;
        }
      },
      patchCustomSkill: async (skillId, patch) => {
        if (!skillId) return null;
        try {
          const updated = await patchCustomSkillApi(skillId, patch);
          setCustomSkills((prev) => upsertById(prev, updated, true));
          setSkillCatalog((prev) =>
            prev.map((item) =>
              item.id === skillId
                ? {
                    ...item,
                    name: updated.name,
                    description: updated.description || "Custom Markdown Skill",
                    permissionScope: updated.permissionScope,
                    version: updated.version,
                  }
                : item
            )
          );
          return updated;
        } catch {
          return null;
        }
      },
      removeCustomSkill: async (skillId) => {
        if (!skillId) return;
        setCustomSkills((prev) => prev.filter((item) => item.id !== skillId));
        setSkillCatalog((prev) => prev.filter((item) => item.id !== skillId));
        setAgents((prev) =>
          prev.map((agent) => ({
            ...agent,
            installedSkillIds: agent.installedSkillIds.filter((id) => id !== skillId),
          }))
        );

        try {
          await deleteCustomSkillApi(skillId);
        } catch {
          // Keep optimistic state.
        }
      },
      executeCustomSkill: async (skillId, input, threadId, variables) => {
        if (!skillId) return null;
        try {
          const result = await executeCustomSkillApi(skillId, {
            input,
            threadId,
            variables,
          });
          const message = result.message;
          if (threadId && message) {
            setMessagesByThread((prev) => {
              const history = prev[threadId] || [];
              if (history.some((item) => item.id === message.id)) {
                return prev;
              }
              return {
                ...prev,
                [threadId]: [...history, message],
              };
            });
            setChatThreads((prev) => updateThreadPreview(prev, threadId, previewMessage(message)));
          }
          return result.output;
        } catch {
          return null;
        }
      },
      generateRoleReplies: async (threadId, prompt, memberIds) => {
        if (!threadId || !prompt.trim()) return [];
        try {
          const result = await generateRoleRepliesApi(threadId, {
            prompt,
            memberIds,
            appendUserMessage: true,
          });

          setMessagesByThread((prev) => {
            const history = prev[threadId] || [];
            const next = [...history];
            if (result.userMessage && !next.some((item) => item.id === result.userMessage?.id)) {
              next.push(result.userMessage);
            }
            for (const reply of result.replies || []) {
              if (!next.some((item) => item.id === reply.id)) {
                next.push(reply);
              }
            }
            return {
              ...prev,
              [threadId]: next,
            };
          });

          const cacheBatch: ConversationMessage[] = [];
          if (result.userMessage) cacheBatch.push(result.userMessage);
          if (Array.isArray(result.replies) && result.replies.length) {
            cacheBatch.push(...result.replies);
          }
          void upsertThreadCache(threadId, cacheBatch);

          const latest = result.replies?.[result.replies.length - 1];
          if (latest) {
            setChatThreads((prev) => updateThreadPreview(prev, threadId, previewMessage(latest)));
          }

          return result.replies || [];
        } catch (err) {
          // Do not swallow errors: the chat screen needs to surface failures (e.g. rate limits)
          // instead of silently clearing the input and showing nothing.
          throw err;
        }
      },
      generateMiniApp: async (query, sources) => {
        if (!query.trim()) return null;
        setMiniAppGeneration({
          active: true,
          stage: "request",
          progress: 5,
        });
        try {
          const created = await generateMiniAppApi({
            query,
            sources,
          });
          setMiniApps((prev) => upsertById(prev, created, true));
          setMiniAppGeneration({
            active: false,
            stage: "ready",
            progress: 100,
          });
          return created;
        } catch {
          setMiniAppGeneration({
            active: false,
            stage: "error",
            progress: 0,
          });
          return null;
        }
      },
      installMiniApp: async (appId, install = true) => {
        if (!appId) return;
        try {
          const updated = await installMiniAppApi(appId, install);
          setMiniApps((prev) => upsertById(prev, updated, true));
        } catch {
          // Ignore install failure.
        }
      },
      runMiniApp: async (appId, input, params, threadId) => {
        if (!appId || (!input.trim() && !params)) return null;
        try {
          const result = await runMiniAppApi(appId, {
            input,
            params,
            threadId,
          });

          setMiniApps((prev) =>
            prev.map((item) =>
              item.id === appId
                ? {
                    ...item,
                    preview: {
                      ...(item.preview || {}),
                      lastRun: {
                        input,
                        params,
                        output: result.output,
                        ranAt: result.ranAt,
                      },
                    },
                  }
                : item
            )
          );

          const message = result.message;
          if (threadId && message) {
            setMessagesByThread((prev) => {
              const history = prev[threadId] || [];
              if (history.some((item) => item.id === message.id)) {
                return prev;
              }
              return {
                ...prev,
                [threadId]: [...history, message],
              };
            });
            setChatThreads((prev) => updateThreadPreview(prev, threadId, previewMessage(message)));
          }

          return result.output;
        } catch {
          return null;
        }
      },
      removeMiniApp: async (appId) => {
        if (!appId) return;
        setMiniApps((prev) => prev.filter((item) => item.id !== appId));
        try {
          await deleteMiniAppApi(appId);
        } catch {
          // Keep optimistic state.
        }
      },
    };
  }, [
    agents,
    bootstrapReady,
    botConfig,
    chatThreads,
    customSkills,
    friends,
    language,
    listMembers,
    messagesByThread,
    miniAppTemplates,
    miniAppGeneration,
    miniApps,
    myHouseType,
    refreshAll,
    refreshThreadMessages,
    skillCatalog,
    tasks,
    threadMembers,
    uiTheme,
    voiceModeEnabled,
  ]);

  return <AgentTownContext.Provider value={value}>{children}</AgentTownContext.Provider>;
}

export function useAgentTown(): AgentTownContextValue {
  const value = useContext(AgentTownContext);
  if (!value) {
    throw new Error("useAgentTown must be used inside AgentTownProvider");
  }
  return value;
}
