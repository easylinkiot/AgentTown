/** @type {Detox.DetoxConfig} */
module.exports = {
  session: {
    autoStart: true,
  },
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
    "ios.release": {
      type: "ios.app",
      binaryPath: "ios/build/Build/Products/Release-iphonesimulator/AgentTown.app",
      build:
        "xcodebuild -workspace ios/AgentTown.xcworkspace -scheme AgentTown -configuration Release -sdk iphonesimulator -derivedDataPath ios/build",
    },
    "android.release": {
      type: "android.apk",
      binaryPath: "android/app/build/outputs/apk/release/app-release.apk",
      testBinaryPath:
        "android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk",
      build:
        "export JAVA_HOME='/Applications/Android Studio.app/Contents/jbr/Contents/Home' && export NODE_BINARY=\"${NODE_BINARY:-$(command -v node || echo node)}\" && export PATH=\"$JAVA_HOME/bin:$(dirname \"$NODE_BINARY\"):$PATH\" && cd android && ./gradlew --stop && ./gradlew --no-daemon assembleRelease assembleAndroidTest -DtestBuildType=release",
    },
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: {
        type: "iPhone 17",
      },
    },
    androidAttached: {
      type: "android.attached",
      device: {
        adbName: "emulator-5554",
      },
    },
  },
  configurations: {
    "ios.sim.release": {
      device: "simulator",
      app: "ios.release",
    },
    "android.attached.release": {
      device: "androidAttached",
      app: "android.release",
    },
  },
};
