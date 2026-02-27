import { Platform } from "react-native";
import type { EventSourceEvent } from "react-native-sse";

import { getAuthToken } from "@/src/lib/api";
import { SSEClient } from "@/src/lib/sse-client";

const DEFAULT_API_BASE_URL = "https://agenttown-api.kittens.cloud";
const ASK_ANYTHING_STREAM_CANDIDATE_ID = "__assist_ask_anything_stream__";
const ASSIST_DEBUG_PREFIX = "[chatAssist]";
const AGENTTOWN_FALLBACK_PREFIX = "[agenttown-fallback]";

export type ChatAssistAction = "auto_reply" | "add_task" | "ask_anything";

export interface ChatAssistRequest {
  action: ChatAssistAction;
  input?: string;
  question?: string;
  target_type?: string;
  target_id?: string;
  selected_message_id?: string;
  selected_message_content?: string;
  session_id?: string;
}

export interface ChatCompletionsRequest {
  stream?: boolean;
  input?: string;
  prompt?: string;
  session_id?: string;
  target_type?: string;
  target_id?: string;
  bot_owner_user_id?: string;
  skill_ids?: string[];
}

export interface AssistCandidate {
  id?: string;
  kind: "reply" | "task" | "text";
  text: string;
  title?: string;
  description?: string;
  priority?: string;
}

interface ChatAssistPayloadEnvelope {
  assist_candidates?: {
    reply_candidates?: unknown;
    task_candidates?: unknown;
  };
  reply_candidates?: unknown;
  task_candidates?: unknown;
  reply_candidate?: unknown;
  task_candidate?: unknown;
  delta?: {
    text?: unknown;
  };
  text?: unknown;
  message?: unknown;
}

interface RunChatAssistHandlers {
  onCandidates?: (candidates: AssistCandidate[]) => void;
  onEvent?: (eventName: string, payload: unknown) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

interface RunChatCompletionsHandlers {
  onText?: (text: string) => void;
  onEvent?: (eventName: string, payload: unknown) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

type ChatAssistSSEEventName =
  | "message"
  | "assist_candidates"
  | "message_delta"
  | "trace"
  | "message_start"
  | "message_end"
  | "done"
  | "ping"
  | "error"
  | "response.output_text.delta"
  | "response.output_text.done"
  | "response.completed"
  | "response.error"
  | "delta"
  | "output_text.delta"
  | "output_text.done";

const CHAT_ASSIST_CUSTOM_EVENTS: ChatAssistSSEEventName[] = [
  "assist_candidates",
  "message_delta",
  "trace",
  "message_start",
  "message_end",
  "done",
  "ping",
  "error",
  "response.output_text.delta",
  "response.output_text.done",
  "response.completed",
  "response.error",
  "delta",
  "output_text.delta",
  "output_text.done",
];

function getApiBaseUrl() {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
  const trimmed = raw.replace(/\/+$/, "");
  if (Platform.OS !== "android") return trimmed;
  return trimmed
    .replace(/^http:\/\/localhost(?=[:/]|$)/i, "http://10.0.2.2")
    .replace(/^http:\/\/127\.0\.0\.1(?=[:/]|$)/i, "http://10.0.2.2");
}

function toText(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed;
}

function toRawText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isDebugEnabled() {
  return typeof __DEV__ !== "undefined" && __DEV__;
}

function debugLog(stage: string, payload?: unknown) {
  if (!isDebugEnabled()) return;
  if (payload === undefined) {
    console.log(`${ASSIST_DEBUG_PREFIX} ${stage}`);
    return;
  }
  console.log(`${ASSIST_DEBUG_PREFIX} ${stage}`, payload);
}

function parseEventData(data: string | null | undefined) {
  if (typeof data !== "string") return null;
  const text = data.trim();
  if (!text || text === "[DONE]") return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function normalizeReplyCandidate(candidate: unknown, index: number): AssistCandidate | null {
  if (!candidate || typeof candidate !== "object") return null;
  const row = candidate as { id?: unknown; text?: unknown };
  const text = toText(row.text);
  if (!text) return null;
  const id = toText(row.id) || `reply_${index}`;
  return {
    id,
    kind: "reply",
    text,
  };
}

function normalizeTaskCandidate(candidate: unknown, index: number): AssistCandidate | null {
  if (!candidate || typeof candidate !== "object") return null;
  const row = candidate as {
    id?: unknown;
    title?: unknown;
    description?: unknown;
    priority?: unknown;
  };
  const title = toText(row.title);
  const description = toText(row.description);
  const priority = toText(row.priority);
  const combined = [title, description].filter(Boolean).join("\n");
  if (!combined) return null;
  const id = toText(row.id) || `task_${index}`;
  return {
    id,
    kind: "task",
    text: combined,
    title: title || undefined,
    description: description || undefined,
    priority: priority || undefined,
  };
}

function normalizeCandidatesFromArray(raw: unknown, kind: "reply" | "task") {
  if (!Array.isArray(raw)) return [] as AssistCandidate[];
  if (kind === "reply") {
    return raw
      .map((item, index) => normalizeReplyCandidate(item, index))
      .filter((item): item is AssistCandidate => Boolean(item));
  }
  return raw
    .map((item, index) => normalizeTaskCandidate(item, index))
    .filter((item): item is AssistCandidate => Boolean(item));
}

function extractPayloadEnvelope(payload: unknown) {
  if (!payload || typeof payload !== "object") return {} as ChatAssistPayloadEnvelope;
  return payload as ChatAssistPayloadEnvelope;
}

function extractTextDelta(eventName: string, payload: unknown) {
  if (typeof payload === "string") {
    if (eventName === "message" || eventName.includes("delta")) return payload;
    return "";
  }
  const envelope = extractPayloadEnvelope(payload);
  const deltaText = toRawText(envelope.delta?.text);
  if (deltaText !== "") return deltaText;
  const deltaRaw = toRawText((envelope as { delta?: unknown }).delta);
  if (deltaRaw !== "") return deltaRaw;
  if (eventName === "message" || eventName === "delta" || eventName.includes("delta")) {
    const text = toRawText(envelope.text);
    if (text !== "") return text;
    const messageText = toRawText(envelope.message);
    if (messageText !== "") return messageText;
    const outputText = toRawText((envelope as { output_text?: unknown }).output_text);
    if (outputText !== "") return outputText;
  }
  return "";
}

function sanitizeAskAnythingText(input: string) {
  const text = input.trim();
  if (!text.startsWith(AGENTTOWN_FALLBACK_PREFIX)) return input;

  const questionMatch = text.match(/UserQuestion:\s*([^\n]+)/i);
  const question = (questionMatch?.[1] || "").trim();
  const useZh = /[\u3400-\u9FFF]/.test(`${text}${question}`);
  const suffix = question
    ? useZh
      ? `（问题：${question}）`
      : ` (Question: ${question})`
    : "";
  return useZh
    ? `当前后端未返回真实模型答案，正在使用回退输出。请检查 agenttown-api 的模型配置${suffix}`
    : `The backend did not return a real model answer. Showing fallback output. Please check the agenttown-api model configuration${suffix}`;
}

function toEventError(payload: unknown, fallback = "Assist stream error") {
  if (payload && typeof payload === "object") {
    const row = payload as { message?: unknown; error?: { message?: unknown } };
    const message = toText(row.message) || toText(row.error?.message);
    if (message) return new Error(message);
  }
  if (typeof payload === "string" && payload.trim()) return new Error(payload.trim());
  return new Error(fallback);
}

export function mergeAssistCandidates(previous: AssistCandidate[], incoming: AssistCandidate[]) {
  if (incoming.length === 0) return previous;
  const next = [...previous];

  for (const candidate of incoming) {
    const id = toText(candidate.id);
    if (!id) {
      next.push(candidate);
      continue;
    }
    const foundIndex = next.findIndex((item) => toText(item.id) === id);
    if (foundIndex < 0) {
      next.push(candidate);
      continue;
    }
    next[foundIndex] = {
      ...next[foundIndex],
      ...candidate,
      id,
      text: candidate.text || next[foundIndex].text,
    };
  }
  return next;
}

export function reduceAssistCandidatesFromEvent(
  eventName: string,
  payload: unknown,
  previous: AssistCandidate[]
): AssistCandidate[] {
  const envelope = extractPayloadEnvelope(payload);
  const candidatesNode = envelope.assist_candidates;

  const replyListRaw = candidatesNode?.reply_candidates ?? envelope.reply_candidates;
  const taskListRaw = candidatesNode?.task_candidates ?? envelope.task_candidates;
  const replyList = normalizeCandidatesFromArray(replyListRaw, "reply");
  const taskList = normalizeCandidatesFromArray(taskListRaw, "task");
  const hasReplyList = Array.isArray(replyListRaw);
  const hasTaskList = Array.isArray(taskListRaw);

  if (hasReplyList || hasTaskList) {
    return [...replyList, ...taskList];
  }

  const singleReply = normalizeReplyCandidate(envelope.reply_candidate, previous.length);
  if (singleReply) {
    return mergeAssistCandidates(previous, [singleReply]);
  }

  const singleTask = normalizeTaskCandidate(envelope.task_candidate, previous.length);
  if (singleTask) {
    return mergeAssistCandidates(previous, [singleTask]);
  }

  const hasDeltaText = typeof envelope.delta?.text === "string";
  const isIgnoredNonTextEvent =
    eventName === "trace" ||
    eventName === "ping" ||
    eventName === "done" ||
    eventName === "error" ||
    eventName === "response.error" ||
    eventName === "message_start" ||
    eventName === "message_end" ||
    eventName.startsWith("tool_");
  const looksLikeDeltaEvent =
    eventName === "message_delta" ||
    eventName === "response.output_text.delta" ||
    eventName === "output_text.delta" ||
    eventName === "delta" ||
    eventName.includes(".delta") ||
    eventName.endsWith("_delta");
  const isTextStreamEvent =
    !isIgnoredNonTextEvent &&
    (looksLikeDeltaEvent || eventName === "message" || hasDeltaText);
  if (
    isTextStreamEvent
  ) {
    const deltaText = extractTextDelta(eventName, payload);
    if (!deltaText) return previous;
    const safeText = sanitizeAskAnythingText(deltaText);
    const found = previous.find((item) => item.id === ASK_ANYTHING_STREAM_CANDIDATE_ID);
    if (!found) {
      const streamCandidate: AssistCandidate = {
        id: ASK_ANYTHING_STREAM_CANDIDATE_ID,
        kind: "text",
        text: safeText,
      };
      return [
        ...previous,
        streamCandidate,
      ];
    }
    return mergeAssistCandidates(previous, [
      {
        ...found,
        text: `${found.text}${safeText}`,
      },
    ]);
  }

  return previous;
}

export async function runChatAssist(
  request: ChatAssistRequest,
  handlers: RunChatAssistHandlers = {},
  abortSignal?: AbortSignal
) {
  if (abortSignal?.aborted) return;

  const url = `${getApiBaseUrl()}/v1/chat/assist`;
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const payload = {
    ...request,
    stream: true,
  };

  let candidates: AssistCandidate[] = [];

  await new Promise<void>((resolve, reject) => {
    let finished = false;

    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      abortSignal?.removeEventListener("abort", handleAbort);
      client.stop();
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    const handleAbort = () => {
      finish();
    };

    const handleEvent = (eventName: string, event: EventSourceEvent<string, string>) => {
      const data = parseEventData(event.data);
      handlers.onEvent?.(eventName, data);

      if (eventName === "done") {
        debugLog("done:aggregated-candidates", {
          action: request.action,
          count: candidates.length,
          candidates,
        });
        handlers.onDone?.();
        finish();
        return;
      }
      if (eventName === "error" || eventName === "response.error") {
        const err = toEventError(data);
        handlers.onError?.(err);
        finish(err);
        return;
      }

      const nextCandidates = reduceAssistCandidatesFromEvent(eventName, data, candidates);
      if (nextCandidates !== candidates) {
        candidates = nextCandidates;
        handlers.onCandidates?.(candidates);
      }
    };

    const client = new SSEClient<ChatAssistSSEEventName>({
      url,
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      reconnect: {
        enabled: false,
        initialDelayMs: 0,
        maxDelayMs: 0,
        multiplier: 1,
        jitterRatio: 0,
        maxAttempts: 0,
      },
      pauseWhenBackground: false,
      customEvents: CHAT_ASSIST_CUSTOM_EVENTS,
      onMessage: (event) => {
        handleEvent("message", event as EventSourceEvent<string, string>);
      },
      onCustomEvent: (eventName, event) => {
        handleEvent(eventName, event as EventSourceEvent<string, string>);
      },
      onError: (error) => {
        if (abortSignal?.aborted) {
          finish();
          return;
        }
        const err = new Error(error.message || "Assist stream disconnected");
        handlers.onError?.(err);
        finish(err);
      },
      onClose: () => {
        if (finished) return;
        if (abortSignal?.aborted) {
          finish();
          return;
        }
        handlers.onDone?.();
        finish();
      },
    });

    if (abortSignal) {
      abortSignal.addEventListener("abort", handleAbort, { once: true });
    }

    client.start();
  });
}

export async function runChatCompletions(
  request: ChatCompletionsRequest,
  handlers: RunChatCompletionsHandlers = {},
  abortSignal?: AbortSignal
) {
  if (abortSignal?.aborted) return;

  const url = `${getApiBaseUrl()}/v1/chat/completions`;
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const payload = {
    ...request,
    stream: true,
  };

  let streamText = "";

  await new Promise<void>((resolve, reject) => {
    let finished = false;

    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      abortSignal?.removeEventListener("abort", handleAbort);
      client.stop();
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    const handleAbort = () => {
      finish();
    };

    const handleEvent = (eventName: string, event: EventSourceEvent<string, string>) => {
      const data = parseEventData(event.data);
      handlers.onEvent?.(eventName, data);

      if (eventName === "done") {
        handlers.onDone?.();
        finish();
        return;
      }
      if (eventName === "error" || eventName === "response.error") {
        const err = toEventError(data, "Chat completions stream error");
        handlers.onError?.(err);
        finish(err);
        return;
      }

      const delta = extractTextDelta(eventName, data);
      if (!delta) return;
      streamText = `${streamText}${delta}`;
      handlers.onText?.(streamText);
    };

    const client = new SSEClient<ChatAssistSSEEventName>({
      url,
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      reconnect: {
        enabled: false,
        initialDelayMs: 0,
        maxDelayMs: 0,
        multiplier: 1,
        jitterRatio: 0,
        maxAttempts: 0,
      },
      pauseWhenBackground: false,
      customEvents: CHAT_ASSIST_CUSTOM_EVENTS,
      onMessage: (event) => {
        handleEvent("message", event as EventSourceEvent<string, string>);
      },
      onCustomEvent: (eventName, event) => {
        handleEvent(eventName, event as EventSourceEvent<string, string>);
      },
      onError: (error) => {
        if (abortSignal?.aborted) {
          finish();
          return;
        }
        const err = new Error(error.message || "Completions stream disconnected");
        handlers.onError?.(err);
        finish(err);
      },
      onClose: () => {
        if (finished) return;
        if (abortSignal?.aborted) {
          finish();
          return;
        }
        handlers.onDone?.();
        finish();
      },
    });

    if (abortSignal) {
      abortSignal.addEventListener("abort", handleAbort, { once: true });
    }

    client.start();
  });
}
