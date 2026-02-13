const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    files: ["**/__tests__/**/*.[jt]s?(x)", "**/*.{spec,test}.[jt]s?(x)"],
    languageOptions: {
      globals: {
        describe: "readonly",
        expect: "readonly",
        it: "readonly",
        jest: "readonly",
      },
    },
  },
  {
    ignores: ["dist/**", "web-build/**"],
  },
];
