export type ProfileAvatarSource = "library" | "camera";

export interface ProfileAvatarAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

export function inferProfileAvatarMimeType(fileName?: string | null, fallbackMimeType?: string | null) {
  const safeFallback = (fallbackMimeType || "").trim();
  if (safeFallback) return safeFallback;

  const lowerName = (fileName || "").trim().toLowerCase();
  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".webp")) return "image/webp";
  if (lowerName.endsWith(".gif")) return "image/gif";
  if (lowerName.endsWith(".heic")) return "image/heic";
  if (lowerName.endsWith(".heif")) return "image/heif";
  return "image/jpeg";
}

export function buildProfileAvatarUploadInput(
  asset: ProfileAvatarAsset,
  source: ProfileAvatarSource,
  now = Date.now()
) {
  return {
    uri: asset.uri,
    name: (asset.fileName || "").trim() || `profile-avatar-${source}-${now}.jpg`,
    mimeType: inferProfileAvatarMimeType(asset.fileName, asset.mimeType),
  };
}
