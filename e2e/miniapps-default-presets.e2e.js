/* global describe, beforeAll, afterAll, it, device, waitFor, expect, element, by */
const {
  signInGuestOrPasswordFallback,
} = require("./support/auth-helper");

function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isVisibleById(id, timeoutMs = 600) {
  try {
    await waitFor(element(by.id(id))).toBeVisible().withTimeout(timeoutMs);
    return true;
  } catch {
    return false;
  }
}

async function tapInstallAndOpenFromAlert() {
  const installZh = element(by.text("安装并打开"));
  const installEn = element(by.text("Install & Open"));
  try {
    await waitFor(installZh).toBeVisible().withTimeout(5000);
    await installZh.tap();
    return;
  } catch {
    await waitFor(installEn).toBeVisible().withTimeout(5000);
    await installEn.tap();
  }
}

async function tryTapInstallAndOpenFromAlert(timeoutMs = 2500) {
  const installZh = element(by.text("安装并打开"));
  const installEn = element(by.text("Install & Open"));
  try {
    await waitFor(installZh).toBeVisible().withTimeout(timeoutMs);
    await installZh.tap();
    return true;
  } catch {
    try {
      await waitFor(installEn).toBeVisible().withTimeout(timeoutMs);
      await installEn.tap();
      return true;
    } catch {
      return false;
    }
  }
}

async function ensureMiniAppDockVisible(timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await waitFor(element(by.text("Create Mini App"))).toBeVisible().withTimeout(700);
      return;
    } catch {}
    try {
      await waitFor(element(by.text("创建 Mini App"))).toBeVisible().withTimeout(700);
      return;
    } catch {}
    try {
      await waitFor(element(by.id("home-chat-list"))).toBeVisible().withTimeout(1000);
      await element(by.id("home-chat-list")).swipe("down", "fast", 0.8);
    } catch {
      // continue polling
    }
    await waitMs(220);
  }
  throw new Error("miniapp-dock not visible after scroll retries");
}

async function tapPresetNews() {
  try {
    await waitFor(element(by.text("News"))).toBeVisible().withTimeout(5000);
    await element(by.text("News")).tap();
    return;
  } catch {
    await waitFor(element(by.text("关注"))).toBeVisible().withTimeout(5000);
    await element(by.text("关注")).tap();
  }
}

describe("MiniApps default presets", () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      delete: true,
      launchArgs: {
        e2eMode: "1",
        detoxEnableSynchronization: "0",
      },
    });
    await device.disableSynchronization();
    await signInGuestOrPasswordFallback();
  });

  it("shows default presets and installs+opens when preset not installed", async () => {
    await ensureMiniAppDockVisible();

    await expect(element(by.text("News"))).toBeVisible();
    await expect(element(by.text("Price"))).toBeVisible();
    await expect(element(by.text("Words"))).toBeVisible();

    await tapPresetNews();
    const installedViaAlertFirstTry = await tryTapInstallAndOpenFromAlert();
    if (!installedViaAlertFirstTry) {
      await waitFor(element(by.id("miniapp-detail-screen"))).toBeVisible().withTimeout(20000);
      await element(by.id("miniapp-detail-install-toggle")).tap();
      await waitFor(element(by.id("miniapp-detail-back-anchor"))).toBeVisible().withTimeout(5000);
      await element(by.id("miniapp-detail-back-anchor")).tap();
      await ensureMiniAppDockVisible();
      await tapPresetNews();
      await tapInstallAndOpenFromAlert();
    }

    await waitFor(element(by.id("miniapp-detail-screen"))).toBeVisible().withTimeout(25000);
    await expect(element(by.id("miniapp-detail-install-toggle"))).toBeVisible();
    await waitMs(600);
  });

  afterAll(async () => {
    try {
      await device.enableSynchronization();
    } catch {
      // ignore teardown failures in non-idle state
    }
  });
});
