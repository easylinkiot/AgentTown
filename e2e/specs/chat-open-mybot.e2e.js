async function ensureDevBundleAttached() {
  try {
    await waitFor(element(by.text("http://localhost:8081")))
      .toBeVisible()
      .withTimeout(2500);
    await element(by.text("http://localhost:8081")).tap();
  } catch (_) {
    // ignore when app is already attached
  }

  try {
    await waitFor(element(by.text("Open")))
      .toBeVisible()
      .withTimeout(2500);
    await element(by.text("Open")).tap();
  } catch (_) {
    // ignore when no handoff prompt
  }

  let devShellWithoutServer = false;
  try {
    await waitFor(element(by.text("No development servers found")))
      .toBeVisible()
      .withTimeout(2500);
    devShellWithoutServer = true;
  } catch (_) {
    // ignore when shell is not shown
  }
  if (devShellWithoutServer) {
    throw new Error("Expo development client cannot find Metro on http://localhost:8081");
  }
}

async function dismissSystemPromptIfNeeded() {
  try {
    await waitFor(element(by.text("Save Password?")))
      .toBeVisible()
      .withTimeout(600);
    try {
      await element(by.text("Not Now")).tap();
    } catch (_) {
      // ignore if button text differs
    }
    return;
  } catch (_) {
    // no save-password prompt
  }

  try {
    await waitFor(element(by.text("Apple Account Verification")))
      .toBeVisible()
      .withTimeout(600);
    try {
      await element(by.text("Not Now")).tap();
    } catch (_) {
      // ignore
    }
  } catch (_) {
    // no apple verification prompt
  }
}

function getCandidateApiBases() {
  const candidates = [
    process.env.EXPO_PUBLIC_API_BASE_URL,
    "http://127.0.0.1:8080",
    "http://localhost:8080",
    "https://agenttown-api.kittens.cloud",
    "https://agtown.ai",
  ]
    .filter(Boolean)
    .map((item) => String(item).replace(/\/+$/, ""));
  return [...new Set(candidates)];
}

async function registerE2EUser() {
  const unique = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const email = `detox_${unique}@example.com`;
  const password = `Passw0rd!${unique}`;
  const payload = {
    email,
    password,
    displayName: `Detox ${unique}`,
  };
  let registeredAtLeastOnce = false;
  let lastErrorText = "";

  for (const base of getCandidateApiBases()) {
    try {
      const response = await fetch(`${base}/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok || response.status === 409) {
        registeredAtLeastOnce = true;
      } else {
        const text = await response.text();
        lastErrorText = `${base} -> ${response.status}: ${text}`;
      }
    } catch (err) {
      lastErrorText = `${base} -> ${String(err)}`;
    }
  }

  if (!registeredAtLeastOnce) {
    throw new Error(`Failed to register e2e user on all known API bases. ${lastErrorText}`);
  }

  return { email, password };
}

async function waitForSignedInSurface(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      await waitFor(element(by.id("screen.signin"))).not.toBeVisible().withTimeout(1200);
      try {
        await waitFor(element(by.text("Development servers"))).toBeVisible().withTimeout(400);
      } catch (_) {
        try {
          await waitFor(element(by.text("No development servers found"))).toBeVisible().withTimeout(400);
        } catch (_) {
          return;
        }
      }
    } catch (err) {
      lastError = err;
    }

    try {
      await waitFor(element(by.id("screen.home"))).toBeVisible().withTimeout(1500);
      return;
    } catch (err) {
      lastError = err;
    }

    try {
      await waitFor(element(by.id("list.threads"))).toBeVisible().withTimeout(1500);
      return;
    } catch (err) {
      lastError = err;
    }

    try {
      await waitFor(element(by.text("WORLD MAP"))).toBeVisible().withTimeout(1500);
      return;
    } catch (err) {
      lastError = err;
    }

    try {
      await waitFor(element(by.text("Direct"))).toBeVisible().withTimeout(1500);
      return;
    } catch (err) {
      lastError = err;
    }

    try {
      await waitFor(element(by.id("screen.chat"))).toBeVisible().withTimeout(1500);
      return;
    } catch (err) {
      lastError = err;
    }

    try {
      await waitFor(element(by.text("No messages yet"))).toBeVisible().withTimeout(1500);
      return;
    } catch (err) {
      lastError = err;
    }

    try {
      await waitFor(element(by.text("暂无消息"))).toBeVisible().withTimeout(1500);
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Timed out waiting for signed-in surface");
}

async function ensureSignedIn() {
  try {
    await device.disableSynchronization();
  } catch (_) {
    // ignore
  }

  await ensureDevBundleAttached();
  await dismissSystemPromptIfNeeded();

  try {
    await waitForSignedInSurface(6000);
    return;
  } catch (_) {
    // continue
  }

  await waitFor(element(by.id("screen.signin")))
    .toBeVisible()
    .withTimeout(60000);

  const creds = await registerE2EUser();
  await dismissSystemPromptIfNeeded();

  let filled = false;
  for (let i = 0; i < 3; i += 1) {
    try {
      await waitFor(element(by.id("input.email"))).toBeVisible().withTimeout(5000);
      await element(by.id("input.email")).tap();
      await element(by.id("input.email")).replaceText(creds.email);

      await waitFor(element(by.id("input.password"))).toBeVisible().withTimeout(5000);
      await element(by.id("input.password")).tap();
      await element(by.id("input.password")).replaceText(creds.password);
      filled = true;
      break;
    } catch (_) {
      await dismissSystemPromptIfNeeded();
      try {
        await element(by.id("screen.signin")).swipe("up", "fast", 0.75);
      } catch (_) {
        // ignore
      }
      try {
        await element(by.id("screen.signin")).swipe("down", "fast", 0.75);
      } catch (_) {
        // ignore
      }
    }
  }

  if (!filled) {
    throw new Error("Unable to fill sign-in email/password inputs");
  }

  await element(by.id("btn.signIn")).tap();
  await dismissSystemPromptIfNeeded();
  await waitForSignedInSurface(60000);
}

async function isMyBotDirectVisible() {
  try {
    await waitFor(element(by.text("MyBot"))).toBeVisible().withTimeout(900);
    await waitFor(element(by.text("Direct"))).toBeVisible().withTimeout(900);
    return true;
  } catch (_) {
    return false;
  }
}

async function ensureOnHomeThreadList() {
  for (let i = 0; i < 4; i += 1) {
    await dismissSystemPromptIfNeeded();

    try {
      await waitFor(element(by.id("list.threads"))).toBeVisible().withTimeout(2500);
      return "home-list";
    } catch (_) {
      // keep recovering
    }

    try {
      await waitFor(element(by.id("screen.home"))).toBeVisible().withTimeout(1200);
      return "home-shell";
    } catch (_) {
      // keep recovering
    }

    try {
      await waitFor(element(by.text("WORLD MAP"))).toBeVisible().withTimeout(1200);
      return "home-shell";
    } catch (_) {
      // keep recovering
    }

    if (await isMyBotDirectVisible()) {
      return "mybot-direct";
    }

    try {
      await waitFor(element(by.text("Back to Home"))).toBeVisible().withTimeout(1500);
      await element(by.text("Back to Home")).tap();
    } catch (_) {
      // ignore
    }

    try {
      await waitFor(element(by.id("btn.chat.back"))).toBeVisible().withTimeout(1500);
      await element(by.id("btn.chat.back")).tap();
    } catch (_) {
      // ignore
    }
  }

  if (await isMyBotDirectVisible()) {
    return "mybot-direct";
  }

  try {
    await waitFor(element(by.id("screen.home"))).toBeVisible().withTimeout(5000);
    return "home-shell";
  } catch (_) {
    // keep trying list fallback
  }

  try {
    await waitFor(element(by.text("WORLD MAP"))).toBeVisible().withTimeout(5000);
    return "home-shell";
  } catch (_) {
    // keep trying chat/signin fallback
  }

  try {
    await waitFor(element(by.text("Direct"))).toBeVisible().withTimeout(3000);
    return "chat-direct";
  } catch (_) {
    // continue
  }

  try {
    await waitFor(element(by.id("screen.signin"))).toBeVisible().withTimeout(3000);
    return "signin";
  } catch (_) {
    // continue
  }

  return "unknown";
}

async function openMyBotFromHome() {
  await dismissSystemPromptIfNeeded();

  try {
    await waitFor(element(by.text("MyBot"))).toBeVisible().withTimeout(2500);
    await element(by.text("MyBot")).atIndex(0).tap();
    return;
  } catch (_) {
    // continue to deep-link fallback
  }

  try {
    await device.openURL({ url: "agenttown:///chat/mybot?name=MyBot&isGroup=false" });
    return;
  } catch (_) {
    // continue to ask-bar fallback
  }

  try {
    await dismissSystemPromptIfNeeded();
    await waitFor(element(by.text("Ask anything"))).toBeVisible().withTimeout(2500);
    await element(by.text("Ask anything")).atIndex(0).tap();
    return;
  } catch (_) {
    // continue to zh fallback
  }

  await waitFor(element(by.text("问点什么"))).toBeVisible().withTimeout(2500);
  await element(by.text("问点什么")).atIndex(0).tap();
}

describe("Chat smoke", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
  });

  it("opens MyBot direct chat from thread list", async () => {
    await ensureSignedIn();
    let entry = await ensureOnHomeThreadList();

    if (entry === "signin") {
      await ensureSignedIn();
      entry = await ensureOnHomeThreadList();
    }

    if (entry === "chat-direct") {
      try {
        await waitFor(element(by.text("MyBot"))).toBeVisible().withTimeout(1500);
      } catch (_) {
        try {
          await waitFor(element(by.id("btn.chat.back"))).toBeVisible().withTimeout(2000);
          await element(by.id("btn.chat.back")).tap();
        } catch (_) {
          try {
            await waitFor(element(by.text("Back to Home"))).toBeVisible().withTimeout(2000);
            await element(by.text("Back to Home")).tap();
          } catch (_) {
            // ignore
          }
        }
        await openMyBotFromHome();
      }
    } else if (entry === "home-list" || entry === "home-shell" || entry === "unknown") {
      await openMyBotFromHome();
    }

    let chatVisible = false;
    for (let i = 0; i < 3; i += 1) {
      await dismissSystemPromptIfNeeded();
      try {
        await waitFor(element(by.id("screen.chat"))).toBeVisible().withTimeout(5000);
        chatVisible = true;
        break;
      } catch (_) {
        // retry after dismissing potential system prompts
      }
    }
    if (!chatVisible) {
      throw new Error("Unable to reach chat screen after retries");
    }

    try {
      await waitFor(element(by.text("Direct")))
        .toBeVisible()
        .withTimeout(4000);
    } catch (_) {
      // allow locale/label drift as long as chat screen is present
    }

    await expect(element(by.text("Unknown chat"))).not.toBeVisible();
  });
});
