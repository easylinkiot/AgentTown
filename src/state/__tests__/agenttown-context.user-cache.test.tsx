import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";

import {
  fetchBootstrap,
  getThreadDisplayLanguage,
  listChatThreads,
  listThreadMessages,
  subscribeRealtime,
} from "@/src/lib/api";
import { useAuth } from "../auth-context";
import { AgentTownProvider, useAgentTown } from "../agenttown-context";

const mockFs = {
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  Paths: {} as Record<string, unknown>,
};

Object.defineProperty(mockFs.Paths, "document", {
  get() {
    return { uri: "file:///tmp/" };
  },
});

jest.mock("expo-file-system", () => mockFs);
jest.mock("expo-file-system/legacy", () => mockFs);

jest.mock("../auth-context", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

jest.mock("@/src/services/task-notifications", () => ({
  clearTaskReminderNotifications: jest.fn(),
  ensureTaskReminderPermission: jest.fn().mockResolvedValue(true),
  syncTaskReminderNotifications: jest.fn(),
}));

jest.mock("@/src/lib/api", () => ({
  addThreadMember: jest.fn(),
  atCreateSession: jest.fn(),
  createAgent: jest.fn(),
  createChatThread: jest.fn(),
  createCustomSkill: jest.fn(),
  createFriend: jest.fn(),
  createTask: jest.fn(),
  createTaskFromMessage: jest.fn(),
  deleteChatThread: jest.fn(),
  deleteCustomSkill: jest.fn(),
  deleteFriend: jest.fn(),
  deleteMiniApp: jest.fn(),
  executeCustomSkill: jest.fn(),
  fetchBootstrap: jest.fn(),
  generateMiniApp: jest.fn(),
  generateRoleReplies: jest.fn(),
  getThreadDisplayLanguage: jest.fn(),
  installBotSkill: jest.fn(),
  installMiniApp: jest.fn(),
  listChatSessionMessages: jest.fn(),
  listChatThreads: jest.fn(),
  listThreadMembers: jest.fn(),
  listThreadMessages: jest.fn(),
  listV2ChatSessionMessages: jest.fn(),
  mapATMessageToConversation: jest.fn(),
  mapATSessionToThread: jest.fn(),
  patchCustomSkill: jest.fn(),
  patchTask: jest.fn(),
  queryChatTargetHistory: jest.fn(),
  removeThreadMember: jest.fn(),
  runMiniApp: jest.fn(),
  saveBotConfig: jest.fn(),
  sendThreadMessage: jest.fn(),
  subscribeRealtime: jest.fn(),
  toggleAgentSkill: jest.fn(),
  uninstallBotSkill: jest.fn(),
  updateThreadDisplayLanguage: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedFetchBootstrap = fetchBootstrap as jest.Mock;
const mockedGetThreadDisplayLanguage = getThreadDisplayLanguage as jest.Mock;
const mockedListChatThreads = listChatThreads as jest.Mock;
const mockedListThreadMessages = listThreadMessages as jest.Mock;
const mockedSubscribeRealtime = subscribeRealtime as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  return <AgentTownProvider>{children}</AgentTownProvider>;
}

describe("agenttown-context user thread cache policy", () => {
  const originalPlatform = Platform.OS;
  const APP_LANGUAGE_STORAGE_KEY = "agenttown.app.language";

  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.clear();
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "ios",
    });

    mockedUseAuth.mockReturnValue({
      isSignedIn: true,
      user: {
        id: "u_owner",
        displayName: "Owner",
      },
    });

    mockedSubscribeRealtime.mockImplementation(() => () => {});
    mockedGetThreadDisplayLanguage.mockResolvedValue({
      thread_id: "any_thread",
      language: "en",
    });
    mockedFetchBootstrap.mockResolvedValue({
      chatThreads: [],
      tasks: [],
      messages: {},
      friends: [],
      threadMembers: {},
      agents: [],
      skillCatalog: [],
      customSkills: [],
      miniApps: [],
      miniAppTemplates: [],
    });
    mockFs.getInfoAsync.mockReset();
    mockFs.makeDirectoryAsync.mockReset();
    mockFs.readAsStringAsync.mockReset();
    mockFs.writeAsStringAsync.mockReset();
    mockFs.getInfoAsync.mockResolvedValue({ exists: false });
    mockFs.makeDirectoryAsync.mockResolvedValue(undefined);
    mockFs.readAsStringAsync.mockResolvedValue("[]");
    mockFs.writeAsStringAsync.mockResolvedValue(undefined);
  });

  afterAll(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatform,
    });
  });

  it("does not read or write local cache for user threads", async () => {
    mockedListChatThreads.mockResolvedValue([
      {
        id: "sess_user_1",
        name: "Direct User",
        avatar: "",
        message: "",
        time: "Now",
        isGroup: false,
        targetType: "user",
        targetId: "u_1",
      },
    ]);
    mockedListThreadMessages.mockResolvedValue([
      {
        id: "msg_1",
        threadId: "sess_user_1",
        senderId: "u_1",
        senderName: "Direct User",
        senderAvatar: "",
        senderType: "human",
        content: "hello",
        type: "text",
        isMe: false,
        time: "Now",
      },
    ]);

    const { result } = renderHook(() => useAgentTown(), { wrapper });
    await waitFor(() => expect(result.current.bootstrapReady).toBe(true));

    await act(async () => {
      await result.current.refreshThreadMessages("sess_user_1");
    });

    await waitFor(() => expect(result.current.messagesByThread["sess_user_1"]?.[0]?.content).toBe("hello"));
    expect(mockFs.getInfoAsync).not.toHaveBeenCalled();
    expect(mockFs.readAsStringAsync).not.toHaveBeenCalled();
    expect(mockFs.writeAsStringAsync).not.toHaveBeenCalled();
  });

  it("still loads non-user threads after the cache gate change", async () => {
    mockedListChatThreads.mockResolvedValue([
      {
        id: "grp_1",
        name: "Work Group",
        avatar: "",
        message: "",
        time: "Now",
        isGroup: true,
        targetType: "group",
        targetId: "g_1",
      },
    ]);
    mockedListThreadMessages.mockResolvedValue([
      {
        id: "msg_group_1",
        threadId: "grp_1",
        senderId: "u_2",
        senderName: "Teammate",
        senderAvatar: "",
        senderType: "human",
        content: "group hello",
        type: "text",
        isMe: false,
        time: "Now",
      },
    ]);

    const { result } = renderHook(() => useAgentTown(), { wrapper });
    await waitFor(() => expect(result.current.bootstrapReady).toBe(true));

    await act(async () => {
      await result.current.refreshThreadMessages("grp_1");
    });

    await waitFor(() => expect(result.current.messagesByThread["grp_1"]?.[0]?.content).toBe("group hello"));
  });

  it("prefers the locally selected app language over bootstrap language after sign-in", async () => {
    await mockAsyncStorage.setItem(APP_LANGUAGE_STORAGE_KEY, "zh");
    mockedFetchBootstrap.mockResolvedValue({
      chatThreads: [],
      tasks: [],
      messages: {},
      friends: [],
      threadMembers: {},
      agents: [],
      skillCatalog: [],
      customSkills: [],
      miniApps: [],
      miniAppTemplates: [],
      language: "en",
    });

    const { result } = renderHook(() => useAgentTown(), { wrapper });

    await waitFor(() => expect(result.current.bootstrapReady).toBe(true));
    await waitFor(() => expect(result.current.language).toBe("zh"));
  });
});
