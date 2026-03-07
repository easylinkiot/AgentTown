/* global afterEach, expect, device */
const path = require("node:path");

const RUN_TAG = String(process.env.E2E_RUN_TAG || Date.now());
let screenshotCounter = 0;

function slugify(input) {
  return String(input || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

afterEach(async () => {
  if (!device || typeof device.takeScreenshot !== "function") return;

  const state = typeof expect?.getState === "function" ? expect.getState() : {};
  const testName = slugify(state?.currentTestName || "unnamed-test");
  const testFile = slugify(path.basename(String(state?.testPath || "e2e"), ".e2e.js"));
  const index = String(screenshotCounter).padStart(3, "0");
  screenshotCounter += 1;
  const screenshotName = `${testFile}-${testName}-${RUN_TAG}-${index}`;

  try {
    await device.takeScreenshot(screenshotName);
  } catch (error) {
    // Keep evidence capture best-effort; do not fail test execution on screenshot errors.
    // eslint-disable-next-line no-console
    console.warn(`[e2e] screenshot capture skipped for ${screenshotName}: ${String(error?.message || error)}`);
  }
});
