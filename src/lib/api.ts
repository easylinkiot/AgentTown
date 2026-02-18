import {
  Agent,
  AppBootstrapState,
  AuthUser,
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
  ThreadMemberType,
} from "@/src/types";

export interface BootstrapPayload extends AppBootstrapState {}

export interface AuthSessionPayload {
  token: string;
  user: AuthUser;
}

export interface SendThreadMessageInput {
  content: string;
  type?: string;
  imageUri?: string;
  imageName?: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  senderType?: string;
  isMe?: boolean;
  requestAI?: boolean;
  systemInstruction?: string;
  history?: Array<{ role: "user" | "model"; text: string }>;
}

export interface SendThreadMessageOutput {
  userMessage: ConversationMessage;
  aiMessage?: ConversationMessage;
  messages: ConversationMessage[];
}

export interface CreateTaskFromMessageInput {
  threadId: string;
  messageId: string;
  title?: string;
  assignee?: string;
  priority?: "High" | "Medium" | "Low";
  dueAt?: string;
}

export interface PatchTaskInput {
  title?: string;
  assignee?: string;
  priority?: "High" | "Medium" | "Low";
  status?: "Pending" | "In Progress" | "Done";
  dueAt?: string;
}

export interface CreateAgentInput {
  name: string;
  avatar?: string;
  description?: string;
  rolePrompt?: string;
  persona?: string;
  tools?: string[];
  safetyLevel?: string;
}

export interface PatchAgentInput {
  name?: string;
  avatar?: string;
  description?: string;
  rolePrompt?: string;
  persona?: string;
  tools?: string[];
  safetyLevel?: string;
  status?: "online" | "offline";
}

export interface AgentChatInput {
  threadId?: string;
  message: string;
  history?: Array<{ role: "user" | "model"; text: string }>;
}

export interface AgentChatOutput {
  agentId: string;
  reply: string;
  message?: ConversationMessage;
}

export interface GenerateMiniAppInput {
  query: string;
  sources: string[];
}

export interface RunMiniAppInput {
  input?: string;
  params?: Record<string, unknown>;
  threadId?: string;
}

export interface RunMiniAppOutput {
  appId: string;
  output: string;
  ranAt: string;
  message?: ConversationMessage;
}

export interface CreateFriendInput {
  name: string;
  avatar?: string;
  kind?: "human" | "bot";
  role?: string;
  company?: string;
  threadId?: string;
}

export interface AddThreadMemberInput {
  friendId?: string;
  agentId?: string;
  memberType?: ThreadMemberType;
  name?: string;
  avatar?: string;
}

export interface CreateCustomSkillInput {
  name: string;
  description?: string;
  markdown: string;
  permissionScope?: string;
  executor?: string;
  version?: string;
  enabled?: boolean;
}

export interface ExecuteCustomSkillInput {
  input: string;
  threadId?: string;
  variables?: Record<string, unknown>;
}

export interface ExecuteCustomSkillOutput {
  skillId: string;
  output: string;
  message?: ConversationMessage;
}

export interface RoleRepliesInput {
  prompt: string;
  memberIds?: string[];
  appendUserMessage?: boolean;
}

export interface RoleRepliesOutput {
  threadId: string;
  userMessage?: ConversationMessage;
  replies: ConversationMessage[];
}

const DEFAULT_API_BASE_URL = "https://agenttown-api.kittens.cloud";

let authToken: string | null = null;

export function setAuthToken(token?: string | null) {
  authToken = token?.trim() || null;
}

export function getAuthToken() {
  return authToken;
}

function getApiBaseUrl() {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
  return raw.replace(/\/+$/, "");
}

function getRealtimeBaseUrl() {
  const base = getApiBaseUrl();
  if (base.startsWith("https://")) return `wss://${base.slice(8)}`;
  if (base.startsWith("http://")) return `ws://${base.slice(7)}`;
  return base;
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  options?: { skipAuth?: boolean; rawText?: boolean }
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers ? (init.headers as Record<string, string>) : {}),
  };
  if (!options?.skipAuth && authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `API request failed (${response.status})`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  if (options?.rawText) {
    return (await response.text()) as unknown as T;
  }

  return (await response.json()) as T;
}

export async function authRegister(payload: {
  email: string;
  password: string;
  displayName: string;
}) {
  return apiFetch<AuthSessionPayload>("/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  }, { skipAuth: true });
}

export async function authLogin(payload: { email: string; password: string }) {
  return apiFetch<AuthSessionPayload>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  }, { skipAuth: true });
}

export async function authGuest(displayName?: string) {
  return apiFetch<AuthSessionPayload>("/v1/auth/guest", {
    method: "POST",
    body: JSON.stringify({ displayName }),
  }, { skipAuth: true });
}

export async function authProvider(payload: {
  provider: "google" | "apple" | "phone";
  providerUserId: string;
  idToken?: string;
  email?: string;
  displayName?: string;
}) {
  return apiFetch<AuthSessionPayload>("/v1/auth/provider", {
    method: "POST",
    body: JSON.stringify(payload),
  }, { skipAuth: true });
}

export async function authMe() {
  return apiFetch<AuthUser>("/v1/auth/me");
}

export async function fetchBootstrap() {
  return apiFetch<BootstrapPayload>("/v1/bootstrap");
}

export async function saveBotConfig(payload: BotConfig) {
  return apiFetch<BotConfig>("/v1/bot-config", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function listTasks() {
  return apiFetch<TaskItem[]>("/v1/tasks");
}

export async function createTask(payload: TaskItem) {
  return apiFetch<TaskItem>("/v1/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createTaskFromMessage(payload: CreateTaskFromMessageInput) {
  return apiFetch<TaskItem>("/v1/tasks/from-message", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function patchTask(taskId: string, payload: PatchTaskInput) {
  return apiFetch<TaskItem>(`/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteTask(taskId: string) {
  return apiFetch<{ ok: boolean; id: string }>(`/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: "DELETE",
  });
}

export async function listChatThreads() {
  return apiFetch<ChatThread[]>("/v1/chat/threads");
}

export async function createChatThread(payload: ChatThread) {
  return apiFetch<ChatThread>("/v1/chat/threads", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listThreadMessages(threadId: string) {
  return apiFetch<ConversationMessage[]>(
    `/v1/chat/threads/${encodeURIComponent(threadId)}/messages`
  );
}

export async function sendThreadMessage(threadId: string, payload: SendThreadMessageInput) {
  return apiFetch<SendThreadMessageOutput>(
    `/v1/chat/threads/${encodeURIComponent(threadId)}/messages`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function generateRoleReplies(threadId: string, payload: RoleRepliesInput) {
  return apiFetch<RoleRepliesOutput>(
    `/v1/chat/threads/${encodeURIComponent(threadId)}/role-replies`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function listFriends() {
  return apiFetch<Friend[]>("/v1/friends");
}

export async function createFriend(payload: CreateFriendInput) {
  return apiFetch<Friend>("/v1/friends", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteFriend(friendId: string) {
  return apiFetch<{ ok: boolean; id: string }>(`/v1/friends/${encodeURIComponent(friendId)}`, {
    method: "DELETE",
  });
}

export async function listThreadMembers(threadId: string) {
  return apiFetch<ThreadMember[]>(`/v1/chat/threads/${encodeURIComponent(threadId)}/members`);
}

export async function addThreadMember(threadId: string, payload: AddThreadMemberInput) {
  return apiFetch<ThreadMember>(`/v1/chat/threads/${encodeURIComponent(threadId)}/members`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function removeThreadMember(threadId: string, memberId: string) {
  return apiFetch<{ ok: boolean; id: string; threadId: string }>(
    `/v1/chat/threads/${encodeURIComponent(threadId)}/members/${encodeURIComponent(memberId)}`,
    {
      method: "DELETE",
    }
  );
}

export async function listAgents() {
  return apiFetch<Agent[]>("/v1/agents");
}

export async function createAgent(payload: CreateAgentInput) {
  return apiFetch<Agent>("/v1/agents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function patchAgent(agentId: string, payload: PatchAgentInput) {
  return apiFetch<Agent>(`/v1/agents/${encodeURIComponent(agentId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAgent(agentId: string) {
  return apiFetch<{ ok: boolean; id: string }>(`/v1/agents/${encodeURIComponent(agentId)}`, {
    method: "DELETE",
  });
}

export async function agentChat(agentId: string, payload: AgentChatInput) {
  return apiFetch<AgentChatOutput>(`/v1/agents/${encodeURIComponent(agentId)}/chat`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function toggleAgentSkill(agentId: string, skillId: string, install: boolean) {
  return apiFetch<Agent>(
    `/v1/agents/${encodeURIComponent(agentId)}/skills/${encodeURIComponent(skillId)}`,
    {
      method: "POST",
      body: JSON.stringify({ install }),
    }
  );
}

export async function listSkillCatalog() {
  return apiFetch<SkillCatalogItem[]>("/v1/skills/catalog");
}

export async function listCustomSkills() {
  return apiFetch<CustomSkill[]>("/v1/skills/custom");
}

export async function createCustomSkill(payload: CreateCustomSkillInput) {
  return apiFetch<CustomSkill>("/v1/skills/custom", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function patchCustomSkill(
  skillId: string,
  payload: Partial<CreateCustomSkillInput> & { enabled?: boolean }
) {
  return apiFetch<CustomSkill>(`/v1/skills/custom/${encodeURIComponent(skillId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteCustomSkill(skillId: string) {
  return apiFetch<{ ok: boolean; id: string }>(`/v1/skills/custom/${encodeURIComponent(skillId)}`, {
    method: "DELETE",
  });
}

export async function executeCustomSkill(skillId: string, payload: ExecuteCustomSkillInput) {
  return apiFetch<ExecuteCustomSkillOutput>(
    `/v1/skills/custom/${encodeURIComponent(skillId)}/execute`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function listMiniApps() {
  return apiFetch<MiniApp[]>("/v1/miniapps");
}

export async function listMiniAppTemplates() {
  return apiFetch<MiniAppTemplate[]>("/v1/miniapps/templates");
}

export async function generateMiniApp(payload: GenerateMiniAppInput) {
  return apiFetch<MiniApp>("/v1/miniapps/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function installMiniApp(appId: string, install = true) {
  return apiFetch<MiniApp>(`/v1/miniapps/${encodeURIComponent(appId)}/install`, {
    method: "POST",
    body: JSON.stringify({ install }),
  });
}

export async function runMiniApp(appId: string, payload: RunMiniAppInput) {
  return apiFetch<RunMiniAppOutput>(`/v1/miniapps/${encodeURIComponent(appId)}/run`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteMiniApp(appId: string) {
  return apiFetch<{ ok: boolean; id: string }>(`/v1/miniapps/${encodeURIComponent(appId)}`, {
    method: "DELETE",
  });
}

export async function aiText(payload: {
  prompt: string;
  systemInstruction?: string;
  history?: Array<{ role: "user" | "model"; text: string }>;
  fallback?: string;
}) {
  return apiFetch<{ text: string }>("/v1/ai/text", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function aiJSON(payload: {
  prompt: string;
  systemInstruction?: string;
  history?: Array<{ role: "user" | "model"; text: string }>;
  fallback?: string;
}) {
  return apiFetch<{ jsonText: string }>("/v1/ai/json", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchAdminBackup() {
  return apiFetch<BootstrapPayload>("/v1/admin/backup");
}

export async function restoreAdminBackup(payload: BootstrapPayload) {
  return apiFetch<{ ok: boolean }>("/v1/admin/restore", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchMetricsText() {
  return apiFetch<string>("/metrics", undefined, { rawText: true });
}

export function subscribeRealtime(
  onEvent: (event: RealtimeEvent) => void,
  threadId?: string
): () => void {
  const params = new URLSearchParams();
  if (threadId) {
    params.set("threadId", threadId);
  }
  if (authToken) {
    params.set("token", authToken);
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  const socket = new WebSocket(`${getRealtimeBaseUrl()}/v1/realtime/ws${query}`);

  socket.onmessage = (event) => {
    if (!event?.data) return;
    try {
      const parsed = JSON.parse(String(event.data)) as RealtimeEvent;
      onEvent(parsed);
    } catch {
      // Ignore malformed event payloads.
    }
  };

  return () => {
    socket.onmessage = null;
    socket.close();
  };
}
