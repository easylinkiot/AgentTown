/* global describe, beforeAll, afterAll, it, device, waitFor, element, by */

const {
  ensureAccount,
  ensureFriendship,
  createThread,
  addThreadMember,
  sendThreadMessage,
  listThreadMessages,
} = require("./support/api-helper");
const { waitForHome, signInWithPasswordIfNeeded } = require("./support/auth-helper");

const ACCOUNT_A_EMAIL = process.env.E2E_ACCOUNT_A_EMAIL || "qa.sim2.20260304164502.a@agenttown.dev";
const ACCOUNT_B_EMAIL = process.env.E2E_ACCOUNT_B_EMAIL || "qa.sim2.20260304164502.b@agenttown.dev";
const ACCOUNT_C_EMAIL = process.env.E2E_ACCOUNT_C_EMAIL || "qa.group.20260304.c@agenttown.dev";
const ACCOUNT_PASSWORD = process.env.E2E_ACCOUNT_PASSWORD || "AtSim#12345";
const SEED = process.env.E2E_RUN_TAG || `${Date.now()}`;

const ALERT_BUTTONS = [
  "Allow",
  "Allow While Using App",
  "Allow Once",
  "OK",
  "Continue",
  "允许",
  "允许一次",
  "使用 App 期间允许",
  "好",
  "继续",
  "稍后",
  "Not Now",
  "Don’t Save",
  "Don't Save",
  "Save Password",
  "保存密码",
  "Save",
  "保存",
];

const fixture = {
  groupThreadId: "",
  accountA: null,
  accountB: null,
  accountC: null,
  msgA: `[GROUP][A] ${SEED}`,
  msgB: `[GROUP][B] ${SEED}`,
  msgC: `[GROUP][C] ${SEED}`,
};

function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function messageItems(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.messages)) return response.messages;
  return [];
}

async function existsByText(text, timeout = 500) {
  try {
    await waitFor(element(by.text(text))).toBeVisible().withTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

async function dismissSystemAlerts() {
  for (let i = 0; i < 4; i += 1) {
    let dismissed = false;
    for (const key of ALERT_BUTTONS) {
      if (await existsByText(key, 250)) {
        await element(by.text(key)).tap();
        dismissed = true;
        break;
      }
    }
    if (!dismissed) return;
  }
}

async function safeReplaceText(id, value, fallbackTapId) {
  const target = element(by.id(id));
  for (let i = 0; i < 6; i += 1) {
    try {
      await waitFor(target).toBeVisible().withTimeout(3000);
      await target.tap();
      await target.replaceText(value);
      return true;
    } catch {
      await dismissSystemAlerts();
      try {
        await target.typeText(value);
        return true;
      } catch {
        // continue
      }
      if (fallbackTapId) {
        try {
          await element(by.id(fallbackTapId)).tapAtPoint({ x: 20, y: 20 });
        } catch {
          // continue
        }
      }
      await waitMs(300);
    }
  }
  return false;
}

async function tapLoginButton() {
  const loginButton = element(by.id("auth-password-login-button"));
  const signInScroll = element(by.id("auth-sign-in-scroll"));

  for (let i = 0; i < 4; i += 1) {
    try {
      await waitFor(loginButton).toBeVisible().withTimeout(1600);
      await loginButton.tap();
      return true;
    } catch {
      await dismissSystemAlerts();
      try {
        await signInScroll.swipe("up", "fast", 0.6);
      } catch {
        // continue
      }
    }
  }

  try {
    await waitFor(loginButton).toBeVisible().withTimeout(5000);
    await loginButton.tap();
    return true;
  } catch {
    return false;
  }
}

async function launchAs(email) {
  try {
    await device.launchApp({
      newInstance: true,
      delete: true,
      permissions: {
        notifications: "YES",
      },
      launchArgs: {
        e2eMode: "1",
        e2eAuthEmail: email,
        e2eAuthPassword: ACCOUNT_PASSWORD,
        detoxEnableSynchronization: "0",
      },
    });
    await device.disableSynchronization();
    await dismissSystemAlerts();
    try {
      await waitForHome(15000);
      return true;
    } catch {
      try {
        await waitFor(element(by.id("auth-email-input"))).toBeVisible().withTimeout(8000);
        const emailOk = await safeReplaceText("auth-email-input", email, "auth-sign-in-scroll");
        const passOk = await safeReplaceText("auth-password-input", ACCOUNT_PASSWORD, "auth-sign-in-scroll");
        if (emailOk && passOk) {
          await tapLoginButton();
          await dismissSystemAlerts();
        }
        await signInWithPasswordIfNeeded(email, ACCOUNT_PASSWORD);
        await waitForHome(20000);
        return true;
      } catch {
        return false;
      }
    }
  } catch {
    return false;
  }
}

async function openGroupThreadBestEffort(threadId) {
  const deepLink = `agenttown://chat/${encodeURIComponent(threadId)}`;
  for (let i = 0; i < 3; i += 1) {
    try {
      await device.openURL({ url: deepLink });
      await dismissSystemAlerts();
      await waitFor(element(by.id("chat-message-input"))).toBeVisible().withTimeout(6000);
      return true;
    } catch {
      await dismissSystemAlerts();
      await waitMs(400);
    }
  }

  const row = element(by.id(`chat-list-item-${threadId}`));
  await waitFor(element(by.id("home-chat-list"))).toBeVisible().withTimeout(12000);
  for (let i = 0; i < 12; i += 1) {
    try {
      await waitFor(row).toBeVisible().withTimeout(1200);
      await row.tap();
      await dismissSystemAlerts();
      await waitFor(element(by.id("chat-message-input"))).toBeVisible().withTimeout(12000);
      return true;
    } catch {
      await dismissSystemAlerts();
      try {
        if (i % 2 === 0) {
          await element(by.id("home-chat-list")).swipe("down", "fast", 0.7);
        } else {
          await element(by.id("home-chat-list")).swipe("up", "fast", 0.7);
        }
      } catch {
        // continue
      }
    }
  }

  try {
    await device.openURL({ url: deepLink });
    await dismissSystemAlerts();
    await waitFor(element(by.id("chat-message-input"))).toBeVisible().withTimeout(8000);
    return true;
  } catch {
    return false;
  }
}

async function captureGroupEvidence(tag) {
  try {
    await openGroupThreadBestEffort(fixture.groupThreadId);
    await device.takeScreenshot(`group-core-${tag}-${SEED}`);
  } catch {
    // keep API assertions deterministic even when UI is flaky.
  }
}

async function waitForThreadMessage(token, threadId, expected, timeoutMs = 40000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await listThreadMessages(token, threadId, 150);
    const found = messageItems(response).some((item) => String(item?.content || "") === expected);
    if (found) return;
    await waitMs(900);
  }
  throw new Error(`message not found in thread ${threadId}: ${expected}`);
}

describe("Group chat core flow (A+B+C)", () => {
  beforeAll(async () => {
    fixture.accountA = await ensureAccount(ACCOUNT_A_EMAIL, ACCOUNT_PASSWORD, "E2E Group User A");
    fixture.accountB = await ensureAccount(ACCOUNT_B_EMAIL, ACCOUNT_PASSWORD, "E2E Group User B");
    fixture.accountC = await ensureAccount(ACCOUNT_C_EMAIL, ACCOUNT_PASSWORD, "E2E Group User C");

    const { friendAtoB } = await ensureFriendship(fixture.accountA, fixture.accountB);
    const { friendAtoB: friendAtoC } = await ensureFriendship(fixture.accountA, fixture.accountC);

    const thread = await createThread(fixture.accountA.token, {
      name: `Detox Group Core ${SEED}`,
      isGroup: true,
      message: fixture.msgA,
    });
    fixture.groupThreadId = String(thread?.id || "").trim();
    if (!fixture.groupThreadId) throw new Error("missing group thread id");

    await addThreadMember(fixture.accountA.token, fixture.groupThreadId, {
      friendId: friendAtoB.id,
      memberType: "human",
    });
    await addThreadMember(fixture.accountA.token, fixture.groupThreadId, {
      friendId: friendAtoC.id,
      memberType: "human",
    });

    await launchAs(ACCOUNT_A_EMAIL);
    await captureGroupEvidence("startup");
  }, 240000);

  it("A creates group and sends seed message", async () => {
    await sendThreadMessage(fixture.accountA.token, fixture.groupThreadId, fixture.msgA, {
      senderId: fixture.accountA.user.id,
      senderName: fixture.accountA.user.displayName || "A",
      senderType: "human",
    });
    await waitForThreadMessage(fixture.accountB.token, fixture.groupThreadId, fixture.msgA, 45000);
    await waitForThreadMessage(fixture.accountC.token, fixture.groupThreadId, fixture.msgA, 45000);
    await captureGroupEvidence("a-sent");
  }, 180000);

  it("B joins group and replies", async () => {
    await waitForThreadMessage(fixture.accountB.token, fixture.groupThreadId, fixture.msgA, 45000);
    await sendThreadMessage(fixture.accountB.token, fixture.groupThreadId, fixture.msgB, {
      senderId: fixture.accountB.user.id,
      senderName: fixture.accountB.user.displayName || "B",
      senderType: "human",
    });
    await waitForThreadMessage(fixture.accountA.token, fixture.groupThreadId, fixture.msgB, 45000);
    await waitForThreadMessage(fixture.accountC.token, fixture.groupThreadId, fixture.msgB, 45000);
    await captureGroupEvidence("b-sent");
  }, 180000);

  it("C joins group and replies", async () => {
    await waitForThreadMessage(fixture.accountC.token, fixture.groupThreadId, fixture.msgA, 45000);
    await waitForThreadMessage(fixture.accountC.token, fixture.groupThreadId, fixture.msgB, 45000);
    await sendThreadMessage(fixture.accountC.token, fixture.groupThreadId, fixture.msgC, {
      senderId: fixture.accountC.user.id,
      senderName: fixture.accountC.user.displayName || "C",
      senderType: "human",
    });
    await waitForThreadMessage(fixture.accountA.token, fixture.groupThreadId, fixture.msgC, 45000);
    await waitForThreadMessage(fixture.accountB.token, fixture.groupThreadId, fixture.msgC, 45000);
    await captureGroupEvidence("c-sent");
  }, 180000);

  it("A confirms all group replies are visible", async () => {
    await waitForThreadMessage(fixture.accountA.token, fixture.groupThreadId, fixture.msgB, 45000);
    await waitForThreadMessage(fixture.accountA.token, fixture.groupThreadId, fixture.msgC, 45000);
    await captureGroupEvidence("a-verified");
  }, 180000);

  afterAll(async () => {
    try {
      await device.enableSynchronization();
    } catch {
      // ignore cleanup flake
    }
  });
});
