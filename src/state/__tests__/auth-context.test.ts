import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";

import {
  AUTH_ERROR_PHONE_INVALID,
  defaultDisplayNameForApple,
  defaultDisplayNameForEmail,
  displayNameFromEmail,
  normalizePhone,
} from "../auth-context";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

describe("auth-context helpers", () => {
  it("normalizes phone values by stripping separators", () => {
    expect(normalizePhone(" +86 138-0013-8000 ")).toBe("+8613800138000");
    expect(normalizePhone("(650) 555 1000")).toBe("6505551000");
  });

  it("throws when phone is too short", () => {
    expect(() => normalizePhone("1234")).toThrow(AUTH_ERROR_PHONE_INVALID);
  });

  it("extracts display name from email", () => {
    expect(displayNameFromEmail("jason@biceek.com")).toBe("jason");
    expect(displayNameFromEmail(undefined)).toBeNull();
  });

  it("falls back to Member when deriving default register display name", () => {
    expect(defaultDisplayNameForEmail("  lucy@example.com ")).toBe("lucy");
    expect(defaultDisplayNameForEmail("")).toBe("Member");
    expect(defaultDisplayNameForEmail("@example.com")).toBe("Member");
  });

  it("derives Apple display name from name, email, then provider id suffix", () => {
    expect(
      defaultDisplayNameForApple({
        id: "000000000123456",
        name: "  Alice  ",
        email: "alice@example.com",
      })
    ).toBe("Alice");

    expect(
      defaultDisplayNameForApple({
        id: "000000000123456",
        name: " ",
        email: "bob@example.com",
      })
    ).toBe("bob");

    expect(
      defaultDisplayNameForApple({
        id: "000000000123456",
        name: null,
        email: null,
      })
    ).toBe("Apple User 123456");
  });
});
