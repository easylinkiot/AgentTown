import * as ImageManipulator from "expo-image-manipulator";

import { normalizeMediaAssetForUpload } from "@/src/features/chat/media-upload";

jest.mock("expo-image-manipulator", () => ({
  SaveFormat: {
    JPEG: "jpeg",
  },
  manipulateAsync: jest.fn(async () => ({
    uri: "file:///tmp/converted-image.jpg",
  })),
}));

describe("normalizeMediaAssetForUpload", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("converts HEIC images to JPEG before upload", async () => {
    const result = await normalizeMediaAssetForUpload(
      {
        type: "image",
        uri: "file:///tmp/IMG_2251.HEIC",
        filename: "IMG_2251.HEIC",
      },
      0,
    );

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///tmp/IMG_2251.HEIC",
      [],
      {
        compress: 0.92,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
    expect(result).toEqual({
      uri: "file:///tmp/converted-image.jpg",
      filename: "IMG_2251.jpg",
      mimeType: "image/jpeg",
    });
  });

  it("leaves non-HEIC images untouched", async () => {
    const result = await normalizeMediaAssetForUpload(
      {
        type: "image",
        uri: "file:///tmp/cover.png",
        filename: "cover.png",
      },
      0,
    );

    expect(ImageManipulator.manipulateAsync).not.toHaveBeenCalled();
    expect(result).toEqual({
      uri: "file:///tmp/cover.png",
      filename: "cover.png",
      mimeType: "image/png",
    });
  });
});
