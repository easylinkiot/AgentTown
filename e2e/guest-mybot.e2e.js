/* global describe, beforeAll, afterAll, it, device, waitFor, element, by */

describe("Guest login and send message", () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      launchArgs: {
        e2eMode: "1",
      },
    });
    await device.disableSynchronization();
  });

  async function isOnHome() {
    try {
      await waitFor(element(by.id("home-mybot-entry"))).toBeVisible().withTimeout(1500);
      return true;
    } catch {
      return false;
    }
  }

  async function tapGuestLogin() {
    const scroll = element(by.id("auth-sign-in-scroll"));

    for (let i = 0; i < 10; i++) {
      if (await isOnHome()) {
        return;
      }

      try {
        await scroll.scrollTo("bottom");
      } catch {
        try {
          await scroll.swipe("up", "fast", 0.9);
        } catch {
          // keep retrying
        }
      }

      try {
        await waitFor(element(by.id("auth-guest-login-button"))).toBeVisible().withTimeout(3000);
        await element(by.id("auth-guest-login-button")).tap();
      } catch {
        try {
          await element(by.text("Continue as Guest")).tap();
        } catch {
          await element(by.text("游客模式继续")).tap();
        }
      }

      try {
        await waitFor(element(by.id("home-mybot-entry"))).toBeVisible().withTimeout(6000);
        return;
      } catch {
        // click may be swallowed; retry
      }
    }

    await waitFor(element(by.id("home-mybot-entry"))).toBeVisible().withTimeout(20000);
  }

  async function tapSendMessage() {
    await waitFor(element(by.id("chat-send-button"))).toBeVisible().withTimeout(8000);
    try {
      await element(by.id("chat-send-button")).tap();
      return;
    } catch {
      // On iOS the keyboard can overlap the bottom-right send button.
    }

    try {
      await element(by.id("chat-message-input")).tapReturnKey();
    } catch {
      // Keep fallback deterministic.
    }

    await waitFor(element(by.id("chat-send-button"))).toBeVisible().withTimeout(8000);
    await element(by.id("chat-send-button")).tap();
  }

  it("opens app, signs in as guest, opens MyBot, and sends a message", async () => {
    if (!(await isOnHome())) {
      await tapGuestLogin();
    }

    await waitFor(element(by.id("home-mybot-entry"))).toBeVisible().withTimeout(30000);
    await element(by.id("home-mybot-entry")).tap();

    await waitFor(element(by.id("chat-message-input"))).toBeVisible().withTimeout(20000);
    await element(by.id("chat-message-input")).typeText("remind me 1 minute to drink water");
    await tapSendMessage();

    await waitFor(element(by.text("remind me 1 minute to drink water"))).toBeVisible().withTimeout(20000);
  });

  afterAll(async () => {
    try {
      await device.enableSynchronization();
    } catch {
      // Ignore teardown failure when the app failed to connect in setup.
    }
  });
});
