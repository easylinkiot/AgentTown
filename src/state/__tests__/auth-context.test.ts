import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";

import { displayNameFromEmail, normalizePhone } from "../auth-context";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

describe("auth-context helpers", () => {
  it("normalizes phone values by stripping separators", () => {
    expect(normalizePhone(" +86 138-0013-8000 ")).toBe("+8613800138000");
    expect(normalizePhone("(650) 555 1000")).toBe("6505551000");
  });

  it("throws when phone is too short", () => {
    expect(() => normalizePhone("1234")).toThrow("请输入有效手机号");
  });

  it("extracts display name from email", () => {
    expect(displayNameFromEmail("jason@biceek.com")).toBe("jason");
    expect(displayNameFromEmail(undefined)).toBeNull();
  });
});
