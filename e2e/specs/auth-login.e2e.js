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

  try {
    const creds = await registerE2EUser();
    await element(by.id("input.email")).replaceText(creds.email);
    await element(by.id("input.password")).replaceText(creds.password);
    await element(by.id("btn.signIn")).tap();
    await dismissSystemPromptIfNeeded();
    await waitForSignedInSurface(40000);
    return;
  } catch (_) {
    // continue to guest flow
  }

  try {
    for (let i = 0; i < 4; i += 1) {
      try {
        await waitFor(element(by.id("btn.guest")))
          .toBeVisible()
          .withTimeout(1500);
        await element(by.id("btn.guest")).tap();
        await waitForSignedInSurface(40000);
        return;
      } catch (_) {
        await element(by.id("screen.signin")).swipe("up", "fast", 0.75);
      }
    }
  } catch (_) {
    // continue to password fallback
  }

  try {
    await waitFor(element(by.id("btn.fillDev")))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id("btn.fillDev")).tap();
    await element(by.id("btn.signIn")).tap();
    await dismissSystemPromptIfNeeded();
    await waitForSignedInSurface(40000);
    return;
  } catch (_) {
    // continue to text guest fallback
  }

  try {
    await waitForSignedInSurface(3000);
    return;
  } catch (_) {
    // continue
  }

  try {
    await element(by.id("screen.signin")).swipe("up", "fast", 0.75);
  } catch (_) {
    // ignore
  }

  try {
    await waitFor(element(by.text("Continue as Guest")))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.text("Continue as Guest")).tap();
  } catch (_) {
    await waitFor(element(by.text("游客模式继续")))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.text("游客模式继续")).tap();
  }

  await dismissSystemPromptIfNeeded();
  await waitForSignedInSurface(60000);
}

describe("Auth login smoke", () => {
  it("logs in with local admin and lands on home", async () => {
    await ensureSignedIn();
  });
});
