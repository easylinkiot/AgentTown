import { listV2ChatSessions, type V2ChatSession } from "@/src/lib/api";

let cachedSessions: V2ChatSession[] = [];
let inflight: Promise<V2ChatSession[]> | null = null;
let hydrated = false;
const listeners = new Set<(sessions: V2ChatSession[]) => void>();

function emitSessionsChanged() {
  const snapshot = [...cachedSessions];
  listeners.forEach((listener) => {
    listener(snapshot);
  });
}

export function getCachedAgentSessions(): V2ChatSession[] {
  return [...cachedSessions];
}

export async function preloadAgentSessions(force = false): Promise<V2ChatSession[]> {
  if (!force && hydrated) {
    return [...cachedSessions];
  }
  if (!force && inflight) {
    return inflight;
  }
  inflight = listV2ChatSessions({ limit: 50 })
    .then((rows) => {
      cachedSessions = Array.isArray(rows) ? rows : [];
      hydrated = true;
      emitSessionsChanged();
      return [...cachedSessions];
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function replaceCachedAgentSessions(rows: V2ChatSession[]) {
  cachedSessions = Array.isArray(rows) ? [...rows] : [];
  hydrated = true;
  emitSessionsChanged();
}

export function subscribeAgentSessions(listener: (sessions: V2ChatSession[]) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
