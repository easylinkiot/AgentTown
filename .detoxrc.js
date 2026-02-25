const path = require("path");

const iosBinaryPath = path.join(
  process.env.HOME || "",
  "Library/Developer/Xcode/DerivedData/Build/Products/Release-iphonesimulator/AgentTown.app"
);

/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: "jest",
      config: "e2e/jest.config.js",
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    "ios.debug": {
      type: "ios.app",
      binaryPath: iosBinaryPath,
      build:
        "xcodebuild -workspace ios/AgentTown.xcworkspace -scheme AgentTown -configuration Release -sdk iphonesimulator",
    },
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: {
        type: "iPhone 17",
      },
    },
  },
  configurations: {
    "ios.sim.debug": {
      device: "simulator",
      app: "ios.debug",
    },
  },
};
