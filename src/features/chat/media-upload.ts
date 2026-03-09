import * as ImageManipulator from "expo-image-manipulator";

export type UploadableMediaAsset = {
  type: "image" | "video";
  uri: string;
  filename?: string;
};

export function inferMediaMimeType(asset: UploadableMediaAsset) {
  const lowerName = (asset.filename || "").trim().toLowerCase();
  const ext = lowerName.includes(".") ? lowerName.split(".").pop() || "" : "";
  if (asset.type === "video") {
    if (ext === "mov") return "video/quicktime";
    if (ext === "webm") return "video/webm";
    if (ext === "mkv") return "video/x-matroska";
    return "video/mp4";
  }
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

export function inferUploadFilename(asset: UploadableMediaAsset, index: number) {
  const safe = (asset.filename || "").trim();
  if (safe) return safe;
  const fromUri = decodeURIComponent((asset.uri || "").split("/").pop() || "").split("?")[0].trim();
  if (fromUri && fromUri.includes(".")) return fromUri;
  const suffix = asset.type === "video" ? "mp4" : "jpg";
  return `${asset.type}_${Date.now()}_${index + 1}.${suffix}`;
}

function normalizeHeicFilename(name: string) {
  return name.replace(/\.(heic|heif)$/i, ".jpg");
}

export async function normalizeMediaAssetForUpload(asset: UploadableMediaAsset, index: number) {
  let filename = inferUploadFilename(asset, index);
  let mimeType = inferMediaMimeType({ ...asset, filename });
  let uri = asset.uri;

  if (asset.type === "image" && mimeType === "image/heic") {
    const converted = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 0.92,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    uri = converted.uri;
    filename = normalizeHeicFilename(filename);
    mimeType = "image/jpeg";
  }

  return {
    uri,
    filename,
    mimeType,
  };
}
