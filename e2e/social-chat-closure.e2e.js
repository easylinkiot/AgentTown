/* global describe, beforeAll, it, afterAll, device, waitFor, expect, element, by */

const {
  ensureAccount,
  ensureFriendship,
  createThread,
  addThreadMember,
  sendThreadMessage,
} = require("./support/api-helper");

const ACCOUNT_A_EMAIL = process.env.E2E_ACCOUNT_A_EMAIL || "595367288@qq.com";
const ACCOUNT_B_EMAIL = process.env.E2E_ACCOUNT_B_EMAIL || "zheng595367288@foxmail.com";
const ACCOUNT_PASSWORD = process.env.E2E_ACCOUNT_PASSWORD || "00000000";
const SEED = `${Date.now()}`;

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
  "Don’t Allow",
  "不允许",
];

const fixture = {
  accountA: null,
  accountB: null,
  dmThreadId: "",
  groupThreadId: "",
  dmIncomingFromB: `[E2E][DM][B->A] ${SEED}`,
  dmOutgoingFromA: `[E2E][DM][A->B] ${SEED}`,
  groupIncomingFromA: `[E2E][GROUP][A-seed] ${SEED}`,
  groupOutgoingFromB: `[E2E][GROUP][B-send] ${SEED}`,
};

async function existsByText(text, timeout = 500) {
  try {
    await waitFor(element(by.text(text))).toBeVisible().withTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

async function existsByLabel(label, timeout = 500) {
  try {
    await waitFor(element(by.label(label))).toBeVisible().withTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

async function dismissSystemAlerts() {
  for (let i = 0; i < 4; i += 1) {
    let dismissed = false;
    for (const key of ALERT_BUTTONS) {
      if (await existsByLabel(key, 250)) {
        await element(by.label(key)).tap();
        dismissed = true;
        break;
      }
      if (await existsByText(key, 250)) {
        await element(by.text(key)).tap();
        dismissed = true;
        break;
      }
    }
    if (!dismissed) return;
  }
}

async function launchAs(email) {
  await device.launchApp({
    newInstance: true,
    delete: true,
    launchArgs: {
      e2eMode: "1",
      e2eAuthEmail: email,
      e2eAuthPassword: ACCOUNT_PASSWORD,
      detoxEnableSynchronization: "0",
    },
  });
  await dismissSystemAlerts();
  await device.disableSynchronization();
  try {
    await waitFor(element(by.id("home-mybot-entry"))).toBeVisible().withTimeout(12000);
    return;
  } catch {
    // Fallback to explicit sign-in in case launchArgs were not bridged.
  }

  await waitFor(element(by.id("auth-email-input"))).toBeVisible().withTimeout(20000);
  await element(by.id("auth-email-input")).replaceText(email);
  await element(by.id("auth-password-input")).replaceText(ACCOUNT_PASSWORD);
  try {
    await element(by.id("auth-password-input")).tapReturnKey();
  } catch {
    // Keyboard action is flaky in simulator.
  }
  await element(by.id("auth-password-login-button")).tap();
  await waitFor(element(by.id("home-mybot-entry"))).toBeVisible().withTimeout(40000);
}

async function openThreadFromList(threadId) {
  const row = element(by.id(`chat-list-item-${threadId}`));
  await waitFor(element(by.id("home-chat-list"))).toBeVisible().withTimeout(15000);
  for (let i = 0; i < 10; i += 1) {
    try {
      await waitFor(row).toBeVisible().withTimeout(1200);
      await row.tap();
      await waitFor(element(by.id("chat-message-input"))).toBeVisible().withTimeout(20000);
      return;
    } catch {
      try {
        await element(by.id("home-chat-list")).swipe("up", "fast", 0.7);
      } catch {
        // Keep retrying.
      }
    }
  }
  throw new Error(`thread not visible in list: ${threadId}`);
}

async function openThread(threadId) {
  try {
    await device.openURL({ url: `agenttown://chat/${encodeURIComponent(threadId)}` });
    await waitFor(element(by.id("chat-message-input"))).toBeVisible().withTimeout(12000);
    return;
  } catch {
    // Fallback to list navigation.
  }

  await waitFor(element(by.id("home-mybot-entry"))).toBeVisible().withTimeout(15000);
  await openThreadFromList(threadId);
}

async function sendMessage(content) {
  await element(by.id("chat-message-input")).replaceText(content);
  try {
    await element(by.id("chat-send-button")).tap();
  } catch {
    await element(by.id("chat-message-input")).tapReturnKey();
  }
  await waitFor(element(by.text(content))).toBeVisible().withTimeout(30000);
}

describe("Social chat closure (DM + Group + boundary)", () => {
  beforeAll(async () => {
    fixture.accountA = await ensureAccount(ACCOUNT_A_EMAIL, ACCOUNT_PASSWORD, "E2E User A");
    fixture.accountB = await ensureAccount(ACCOUNT_B_EMAIL, ACCOUNT_PASSWORD, "E2E User B");

    const { friendAtoB } = await ensureFriendship(fixture.accountA, fixture.accountB);
    fixture.dmThreadId = String(friendAtoB?.threadId || "").trim();
    if (!fixture.dmThreadId) {
      throw new Error("failed to locate DM thread id after friendship setup");
    }

    const group = await createThread(fixture.accountA.token, {
      name: `Detox Group ${SEED}`,
      isGroup: true,
      message: "detox group seed",
    });
    fixture.groupThreadId = String(group?.id || "").trim();
    if (!fixture.groupThreadId) {
      throw new Error("failed to create group thread");
    }

    await addThreadMember(fixture.accountA.token, fixture.groupThreadId, {
      friendId: friendAtoB.id,
      memberType: "human",
    });

    await sendThreadMessage(
      fixture.accountB.token,
      fixture.dmThreadId,
      fixture.dmIncomingFromB,
      {
        senderId: fixture.accountB.user.id,
        senderName: fixture.accountB.user.displayName || "E2E User B",
        senderType: "human",
      }
    );

    await sendThreadMessage(
      fixture.accountA.token,
      fixture.groupThreadId,
      fixture.groupIncomingFromA,
      {
        senderId: fixture.accountA.user.id,
        senderName: fixture.accountA.user.displayName || "E2E User A",
        senderType: "human",
      }
    );
  }, 300000);

  it("Account A receives DM, sends DM, and enforces 4000-char boundary", async () => {
    await launchAs(ACCOUNT_A_EMAIL);
    await openThread(fixture.dmThreadId);

    await waitFor(element(by.text(fixture.dmIncomingFromB))).toBeVisible().withTimeout(30000);
    await sendMessage(fixture.dmOutgoingFromA);

    const tooLong = "x".repeat(4100);
    const expected = "x".repeat(4000);
    await element(by.id("chat-message-input")).replaceText(tooLong);
    await expect(element(by.id("chat-message-input"))).toHaveText(expected);
  }, 180000);

  it("Account B sees A DM, joins group chat, and sends message", async () => {
    await launchAs(ACCOUNT_B_EMAIL);

    await openThread(fixture.dmThreadId);
    await waitFor(element(by.text(fixture.dmOutgoingFromA))).toBeVisible().withTimeout(30000);

    await openThread(fixture.groupThreadId);
    await waitFor(element(by.text(fixture.groupIncomingFromA))).toBeVisible().withTimeout(30000);
    await sendMessage(fixture.groupOutgoingFromB);
  }, 180000);

  afterAll(async () => {
    try {
      await device.enableSynchronization();
    } catch {
      // ignore cleanup failure
    }
  });
});
