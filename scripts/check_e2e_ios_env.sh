#!/usr/bin/env bash
set -u

ok=0
warn=0
fail=0

info() { echo "[INFO] $*"; }
pass() { echo "[PASS] $*"; ok=$((ok+1)); }
warnf() { echo "[WARN] $*"; warn=$((warn+1)); }
failf() { echo "[FAIL] $*"; fail=$((fail+1)); }

check_cmd() {
  local name="$1"
  if command -v "$name" >/dev/null 2>&1; then
    pass "$name found: $(command -v "$name")"
    return 0
  fi
  failf "$name not found"
  return 1
}

echo "=== AgentTown iOS E2E Environment Check ==="

check_cmd node
if command -v node >/dev/null 2>&1; then
  info "node version: $(node -v)"
fi

check_cmd npm
if command -v npm >/dev/null 2>&1; then
  info "npm version: $(npm -v)"
fi

if command -v npx >/dev/null 2>&1; then
  pass "npx found"
  if npx detox --version >/dev/null 2>&1; then
    pass "detox available: $(npx detox --version)"
  else
    failf "detox unavailable. Run: npm i -D detox"
  fi
else
  failf "npx not found"
fi

if command -v xcodebuild >/dev/null 2>&1; then
  pass "xcodebuild found"
  info "$(xcodebuild -version | tr '\n' ' | ')"
else
  failf "xcodebuild not found (install Xcode and CLI tools)"
fi

if command -v xcrun >/dev/null 2>&1; then
  pass "xcrun found"
  if xcrun simctl list devices >/dev/null 2>&1; then
    pass "simctl devices available"
  else
    failf "simctl unavailable"
  fi
else
  failf "xcrun not found"
fi

if command -v pod >/dev/null 2>&1; then
  if pod --version >/dev/null 2>&1; then
    pass "cocoapods works: $(pod --version)"
  else
    failf "pod command exists but broken. Fix ruby/cocoapods first"
    info "suggestion: brew reinstall cocoapods && brew link cocoapods"
  fi
else
  failf "pod not found (install CocoaPods)"
fi

if command -v watchman >/dev/null 2>&1; then
  pass "watchman found: $(watchman --version)"
else
  warnf "watchman not found (optional but recommended): brew install watchman"
fi

if [ -f ./ios/Podfile ]; then
  pass "ios/Podfile exists"
else
  failf "ios/Podfile missing"
fi

if [ -f ./.detoxrc.js ]; then
  pass ".detoxrc.js exists"
else
  failf ".detoxrc.js missing"
fi

# System proxy can hijack Detox localhost/127.0.0.1 handshake traffic.
if command -v networksetup >/dev/null 2>&1; then
  wifi_service="$(networksetup -listallnetworkservices 2>/dev/null | sed '1d' | sed 's/^*//' | sed 's/^ //' | rg -n '^Wi-Fi$|^WiFi$' -N -m 1 | sed 's/^[0-9]*://')"
  if [ -n "${wifi_service:-}" ]; then
    web_proxy="$(networksetup -getwebproxy "$wifi_service" 2>/dev/null | tr '\n' ' ')"
    secure_proxy="$(networksetup -getsecurewebproxy "$wifi_service" 2>/dev/null | tr '\n' ' ')"
    socks_proxy="$(networksetup -getsocksfirewallproxy "$wifi_service" 2>/dev/null | tr '\n' ' ')"
    if echo "$web_proxy $secure_proxy $socks_proxy" | rg -q "Enabled: Yes"; then
      warnf "system proxy is enabled on $wifi_service; Detox iOS may fail to connect. Disable proxy or bypass localhost/127.0.0.1"
    else
      pass "system proxy check passed on $wifi_service"
    fi
  else
    warnf "Wi-Fi service not found; skipped system proxy check"
  fi
fi

echo
echo "=== Summary ==="
echo "PASS: $ok"
echo "WARN: $warn"
echo "FAIL: $fail"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
