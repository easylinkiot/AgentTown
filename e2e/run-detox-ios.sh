#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

METRO_HOST="${DETOX_METRO_HOST:-127.0.0.1}"
METRO_PORT="${DETOX_METRO_PORT:-8081}"
DETOX_DEV_SERVER_URL="${DETOX_DEV_SERVER_URL:-exp://${METRO_HOST}:${METRO_PORT}}"
DETOX_API_BASE_URL="${DETOX_API_BASE_URL:-https://agenttown-api.kittens.cloud}"

METRO_PID=""

cleanup() {
  if [[ -n "${METRO_PID}" ]]; then
    kill "${METRO_PID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if nc -z "${METRO_HOST}" "${METRO_PORT}" >/dev/null 2>&1; then
  existing_pid="$(lsof -ti tcp:${METRO_PORT} -sTCP:LISTEN || true)"
  if [[ -n "${existing_pid}" ]]; then
    echo "Detox: stopping existing Metro on ${METRO_HOST}:${METRO_PORT} (pid=${existing_pid})"
    kill "${existing_pid}" >/dev/null 2>&1 || true
    sleep 1
  fi
fi

echo "Detox: starting Metro on ${METRO_HOST}:${METRO_PORT} with EXPO_PUBLIC_API_BASE_URL=${DETOX_API_BASE_URL}"
CI=1 EXPO_PUBLIC_API_BASE_URL="${DETOX_API_BASE_URL}" npx expo start --dev-client --clear --port "${METRO_PORT}" >/tmp/agenttown-metro.log 2>&1 &
METRO_PID=$!

for _ in $(seq 1 90); do
  if nc -z "${METRO_HOST}" "${METRO_PORT}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! nc -z "${METRO_HOST}" "${METRO_PORT}" >/dev/null 2>&1; then
  echo "Detox: Metro did not become ready. Check /tmp/agenttown-metro.log"
  exit 1
fi

EXPO_PUBLIC_API_BASE_URL="${DETOX_API_BASE_URL}" DETOX_DEV_SERVER_URL="${DETOX_DEV_SERVER_URL}" npx detox test -c ios.sim.debug --cleanup "$@"
