/* global __dirname, waitFor, element, by, device */
const fs = require("node:fs");
const path = require("node:path");
const E2E_PASSWORD_SHORTCUT_ENABLED = process.env.EXPO_PUBLIC_E2E_MODE === "1";
const E2E_API_BASE_URL = String(
  process.env.E2E_API_BASE_URL || process.env.EXPO_PUBLIC_E2E_API_BASE_URL || "http://127.0.0.1:8080"
).trim();

function loadManifestAccount() {
  try {
    const manifestPath = path.resolve(
      __dirname,
      "../../../agenttown-spec/workforce/evidence/runtime/business_case_manifest.json"
    );
    const payload = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const email = String(payload?.account?.email || "").trim();
    const password = String(payload?.account?.password || "").trim();
    if (!email || !password) return null;
    return { email, password };
  } catch {
    return null;
  }
}

function resolveE2ECredentials() {
  const envEmail = String(process.env.E2E_AUTH_EMAIL || "").trim();
  const envPassword = String(process.env.E2E_AUTH_PASSWORD || "").trim();
  if (envEmail && envPassword) return { email: envEmail, password: envPassword };
  const manifest = loadManifestAccount();
  if (manifest) return manifest;
  return {
    email: "qa.live.evidence@agenttown.dev",
    password: "AgentTown#2026!",
  };
}

async function existsById(id, timeout = 600) {
  try {
    await waitFor(element(by.id(id))).toBeVisible().withTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

async function existsByText(text, timeout = 600) {
  try {
    await waitFor(element(by.text(text))).toBeVisible().withTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHome(timeout = 30000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await existsById("home-chat-list", 500)) return;
    if (await existsById("home-mybot-entry", 500)) return;
    if (await existsByText("Ask anything", 450)) return;
    if (await existsByText("问点什么", 450)) return;
    if (await existsByText("Create Mini App", 450)) return;
    if (await existsByText("创建 Mini App", 450)) return;

    if (await existsById("chat-back-button", 250)) {
      try {
        await element(by.id("chat-back-button")).tap();
      } catch {
        // keep retrying home anchors
      }
      await waitMs(200);
      continue;
    }

    await waitMs(180);
  }
  throw new Error("home anchors not visible: home-chat-list/home-mybot-entry");
}

async function tryTapByText(text) {
  try {
    await waitFor(element(by.text(text))).toBeVisible().withTimeout(400);
    await element(by.text(text)).tap();
    return true;
  } catch {
    return false;
  }
}

async function safeReplaceText(id, value, scrollId = "auth-sign-in-scroll") {
  const input = element(by.id(id));
  for (let i = 0; i < 8; i += 1) {
    try {
      await waitFor(input).toBeVisible().withTimeout(4000);
      await input.replaceText(value);
      return;
    } catch {
      // keep trying with scroll + tap fallback
    }

    try {
      await waitFor(input).toBeVisible().whileElement(by.id(scrollId)).scroll(140, "down");
    } catch {
      // ignore and continue fallback
    }

    try {
      await input.tap();
      await input.replaceText(value);
      return;
    } catch {
      // continue retry
    }

    try {
      await element(by.id(scrollId)).tapAtPoint({ x: 20, y: 20 });
    } catch {
      // best effort keyboard dismiss
    }
  }
  throw new Error(`failed to fill input: ${id}`);
}

async function safeTypePassword(id, value, scrollId = "auth-sign-in-scroll") {
  const input = element(by.id(id));
  for (let i = 0; i < 8; i += 1) {
    try {
      await waitFor(input).toBeVisible().withTimeout(4000);
      await input.tap();
      try {
        await input.clearText();
      } catch {
        // continue with typed overwrite fallback
      }
      await input.typeText(value);
      return;
    } catch {
      // keep trying with scroll + replace fallback
    }

    try {
      await waitFor(input).toBeVisible().whileElement(by.id(scrollId)).scroll(140, "down");
    } catch {
      // ignore and continue fallback
    }

    try {
      await input.tap();
      try {
        await input.clearText();
      } catch {
        // ignore clear failures
      }
      await input.typeText(value);
      return;
    } catch {
      // continue retry
    }

    try {
      await input.replaceText(value);
      return;
    } catch {
      // continue retry
    }
  }
  throw new Error(`failed to type secure input: ${id}`);
}

async function tapVisibleById(id, options = {}) {
  const { scrollId = "auth-sign-in-scroll", timeout = 8000 } = options;
  const target = element(by.id(id));
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    try {
      await waitFor(target).toBeVisible().withTimeout(800);
      await target.tap();
      return;
    } catch {
      // keep scrolling until the control becomes visible
    }

    try {
      await waitFor(target).toBeVisible().whileElement(by.id(scrollId)).scroll(180, "down");
      await target.tap();
      return;
    } catch {
      // continue retry
    }

    await waitMs(180);
  }

  throw new Error(`failed to tap visible element: ${id}`);
}

async function tapVisibleByText(text, options = {}) {
  const { scrollId = "auth-sign-in-scroll", timeout = 8000 } = options;
  const target = element(by.text(text));
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    try {
      await waitFor(target).toBeVisible().withTimeout(800);
      await target.tap();
      return true;
    } catch {
      // keep searching
    }

    try {
      await waitFor(target).toBeVisible().whileElement(by.id(scrollId)).scroll(180, "down");
      await target.tap();
      return true;
    } catch {
      // continue retry
    }

    await waitMs(180);
  }

  return false;
}

async function signInWithPassword(email, password) {
  try {
    await waitForHome(5000);
    return;
  } catch {
    // continue with explicit auth flow.
  }

  await waitFor(element(by.id("auth-sign-in-scroll"))).toBeVisible().withTimeout(30000);
  if (await existsById("auth-mode-sign-in", 800)) {
    try {
      await element(by.id("auth-mode-sign-in")).tap();
    } catch {
      // no-op
    }
  }
  if (await existsById("auth-method-email", 800)) {
    try {
      await element(by.id("auth-method-email")).tap();
    } catch {
      // no-op
    }
  }
  await waitFor(element(by.id("auth-email-input"))).toBeVisible().withTimeout(30000);
  await safeReplaceText("auth-email-input", email);
  if (!E2E_PASSWORD_SHORTCUT_ENABLED) {
    await safeTypePassword("auth-password-input", password);
  }
  try {
    await element(by.id("auth-password-input")).tap();
    await element(by.id("auth-password-input")).tapReturnKey();
    if (E2E_PASSWORD_SHORTCUT_ENABLED) {
      await waitForHome(10000);
      return;
    }
  } catch {
    // keyboard action is not always available
  }
  try {
    await element(by.id("auth-sign-in-scroll")).tapAtPoint({ x: 24, y: 24 });
  } catch {
    // best effort keyboard dismiss
  }
  try {
    await element(by.id("auth-sign-in-scroll")).scrollTo("bottom");
  } catch {
    // continue with visibility search fallback
  }
  try {
    await tapVisibleById("auth-password-login-button", { timeout: 5000 });
  } catch {
    const tapped =
      (await tapVisibleByText("Sign In", { timeout: 4000 })) ||
      (await tapVisibleByText("登录", { timeout: 4000 }));
    if (!tapped) {
      try {
        await waitForHome(12000);
        return;
      } catch {
        // still not home, keep surfacing the login-action failure
      }
      try {
        await device.takeScreenshot(`auth-login-debug-${Date.now()}`);
      } catch {
        // ignore screenshot failures in helper diagnostics
      }
      throw new Error("failed to tap visible login action");
    }
  }
  await waitForHome(40000);
}

async function signInGuestOrPasswordFallback() {
  try {
    await waitForHome(12000);
    return;
  } catch {
    // need login flow
  }

  const onAuthScreen =
    (await existsById("auth-sign-in-scroll", 1000)) ||
    (await existsById("auth-email-input", 1000)) ||
    (await existsById("auth-guest-login-button", 1000));
  if (!onAuthScreen) {
    return;
  }

  const scroll = element(by.id("auth-sign-in-scroll"));
  for (let i = 0; i < 8; i += 1) {
    try {
      await scroll.scrollTo("bottom");
    } catch {
      try {
        await scroll.swipe("up", "fast", 0.9);
      } catch {
        // continue
      }
    }
    if (await existsById("auth-guest-login-button", 1200)) {
      await element(by.id("auth-guest-login-button")).tap();
    } else if (await tryTapByText("Continue as Guest")) {
      // no-op
    } else {
      await tryTapByText("游客模式继续");
    }
    if (await existsById("home-mybot-entry", 4000)) return;
  }

  const creds = resolveE2ECredentials();
  await signInWithPassword(creds.email, creds.password);
}

async function signInWithPasswordIfNeeded(email, password) {
  try {
    await waitForHome(45000);
    return;
  } catch {
    await signInWithPassword(email, password);
  }
}

module.exports = {
  E2E_API_BASE_URL,
  resolveE2ECredentials,
  waitForHome,
  signInWithPassword,
  signInWithPasswordIfNeeded,
  signInGuestOrPasswordFallback,
  existsById,
};
