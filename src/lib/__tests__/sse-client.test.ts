import type { AppStateStatus, NativeEventSubscription } from "react-native";
import type { EventSourceEvent, EventSourceOptions } from "react-native-sse";

import { SSEClient } from "../sse-client";

type TestEventName = "delta";

class MockEventSource {
  readonly url: string;
  readonly options: EventSourceOptions;
  closed = false;
  private readonly listeners = new Map<string, ((event: unknown) => void)[]>();

  constructor(url: string, options: EventSourceOptions) {
    this.url = url;
    this.options = options;
  }

  addEventListener(type: string, listener: (event: unknown) => void) {
    const list = this.listeners.get(type) || [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  removeAllEventListeners(type?: string) {
    if (!type) {
      this.listeners.clear();
      return;
    }
    this.listeners.delete(type);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, event: unknown) {
    for (const listener of this.listeners.get(type) || []) {
      listener(event);
    }
  }
}

class MockAppState {
  currentState: AppStateStatus = "active";
  private listener: ((state: AppStateStatus) => void) | null = null;

  addEventListener = (_type: "change", listener: (state: AppStateStatus) => void) => {
    this.listener = listener;
    return {
      remove: () => {
        if (this.listener === listener) {
          this.listener = null;
        }
      },
    } as NativeEventSubscription;
  };

  emit(nextState: AppStateStatus) {
    this.currentState = nextState;
    this.listener?.(nextState);
  }
}

function createHarness(overrides?: Partial<ConstructorParameters<typeof SSEClient<TestEventName>>[0]>) {
  const appState = new MockAppState();
  const sources: MockEventSource[] = [];
  const client = new SSEClient<TestEventName>({
    url: "https://example.com/sse",
    method: "POST",
    headers: {
      Authorization: "Bearer token",
    },
    body: JSON.stringify({ stream: true }),
    pauseWhenBackground: true,
    connectTimeoutMs: 2000,
    idleTimeoutMs: 10_000,
    reconnect: {
      enabled: true,
      initialDelayMs: 100,
      maxDelayMs: 400,
      multiplier: 2,
      jitterRatio: 0,
      maxAttempts: Number.POSITIVE_INFINITY,
    },
    appState: {
      get currentState() {
        return appState.currentState;
      },
      addEventListener: appState.addEventListener,
    },
    eventSourceFactory: (url, options) => {
      const source = new MockEventSource(url, options);
      sources.push(source);
      return source;
    },
    ...overrides,
  });
  return { client, appState, sources };
}

describe("SSEClient", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("reconnects with backoff and forwards Last-Event-ID", () => {
    const onError = jest.fn();
    const { client, sources } = createHarness({ onError });

    client.start();
    expect(sources).toHaveLength(1);

    sources[0].emit("open", { type: "open" } satisfies EventSourceEvent<"open">);
    sources[0].emit(
      "message",
      {
        type: "message",
        data: "{\"delta\":\"ok\"}",
        lastEventId: "evt_1",
        url: "https://example.com/sse",
      } satisfies EventSourceEvent<"message">
    );
    sources[0].emit(
      "error",
      {
        type: "error",
        message: "upstream reset",
        xhrStatus: 500,
        xhrState: 4,
      } satisfies EventSourceEvent<"error">
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "source-error",
      })
    );
    expect(sources[0].closed).toBe(true);

    jest.advanceTimersByTime(99);
    expect(sources).toHaveLength(1);
    jest.advanceTimersByTime(1);
    expect(sources).toHaveLength(2);
    expect(sources[1].options.headers).toMatchObject({
      Authorization: "Bearer token",
      "Last-Event-ID": "evt_1",
    });
  });

  it("pauses on background and reconnects once on foreground", () => {
    const { client, appState, sources } = createHarness();

    client.start();
    expect(client.getState()).toBe("connecting");
    expect(sources).toHaveLength(1);

    appState.emit("background");
    expect(client.getState()).toBe("paused");
    expect(sources[0].closed).toBe(true);

    jest.advanceTimersByTime(1000);
    expect(sources).toHaveLength(1);

    appState.emit("active");
    appState.emit("active");
    expect(sources).toHaveLength(2);
    expect(client.getState()).toBe("connecting");
  });

  it("reconnects when idle timeout is reached and resets timeout on events", () => {
    const onError = jest.fn();
    const { client, sources } = createHarness({
      onError,
      idleTimeoutMs: 1000,
      customEvents: ["delta"],
      reconnect: {
        enabled: true,
        initialDelayMs: 50,
        maxDelayMs: 50,
        multiplier: 2,
        jitterRatio: 0,
        maxAttempts: Number.POSITIVE_INFINITY,
      },
    });

    client.start();
    sources[0].emit("open", { type: "open" } satisfies EventSourceEvent<"open">);

    jest.advanceTimersByTime(900);
    sources[0].emit(
      "delta",
      {
        type: "delta",
        data: "{\"v\":1}",
        lastEventId: "evt_custom_1",
        url: "https://example.com/sse",
      } satisfies EventSourceEvent<"delta", "delta">
    );
    jest.advanceTimersByTime(900);
    expect(sources).toHaveLength(1);

    jest.advanceTimersByTime(100);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "idle-timeout",
      })
    );
    jest.advanceTimersByTime(50);
    expect(sources).toHaveLength(2);
  });

  it("stops reconnecting after maxAttempts boundary", () => {
    const { client, sources } = createHarness({
      reconnect: {
        enabled: true,
        initialDelayMs: 20,
        maxDelayMs: 20,
        multiplier: 2,
        jitterRatio: 0,
        maxAttempts: 1,
      },
    });

    client.start();
    sources[0].emit(
      "error",
      {
        type: "error",
        message: "first fail",
        xhrStatus: 500,
        xhrState: 4,
      } satisfies EventSourceEvent<"error">
    );
    jest.advanceTimersByTime(20);
    expect(sources).toHaveLength(2);

    sources[1].emit(
      "error",
      {
        type: "error",
        message: "second fail",
        xhrStatus: 500,
        xhrState: 4,
      } satisfies EventSourceEvent<"error">
    );
    jest.advanceTimersByTime(200);

    expect(sources).toHaveLength(2);
    expect(client.getState()).toBe("stopped");
  });
});
