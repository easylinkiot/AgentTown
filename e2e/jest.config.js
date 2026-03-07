const reporters = ["detox/runners/jest/reporter"];

try {
  require.resolve("jest-junit");
  reporters.push([
    "jest-junit",
    {
      outputDirectory: "reports/e2e/detox",
      outputName: "junit.xml",
      addFileAttribute: "true",
    },
  ]);
} catch {
  // Optional local reporter.
}

try {
  require.resolve("jest-html-reporters");
  reporters.push([
    "jest-html-reporters",
    {
      publicPath: "reports/e2e/detox",
      filename: "report.html",
      expand: true,
      openReport: false,
      pageTitle: "Detox E2E Report",
    },
  ]);
} catch {
  // Optional local reporter.
}

module.exports = {
  testTimeout: 120000,
  maxWorkers: 1,
  testMatch: ["**/*.e2e.js"],
  globalSetup: "detox/runners/jest/globalSetup",
  globalTeardown: "detox/runners/jest/globalTeardown",
  testEnvironment: "detox/runners/jest/testEnvironment",
  reporters,
  verbose: true,
};
