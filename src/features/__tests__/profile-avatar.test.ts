import {
  buildProfileAvatarUploadInput,
  inferProfileAvatarMimeType,
} from "../profile-avatar";

describe("profile avatar helpers", () => {
  it("prefers provided mime type when building upload input", () => {
    const result = buildProfileAvatarUploadInput(
      {
        uri: "file:///tmp/avatar.heic",
        fileName: "avatar.heic",
        mimeType: "image/custom",
      },
      "camera",
      123
    );

    expect(result).toEqual({
      uri: "file:///tmp/avatar.heic",
      name: "avatar.heic",
      mimeType: "image/custom",
    });
  });

  it("falls back to a source-specific file name when the asset has no file name", () => {
    const result = buildProfileAvatarUploadInput(
      {
        uri: "file:///tmp/avatar",
      },
      "library",
      456
    );

    expect(result).toEqual({
      uri: "file:///tmp/avatar",
      name: "profile-avatar-library-456.jpg",
      mimeType: "image/jpeg",
    });
  });

  it("infers common avatar image mime types from file names", () => {
    expect(inferProfileAvatarMimeType("avatar.png")).toBe("image/png");
    expect(inferProfileAvatarMimeType("avatar.webp")).toBe("image/webp");
    expect(inferProfileAvatarMimeType("avatar.heif")).toBe("image/heif");
    expect(inferProfileAvatarMimeType("avatar.unknown")).toBe("image/jpeg");
  });
});
