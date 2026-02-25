module.exports = {
  rootDir: "..",
  testMatch: ["<rootDir>/e2e/specs/**/*.e2e.js"],
  testTimeout: 120000,
  maxWorkers: 1,
  testRunner: "jest-circus/runner",
  testEnvironment: "detox/runners/jest/testEnvironment",
  reporters: ["detox/runners/jest/reporter"],
  globalSetup: "detox/runners/jest/globalSetup",
  globalTeardown: "detox/runners/jest/globalTeardown",
  setupFilesAfterEnv: ["<rootDir>/e2e/init.js"],
  verbose: true,
};
