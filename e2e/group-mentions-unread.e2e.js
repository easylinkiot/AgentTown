/* global describe, beforeAll, it, jest, device, waitFor, element, by */

const {
  ensureAccount,
  ensureFriendship,
  createThread,
  listThreads,
  addThreadMember,
  sendThreadMessage,
} = require("./support/api-helper");
const { E2E_API_BASE_URL, existsById, signInWithPassword, waitForHome } = require("./support/auth-helper");

const SEED = process.env.E2E_RUN_TAG || `${Date.now()}`;
const ACCOUNT_A_EMAIL = process.env.E2E_ACCOUNT_A_EMAIL || `qa.mentions.${SEED}.a@agenttown.dev`;
const ACCOUNT_B_EMAIL = process.env.E2E_ACCOUNT_B_EMAIL || `qa.mentions.${SEED}.b@agenttown.dev`;
const ACCOUNT_C_EMAIL = process.env.E2E_ACCOUNT_C_EMAIL || `qa.mentions.${SEED}.c@agenttown.dev`;
const ACCOUNT_PASSWORD = process.env.E2E_ACCOUNT_PASSWORD || "AtSim12345";

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
  groupName: `Mention Group ${SEED}`,
  accountA: null,
  accountB: null,
  accountC: null,
  memberBId: "",
  memberCId: "",
  msgMentionB: `@B only ${SEED}`,
  msgMentionAll: `@All all-hands ${SEED}`,
};

function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

jest.setTimeout(240000);

async function launchAs(email) {
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
      e2eApiBaseUrl: E2E_API_BASE_URL,
      detoxEnableSynchronization: "0",
    },
  });
  await device.disableSynchronization();
  await dismissSystemAlerts();
  if (await existsById("auth-email-input", 1500)) {
    await signInWithPassword(email, ACCOUNT_PASSWORD);
    await waitForHome(20000);
    return;
  }
  try {
    await waitForHome(12000);
    return;
  } catch {
    if (await existsById("auth-email-input", 1500)) {
      await signInWithPassword(email, ACCOUNT_PASSWORD);
      await waitForHome(20000);
      return;
    }
    throw new Error(`failed to reach home or sign-in form for ${email}`);
  }
}

async function waitForThreadState(token, threadId, predicate, timeoutMs = 40000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const threads = await listThreads(token);
    const thread = Array.isArray(threads)
      ? threads.find((item) => String(item?.id || "").trim() === threadId)
      : null;
    if (thread && predicate(thread)) return thread;
    await waitMs(900);
  }
  throw new Error(`thread state timeout: ${threadId}`);
}

async function openThreadFromHome(threadId) {
  const row = element(by.id(`chat-list-item-${threadId}`));
  await waitFor(element(by.id("home-chat-list"))).toBeVisible().withTimeout(12000);
  for (let i = 0; i < 8; i += 1) {
    try {
      await waitFor(row).toBeVisible().withTimeout(1200);
      await row.tap();
      await waitFor(element(by.id("chat-message-input"))).toBeVisible().withTimeout(8000);
      return;
    } catch {
      try {
        await element(by.id("home-chat-list")).swipe("up", "fast", 0.7);
      } catch {
        // ignore
      }
      await waitMs(250);
    }
  }
  throw new Error(`failed to open thread from home: ${threadId}`);
}

async function waitForThreadRowOnHome(threadId, timeoutMs = 30000) {
  const row = element(by.id(`chat-list-item-${threadId}`));
  const deadline = Date.now() + timeoutMs;
  let refreshed = false;

  await waitFor(element(by.id("home-chat-list"))).toBeVisible().withTimeout(12000);
  while (Date.now() < deadline) {
    try {
      await waitFor(row).toBeVisible().withTimeout(1200);
      return;
    } catch {
      // keep trying
    }

    try {
      await element(by.id("home-chat-list")).swipe("down", "slow", 0.7);
      refreshed = true;
    } catch {
      // ignore
    }

    if (refreshed) {
      await waitMs(500);
    } else {
      await waitMs(250);
    }
  }

  await device.takeScreenshot(`group-mentions-home-missing-${SEED}`);
  throw new Error(`thread row not visible on home: ${threadId}`);
}

describe("Group mentions and unread state", () => {
  beforeAll(async () => {
    fixture.accountA = await ensureAccount(ACCOUNT_A_EMAIL, ACCOUNT_PASSWORD, "Mentions User A");
    fixture.accountB = await ensureAccount(ACCOUNT_B_EMAIL, ACCOUNT_PASSWORD, "Mentions User B");
    fixture.accountC = await ensureAccount(ACCOUNT_C_EMAIL, ACCOUNT_PASSWORD, "Mentions User C");

    const { friendAtoB } = await ensureFriendship(fixture.accountA, fixture.accountB);
    const { friendAtoB: friendAtoC } = await ensureFriendship(fixture.accountA, fixture.accountC);

    const thread = await createThread(fixture.accountA.token, {
      name: fixture.groupName,
      isGroup: true,
      message: "mention seed",
    });
    fixture.groupThreadId = String(thread?.id || "").trim();
    if (!fixture.groupThreadId) throw new Error("missing mention group thread id");

    const addedB = await addThreadMember(fixture.accountA.token, fixture.groupThreadId, {
      friendId: friendAtoB.id,
      memberType: "human",
    });
    const addedC = await addThreadMember(fixture.accountA.token, fixture.groupThreadId, {
      friendId: friendAtoC.id,
      memberType: "human",
    });
    fixture.memberBId = String(addedB?.id || "").trim();
    fixture.memberCId = String(addedC?.id || "").trim();
    if (!fixture.memberBId || !fixture.memberCId) {
      throw new Error("failed to capture group human member ids");
    }

    await launchAs(ACCOUNT_B_EMAIL);
    await waitForThreadRowOnHome(fixture.groupThreadId);
  });

  it("routes @member highlight only to the mentioned human and clears after open", async () => {
    await sendThreadMessage(fixture.accountA.token, fixture.groupThreadId, fixture.msgMentionB, {
      mentionedMemberIds: [fixture.memberBId],
    });

    await waitForThreadState(
      fixture.accountB.token,
      fixture.groupThreadId,
      (thread) => Number(thread?.unreadCount || 0) >= 1 && Boolean(thread?.highlight)
    );
    await waitForThreadState(
      fixture.accountC.token,
      fixture.groupThreadId,
      (thread) => Number(thread?.unreadCount || 0) >= 1 && !thread?.highlight
    );

    await waitFor(element(by.id(`chat-list-item-unread-${fixture.groupThreadId}`))).toBeVisible().withTimeout(15000);
    await device.takeScreenshot(`group-mention-targeted-badge-${SEED}`);

    await openThreadFromHome(fixture.groupThreadId);
    await device.takeScreenshot(`group-mention-targeted-open-${SEED}`);

    await waitForThreadState(
      fixture.accountB.token,
      fixture.groupThreadId,
      (thread) => Number(thread?.unreadCount || 0) === 0 && !thread?.highlight,
      20000
    );

    await element(by.id("chat-back-button")).tap();
    await waitFor(element(by.id("home-chat-list"))).toBeVisible().withTimeout(8000);
  });

  it("@All highlights every human member", async () => {
    await sendThreadMessage(fixture.accountA.token, fixture.groupThreadId, fixture.msgMentionAll, {
      mentionedAll: true,
    });

    await waitForThreadState(
      fixture.accountB.token,
      fixture.groupThreadId,
      (thread) => Number(thread?.unreadCount || 0) >= 1 && Boolean(thread?.highlight)
    );
    await waitForThreadState(
      fixture.accountC.token,
      fixture.groupThreadId,
      (thread) => Number(thread?.unreadCount || 0) >= 1 && Boolean(thread?.highlight)
    );

    await waitFor(element(by.id(`chat-list-item-unread-${fixture.groupThreadId}`))).toBeVisible().withTimeout(15000);
    await device.takeScreenshot(`group-mention-all-badge-${SEED}`);
  });
});
