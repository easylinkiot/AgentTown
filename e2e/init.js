const { device } = require("detox");

jest.setTimeout(120000);
const DETOX_DEV_SERVER_URL = process.env.DETOX_DEV_SERVER_URL || "exp://127.0.0.1:8081";

beforeAll(async () => {
  await device.launchApp({
    newInstance: true,
    delete: true,
    permissions: { notifications: "YES" },
    launchArgs: { detoxEnableSynchronization: 0 },
    url: DETOX_DEV_SERVER_URL,
  });
  await device.disableSynchronization();
});

afterAll(async () => {
  await device.terminateApp();
});
