module.exports = {
  testTimeout: 120000,
  maxWorkers: 1,
  testMatch: ["**/*.e2e.js"],
  globalSetup: "detox/runners/jest/globalSetup",
  globalTeardown: "detox/runners/jest/globalTeardown",
  testEnvironment: "detox/runners/jest/testEnvironment",
  reporters: ["detox/runners/jest/reporter"],
  verbose: true,
};
