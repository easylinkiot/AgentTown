module.exports = {
  testTimeout: 120000,
  maxWorkers: 1,
  testMatch: ["**/*.e2e.js"],
  globalSetup: "detox/runners/jest/globalSetup",
  globalTeardown: "detox/runners/jest/globalTeardown",
  testEnvironment: "detox/runners/jest/testEnvironment",
  reporters: [
    "detox/runners/jest/reporter",
    [
      "jest-junit",
      {
        outputDirectory: "reports/e2e/detox",
        outputName: "junit.xml",
        addFileAttribute: "true",
      },
    ],
    [
      "jest-html-reporters",
      {
        publicPath: "reports/e2e/detox",
        filename: "report.html",
        expand: true,
        openReport: false,
        pageTitle: "Detox E2E Report",
      },
    ],
  ],
  verbose: true,
};
