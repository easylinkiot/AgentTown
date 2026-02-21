import {
  Agent,
  AppBootstrapState,
  AuthUser,
  BotConfig,
  ChatThread,
  ConversationMessage,
  CustomSkill,
  Friend,
  FriendRequest,
  MiniApp,
  MiniAppTemplate,
  RealtimeEvent,
  SkillCatalogItem,
  TaskItem,
  ThreadMember,
  ThreadMemberType,
} from "@/src/types";

// --- AgentTown API (ebike project) DTOs ---
export type ATTargetType = "self" | "user" | "group" | "user_bot";

export interface ATSession {
  id: string;
  session_type: string;
  target_type: ATTargetType;
  target_id: string;
  bot_owner_user_id?: string;
  title?: string;
  last_message_at?: string;
  message_count?: number;
  last_message_preview?: string;
}

export interface ATMessage {
  id: string;
  session_id: string;
  target_type: ATTargetType;
  target_id: string;
  seq_no: number;
  role: "user" | "assistant" | "tool" | string;
  message_type?: string;
  content: string;
  reply_to_message_id?: string;
  tool_name?: string;
  tool_input?: string;
  tool_output?: string;
  created_at?: string;
}

export interface ATChatCompletionsRequest {
  stream: true;
  input: string;
  prompt?: string;
  session_id?: string;
  target_type: ATTargetType;
  target_id?: string;
  bot_owner_user_id?: string;
  skill_ids?: string[];
}

export interface ATChatAssistRequest {
  stream: true;
  action: "auto_reply" | "add_task" | "ask_anything" | string;
  target_type: ATTargetType;
  target_id: string;
  selected_message_id?: string;
  selected_message_content?: string;
  session_id?: string;
}

export interface ATTaskPayload {
  target_type: ATTargetType;
  target_id: string;
  title: string;
  description?: string;
  status?: "todo" | "doing" | "done" | "cancelled";
  due_at?: string;
  reminder_at?: string;
  recurrence_rule?: string;
  priority?: "low" | "medium" | "high";
}

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
  userId: string;
  name?: string;
  avatar?: string;
  kind?: "human" | "bot";
  role?: string;
  company?: string;
  threadId?: string;
}

export interface CreateFriendResponse {
  mode: "friend" | "request";
  friend?: Friend;
  request?: FriendRequest;
}

export interface CreateFriendQRResponse {
  token: string;
  expiresAt: string;
}

export interface ScanFriendQRInput {
  token: string;
}

export interface DiscoverUser {
  id: string;
  displayName: string;
  email?: string;
  provider: string;
  role: "admin" | "member" | "guest";
  avatar: string;
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
const AT_PREFIX = "/api/v1/agent-town";

type ApiErrorBody = {
  error?: {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    requestId?: unknown;
  };
  code?: unknown;
  message?: unknown;
  details?: unknown;
  requestId?: unknown;
};

export class ApiError extends Error {
  status: number;
  method: string;
  path: string;
  baseUrl: string;
  code?: string;
  details?: unknown;
  requestId?: string;
  retryAfterSeconds?: number;

  constructor(params: {
    status: number;
    method: string;
    path: string;
    baseUrl: string;
    message: string;
    code?: string;
    details?: unknown;
    requestId?: string;
    retryAfterSeconds?: number;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.status = params.status;
    this.method = params.method;
    this.path = params.path;
    this.baseUrl = params.baseUrl;
    this.code = params.code;
    this.details = params.details;
    this.requestId = params.requestId;
    this.retryAfterSeconds = params.retryAfterSeconds;
  }
}

function parseApiErrorBody(rawText: string) {
  if (!rawText) return null;
  try {
    return JSON.parse(rawText) as ApiErrorBody;
  } catch {
    return null;
  }
}

function coerceString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function parseRetryAfterSeconds(headerValue: string | null) {
  if (!headerValue) return undefined;
  const raw = headerValue.trim();
  if (!raw) return undefined;

  const asInt = Number.parseInt(raw, 10);
  if (Number.isFinite(asInt) && asInt >= 0) return asInt;

  const at = Date.parse(raw);
  if (!Number.isFinite(at)) return undefined;
  const seconds = Math.ceil((at - Date.now()) / 1000);
  return seconds > 0 ? seconds : 0;
}

function sanitizeRawErrorText(rawText: string) {
  const text = rawText.trim();
  if (!text) return undefined;
  if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
    return "Server error response";
  }
  return text.length > 280 ? `${text.slice(0, 280)}...` : text;
}

export function formatApiError(error: unknown) {
  if (error instanceof ApiError) {
    const parts: string[] = [];
    const code = error.code || `HTTP_${error.status}`;
    parts.push(`[${code}] ${error.message}`);
    if (error.status === 429) {
      if (typeof error.retryAfterSeconds === "number" && Number.isFinite(error.retryAfterSeconds)) {
        parts.push(`Rate limited. Retry after ${error.retryAfterSeconds}s.`);
      } else {
        parts.push("Rate limited. Please retry later.");
      }
    } else if (error.status >= 500) {
      parts.push("Server error. Please retry later.");
    } else if (error.status >= 400) {
      parts.push("Request failed. Please check your input or permissions.");
    }
    if (error.requestId) {
      parts.push(`Request ID: ${error.requestId}`);
    }
    return parts.join(" ");
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

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
    const base = getApiBaseUrl();
    const method = init?.method || "GET";
    const parsed = parseApiErrorBody(text);
    const bodyError = parsed?.error;
    const code = coerceString(bodyError?.code) || coerceString(parsed?.code);
    const canonicalMessage =
      coerceString(bodyError?.message) ||
      coerceString(parsed?.message) ||
      sanitizeRawErrorText(text) ||
      "API request failed";
    const requestId =
      coerceString(bodyError?.requestId) ||
      coerceString(parsed?.requestId) ||
      coerceString(response.headers.get("x-request-id")) ||
      coerceString(response.headers.get("x-correlation-id"));
    const retryAfterSeconds = parseRetryAfterSeconds(response.headers.get("retry-after"));
    const details = bodyError?.details ?? parsed?.details;

    throw new ApiError({
      status: response.status,
      method,
      path,
      baseUrl: base,
      code,
      details,
      requestId,
      retryAfterSeconds,
      message: canonicalMessage,
    });
  }

  if (response.status === 204) {
    return {} as T;
  }

  if (options?.rawText) {
    return (await response.text()) as unknown as T;
  }

  return (await response.json()) as T;
}

// ---------- AgentTown (ebike) SSE helper ----------
type SSEHandler = (event: string, data: any) => void;

async function sseRequest(path: string, body: any, onEvent: SSEHandler, abort?: AbortSignal) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const resp = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: abort,
  });
  if (!resp.ok || !resp.body) {
    const text = await resp.text();
    throw new ApiError({
      status: resp.status,
      method: "POST",
      path,
      baseUrl: getApiBaseUrl(),
      message: sanitizeRawErrorText(text) || "SSE request failed",
      code: undefined,
      details: text,
      requestId: coerceString(resp.headers.get("x-request-id")) || undefined,
    });
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const chunk = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 2);
      if (!chunk) continue;
      const lines = chunk.split("\n");
      let event = "message";
      let data = "";
      for (const line of lines) {
        if (line.startsWith("event:")) {
          event = line.slice(6).trim() || "message";
        } else if (line.startsWith("data:")) {
          data += line.slice(5).trim();
        }
      }
      if (!data) continue;
      try {
        onEvent(event, JSON.parse(data));
      } catch {
        onEvent(event, data);
      }
    }
  }
}

// ---------- AgentTown (ebike) API ----------
export async function atListSessions(params?: { target_type?: ATTargetType; target_id?: string; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.target_type) qs.set("target_type", params.target_type);
  if (params?.target_id) qs.set("target_id", params.target_id);
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<ATSession[]>(`${AT_PREFIX}/chat/sessions${query}`);
}

export async function atListSessionMessages(
  sessionId: string,
  opts?: {
    role?: string;
    message_type?: string;
    include_tool?: boolean;
    before_seq_no?: number;
    after_seq_no?: number;
    limit?: number;
  }
) {
  const qs = new URLSearchParams();
  if (opts?.role) qs.set("role", opts.role);
  if (opts?.message_type) qs.set("message_type", opts.message_type);
  if (opts?.include_tool) qs.set("include_tool", "true");
  if (opts?.before_seq_no) qs.set("before_seq_no", String(opts.before_seq_no));
  if (opts?.after_seq_no) qs.set("after_seq_no", String(opts.after_seq_no));
  if (opts?.limit) qs.set("limit", String(opts.limit));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<ATMessage[]>(`${AT_PREFIX}/chat/sessions/${encodeURIComponent(sessionId)}/messages${query}`);
}

export async function atChatCompletionsStream(
  payload: ATChatCompletionsRequest,
  onEvent: SSEHandler,
  abort?: AbortSignal
) {
  return sseRequest(`${AT_PREFIX}/chat/completions`, payload, onEvent, abort);
}

export async function atChatAssistStream(payload: ATChatAssistRequest, onEvent: SSEHandler, abort?: AbortSignal) {
  return sseRequest(`${AT_PREFIX}/chat/assist`, payload, onEvent, abort);
}

export async function atCreateTask(payload: ATTaskPayload) {
  return apiFetch<{ id: string }>(`${AT_PREFIX}/tasks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function atListTasks(params?: { status?: string; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<any[]>(`${AT_PREFIX}/tasks${query}`);
}

export async function atUpdateTask(taskId: string, payload: Partial<ATTaskPayload>) {
  return apiFetch<{ ok: boolean }>(`${AT_PREFIX}/tasks/${encodeURIComponent(taskId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function atDeleteTask(taskId: string) {
  return apiFetch<{ ok: boolean }>(`${AT_PREFIX}/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" });
}

export async function atGetBotSettings() {
  return apiFetch<{ bot_enabled: boolean; visibility: string; bot_prompt: string }>(`${AT_PREFIX}/bot/settings`);
}

export async function atUpdateBotSettings(payload: { bot_enabled?: boolean; visibility?: string; bot_prompt?: string }) {
  return apiFetch<{ ok: boolean }>(`${AT_PREFIX}/bot/settings`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function atListMiniApps() {
  return apiFetch<any[]>(`${AT_PREFIX}/mini-apps`);
}

export async function atMiniAppChatStream(
  appId: string,
  payload: { stream: true; session_id?: string; input: string; prompt?: string },
  onEvent: SSEHandler,
  abort?: AbortSignal
) {
  return sseRequest(`${AT_PREFIX}/mini-apps/${encodeURIComponent(appId)}/chat/completions`, payload, onEvent, abort);
}

// ---------- Mapping helpers ----------
export function mapATSessionToThread(item: ATSession): ChatThread {
  return {
    id: item.id,
    name: item.title || item.id,
    avatar: "", // server未提供，前端可后续填充
    message: item.last_message_preview || "",
    time: item.last_message_at || "",
    unreadCount: 0,
    isGroup: item.target_type === "group",
    memberCount: item.message_count ? Number(item.message_count) : undefined,
    tag: item.session_type,
    groupType: item.target_type === "group" ? "toc" : undefined,
  };
}

export function mapATMessageToConversation(msg: ATMessage, currentUserId?: string): ConversationMessage {
  const isMe = currentUserId ? msg.role === "user" && msg.target_id === currentUserId : msg.role === "user";
  return {
    id: msg.id || String(msg.seq_no),
    threadId: msg.session_id,
    senderId: msg.role === "user" ? msg.target_id : undefined,
    senderName: msg.role === "user" ? "Me" : "Assistant",
    senderAvatar: "",
    senderType: msg.role === "assistant" ? "bot" : "human",
    content: msg.content || "",
    type: msg.message_type || "text",
    isMe,
    time: msg.created_at,
    replyContext: undefined,
    voiceDuration: undefined,
  };
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

export async function authUpdateProfile(payload: { displayName: string; email: string }) {
  return apiFetch<AuthSessionPayload>("/v1/auth/me/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
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

export async function deleteChatThread(threadId: string) {
  return apiFetch<{ ok: boolean; id: string }>(`/v1/chat/threads/${encodeURIComponent(threadId)}`, {
    method: "DELETE",
  });
}

export async function listThreadMessages(
  threadId: string,
  options?: { limit?: number; before?: string }
) {
  const params = new URLSearchParams();
  if (options?.limit && options.limit > 0) params.set("limit", String(options.limit));
  if (options?.before) params.set("before", options.before);
  const qs = params.toString();
  return apiFetch<ConversationMessage[]>(
    `/v1/chat/threads/${encodeURIComponent(threadId)}/messages${qs ? `?${qs}` : ""}`
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
  return apiFetch<CreateFriendResponse>("/v1/friends", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listFriendRequests() {
  return apiFetch<FriendRequest[]>("/v1/friend-requests");
}

export async function acceptFriendRequest(requestId: string) {
  return apiFetch<{ ok: boolean; request: FriendRequest }>(
    `/v1/friend-requests/${encodeURIComponent(requestId)}/accept`,
    { method: "POST" }
  );
}

export async function rejectFriendRequest(requestId: string) {
  return apiFetch<{ ok: boolean; request: FriendRequest }>(
    `/v1/friend-requests/${encodeURIComponent(requestId)}/reject`,
    { method: "POST" }
  );
}

export async function createFriendQR() {
  return apiFetch<CreateFriendQRResponse>("/v1/friend-qr/create", {
    method: "POST",
  });
}

export async function scanFriendQR(payload: ScanFriendQRInput) {
  return apiFetch<CreateFriendResponse>("/v1/friend-qr/scan", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function discoverUsers(query?: string) {
  const params = new URLSearchParams();
  if (query?.trim()) params.set("q", query.trim());
  const qs = params.toString();
  return apiFetch<DiscoverUser[]>(`/v1/users/discover${qs ? `?${qs}` : ""}`);
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
