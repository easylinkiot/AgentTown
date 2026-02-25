import { AppState } from "react-native";
import type { AppStateStatus, NativeEventSubscription } from "react-native";
import EventSource from "react-native-sse";
import type { EventSourceEvent, EventSourceOptions } from "react-native-sse";

type TimerHandle = ReturnType<typeof setTimeout>;
type SSEDisconnectReason =
  | "manual"
  | "error"
  | "close"
  | "connect-timeout"
  | "idle-timeout"
  | "app-background";

export type SSEClientState = "stopped" | "paused" | "connecting" | "reconnecting" | "open";

export interface SSEClientReconnectOptions {
  enabled?: boolean;
  initialDelayMs?: number;
  maxDelayMs?: number;
  multiplier?: number;
  jitterRatio?: number;
  maxAttempts?: number;
}

export interface SSEClientError {
  type: "source-error" | "connect-timeout" | "idle-timeout";
  reason: SSEDisconnectReason;
  message: string;
  event?: EventSourceEvent<"error">;
}

type ReactNativeAppStateLike = Pick<typeof AppState, "currentState" | "addEventListener">;

interface EventSourceLike<CustomEvent extends string> {
  addEventListener: (type: "open" | "message" | "error" | "close" | CustomEvent, listener: (event: unknown) => void) => void;
  removeAllEventListeners: (type?: "open" | "message" | "error" | "close" | CustomEvent) => void;
  close: () => void;
}

export interface SSEClientOptions<CustomEvent extends string = never> {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  withCredentials?: boolean;
  connectTimeoutMs?: number;
  idleTimeoutMs?: number;
  reconnect?: SSEClientReconnectOptions;
  customEvents?: CustomEvent[];
  pauseWhenBackground?: boolean;
  debug?: boolean;
  lineEndingCharacter?: string;
  initialLastEventId?: string | null;
  onOpen?: (event: EventSourceEvent<"open">) => void;
  onMessage?: (event: EventSourceEvent<"message">) => void;
  onCustomEvent?: (eventName: CustomEvent, event: EventSourceEvent<CustomEvent, CustomEvent>) => void;
  onError?: (error: SSEClientError) => void;
  onClose?: (event: EventSourceEvent<"close">) => void;
  onStateChange?: (state: SSEClientState) => void;
  onLastEventIdChange?: (id: string | null) => void;
  appState?: ReactNativeAppStateLike;
  eventSourceFactory?: (
    url: string,
    options: EventSourceOptions
  ) => EventSourceLike<CustomEvent>;
  random?: () => number;
}

const DEFAULT_RECONNECT: Required<SSEClientReconnectOptions> = {
  enabled: true,
  initialDelayMs: 600,
  maxDelayMs: 20_000,
  multiplier: 2,
  jitterRatio: 0.2,
  maxAttempts: Number.POSITIVE_INFINITY,
};

const DEFAULT_CONNECT_TIMEOUT_MS = 15_000;
const DEFAULT_IDLE_TIMEOUT_MS = 90_000;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeReconnectOptions(
  input?: SSEClientReconnectOptions
): Required<SSEClientReconnectOptions> {
  return {
    enabled: input?.enabled ?? DEFAULT_RECONNECT.enabled,
    initialDelayMs: Math.max(0, input?.initialDelayMs ?? DEFAULT_RECONNECT.initialDelayMs),
    maxDelayMs: Math.max(0, input?.maxDelayMs ?? DEFAULT_RECONNECT.maxDelayMs),
    multiplier: Math.max(1, input?.multiplier ?? DEFAULT_RECONNECT.multiplier),
    jitterRatio: clamp(input?.jitterRatio ?? DEFAULT_RECONNECT.jitterRatio, 0, 1),
    maxAttempts:
      input?.maxAttempts === undefined
        ? DEFAULT_RECONNECT.maxAttempts
        : Math.max(0, input.maxAttempts),
  };
}

function nextDelayMs(
  attempt: number,
  reconnect: Required<SSEClientReconnectOptions>,
  random: () => number
) {
  const base = reconnect.initialDelayMs * reconnect.multiplier ** Math.max(0, attempt - 1);
  const capped = Math.min(reconnect.maxDelayMs, base);
  if (reconnect.jitterRatio <= 0) return capped;
  const jitter = (random() * 2 - 1) * reconnect.jitterRatio;
  return Math.max(0, Math.round(capped * (1 + jitter)));
}

function normalizeLastEventId(id: string | null | undefined) {
  if (!id) return null;
  const value = id.trim();
  return value === "" ? null : value;
}

function readLastEventId(event: unknown): string | null {
  if (!event || typeof event !== "object") return null;
  const value = (event as { lastEventId?: unknown }).lastEventId;
  if (typeof value !== "string") return null;
  return normalizeLastEventId(value);
}

function toErrorMessage(event: EventSourceEvent<"error">) {
  if ("message" in event && typeof event.message === "string" && event.message.trim()) {
    return event.message;
  }
  if (event.type === "timeout") return "SSE source timeout";
  return "SSE source error";
}

export class SSEClient<CustomEvent extends string = never> {
  private readonly options: SSEClientOptions<CustomEvent>;
  private readonly appState: ReactNativeAppStateLike;
  private readonly reconnect: Required<SSEClientReconnectOptions>;
  private readonly random: () => number;
  private readonly eventSourceFactory: (
    url: string,
    options: EventSourceOptions
  ) => EventSourceLike<CustomEvent>;

  private source: EventSourceLike<CustomEvent> | null = null;
  private appStateSub: NativeEventSubscription | null = null;
  private reconnectTimer: TimerHandle | null = null;
  private connectTimeoutTimer: TimerHandle | null = null;
  private idleTimer: TimerHandle | null = null;

  private started = false;
  private connectSeq = 0;
  private reconnectAttempts = 0;
  private state: SSEClientState = "stopped";
  private currentAppState: AppStateStatus;
  private lastEventId: string | null;

  constructor(options: SSEClientOptions<CustomEvent>) {
    this.options = options;
    this.appState = options.appState ?? AppState;
    this.reconnect = normalizeReconnectOptions(options.reconnect);
    this.random = options.random ?? Math.random;
    this.eventSourceFactory =
      options.eventSourceFactory ??
      ((url, init) => new EventSource<CustomEvent>(url, init));

    this.currentAppState = this.appState.currentState;
    this.lastEventId = normalizeLastEventId(options.initialLastEventId);
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.bindAppState();
    if (!this.canConnectNow()) {
      this.setState("paused");
      return;
    }
    this.open("manual");
  }

  stop() {
    if (!this.started && this.state === "stopped") return;
    this.started = false;
    this.unbindAppState();
    this.clearTimers();
    this.teardownSource();
    this.reconnectAttempts = 0;
    this.setState("stopped");
  }

  restart() {
    this.stop();
    this.start();
  }

  getState() {
    return this.state;
  }

  getLastEventId() {
    return this.lastEventId;
  }

  setLastEventId(id: string | null) {
    this.updateLastEventId(normalizeLastEventId(id));
  }

  private bindAppState() {
    if (!this.options.pauseWhenBackground || this.appStateSub) return;
    this.appStateSub = this.appState.addEventListener("change", (nextState) => {
      const prev = this.currentAppState;
      this.currentAppState = nextState;
      if (!this.started) return;

      const wasActive = prev === "active";
      const isActive = nextState === "active";
      if (wasActive && !isActive) {
        this.handleDisconnect("app-background");
        return;
      }
      if (!wasActive && isActive) {
        this.reconnectAttempts = 0;
        this.open("manual");
      }
    });
  }

  private unbindAppState() {
    this.appStateSub?.remove();
    this.appStateSub = null;
  }

  private canConnectNow() {
    if (!this.options.pauseWhenBackground) return true;
    return this.currentAppState === "active";
  }

  private open(reason: "manual" | "reconnect") {
    if (!this.started || !this.canConnectNow()) {
      this.setState("paused");
      return;
    }

    this.clearReconnectTimer();
    this.clearConnectTimeoutTimer();
    this.clearIdleTimer();
    this.teardownSource();

    const seq = ++this.connectSeq;
    this.setState(reason === "manual" ? "connecting" : "reconnecting");

    const headers: Record<string, string> = { ...(this.options.headers || {}) };
    if (this.lastEventId) {
      headers["Last-Event-ID"] = this.lastEventId;
    }

    const source = this.eventSourceFactory(this.options.url, {
      method: this.options.method || "GET",
      headers,
      body: this.options.body,
      withCredentials: this.options.withCredentials,
      pollingInterval: 0,
      timeout: 0,
      timeoutBeforeConnection: 0,
      debug: this.options.debug,
      lineEndingCharacter: this.options.lineEndingCharacter,
    });
    this.source = source;
    const knownCustomEvents = new Set(this.options.customEvents || []);
    const builtinEvents = new Set(["open", "message", "error", "close"]);
    const sourceWithDispatch = source as unknown as {
      dispatch?: (type: string, event: unknown) => void;
    };
    const originalDispatch = sourceWithDispatch.dispatch;
    if (typeof originalDispatch === "function") {
      sourceWithDispatch.dispatch = (type: string, event: unknown) => {
        originalDispatch.call(source, type, event);
        if (!this.isCurrentSource(seq)) return;
        if (builtinEvents.has(type)) return;
        if (knownCustomEvents.has(type as CustomEvent)) return;
        this.captureLastEventId(event);
        this.touchActivity(seq);
        this.options.onCustomEvent?.(
          type as CustomEvent,
          event as EventSourceEvent<CustomEvent, CustomEvent>
        );
      };
    }

    source.addEventListener("open", (event) => {
      if (!this.isCurrentSource(seq)) return;
      this.reconnectAttempts = 0;
      this.clearConnectTimeoutTimer();
      this.touchActivity(seq);
      this.setState("open");
      this.options.onOpen?.(event as EventSourceEvent<"open">);
    });

    source.addEventListener("message", (event) => {
      if (!this.isCurrentSource(seq)) return;
      this.captureLastEventId(event);
      this.touchActivity(seq);
      this.options.onMessage?.(event as EventSourceEvent<"message">);
    });

    source.addEventListener("error", (event) => {
      if (!this.isCurrentSource(seq)) return;
      const maybeSSEErrorEvent = event as { data?: unknown };
      const hasEventPayload =
        typeof maybeSSEErrorEvent.data === "string" && maybeSSEErrorEvent.data.trim().length > 0;
      if (hasEventPayload && (this.options.customEvents || []).includes("error" as CustomEvent)) {
        this.captureLastEventId(event);
        this.touchActivity(seq);
        this.options.onCustomEvent?.(
          "error" as CustomEvent,
          event as EventSourceEvent<CustomEvent, CustomEvent>
        );
        return;
      }
      this.options.onError?.({
        type: "source-error",
        reason: "error",
        message: toErrorMessage(event as EventSourceEvent<"error">),
        event: event as EventSourceEvent<"error">,
      });
      this.scheduleReconnect(seq, "error");
    });

    source.addEventListener("close", (event) => {
      if (!this.isCurrentSource(seq)) return;
      this.options.onClose?.(event as EventSourceEvent<"close">);
      this.scheduleReconnect(seq, "close");
    });

    for (const eventName of knownCustomEvents) {
      source.addEventListener(eventName, (event) => {
        if (!this.isCurrentSource(seq)) return;
        this.captureLastEventId(event);
        this.touchActivity(seq);
        this.options.onCustomEvent?.(
          eventName,
          event as EventSourceEvent<CustomEvent, CustomEvent>
        );
      });
    }

    this.armConnectTimeout(seq);
  }

  private isCurrentSource(seq: number) {
    return this.started && this.source !== null && this.connectSeq === seq;
  }

  private scheduleReconnect(seq: number, reason: Exclude<SSEDisconnectReason, "manual" | "app-background">) {
    if (!this.isCurrentSource(seq)) return;

    this.clearConnectTimeoutTimer();
    this.clearIdleTimer();
    this.teardownSource();

    if (!this.started) {
      this.setState("stopped");
      return;
    }
    if (!this.canConnectNow()) {
      this.setState("paused");
      return;
    }
    if (!this.reconnect.enabled) {
      this.setState("stopped");
      return;
    }
    if (this.reconnectAttempts >= this.reconnect.maxAttempts) {
      this.setState("stopped");
      return;
    }

    this.reconnectAttempts += 1;
    const delay = nextDelayMs(this.reconnectAttempts, this.reconnect, this.random);
    this.setState("reconnecting");
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.started) return;
      this.open("reconnect");
    }, delay);

    if (reason === "connect-timeout") {
      this.options.onError?.({
        type: "connect-timeout",
        reason,
        message: "SSE connection timed out before opening",
      });
    } else if (reason === "idle-timeout") {
      this.options.onError?.({
        type: "idle-timeout",
        reason,
        message: "SSE connection idle timeout reached",
      });
    }
  }

  private handleDisconnect(reason: SSEDisconnectReason) {
    this.clearTimers();
    this.teardownSource();
    if (!this.started) {
      this.setState("stopped");
      return;
    }
    if (reason === "app-background") {
      this.setState("paused");
      return;
    }
    this.scheduleReconnect(this.connectSeq, "close");
  }

  private armConnectTimeout(seq: number) {
    this.clearConnectTimeoutTimer();
    const timeoutMs = this.options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
    if (timeoutMs <= 0) return;
    this.connectTimeoutTimer = setTimeout(() => {
      if (!this.isCurrentSource(seq)) return;
      this.scheduleReconnect(seq, "connect-timeout");
    }, timeoutMs);
  }

  private touchActivity(seq: number) {
    this.clearIdleTimer();
    const idleMs = this.options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
    if (idleMs <= 0) return;
    this.idleTimer = setTimeout(() => {
      if (!this.isCurrentSource(seq)) return;
      this.scheduleReconnect(seq, "idle-timeout");
    }, idleMs);
  }

  private captureLastEventId(event: unknown) {
    const incomingId = readLastEventId(event);
    if (incomingId === null) return;
    this.updateLastEventId(incomingId);
  }

  private updateLastEventId(next: string | null) {
    if (this.lastEventId === next) return;
    this.lastEventId = next;
    this.options.onLastEventIdChange?.(next);
  }

  private setState(next: SSEClientState) {
    if (this.state === next) return;
    this.state = next;
    this.options.onStateChange?.(next);
  }

  private clearReconnectTimer() {
    if (!this.reconnectTimer) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private clearConnectTimeoutTimer() {
    if (!this.connectTimeoutTimer) return;
    clearTimeout(this.connectTimeoutTimer);
    this.connectTimeoutTimer = null;
  }

  private clearIdleTimer() {
    if (!this.idleTimer) return;
    clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  private clearTimers() {
    this.clearReconnectTimer();
    this.clearConnectTimeoutTimer();
    this.clearIdleTimer();
  }

  private teardownSource() {
    if (!this.source) return;
    this.source.removeAllEventListeners();
    this.source.close();
    this.source = null;
  }
}
