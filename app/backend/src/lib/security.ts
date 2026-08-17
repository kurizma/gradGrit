import {
  BANNED_WORDS,
  MAX_AUDIO_SIZE,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
} from "../config";

export function getClientIp(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("X-Forwarded-For")?.split(",")[0].trim() ??
    "unknown"
  );
}

export function containsBannedContent(text: string): boolean {
  const normalizedText = text
    .normalize("NFKC")
    .toLowerCase();

  return BANNED_WORDS.some((word) =>
    normalizedText.includes(word.normalize("NFKC").toLowerCase())
  );
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 100);
}

export function getMaxFileSize(mimeType: string): number | null {
  if (mimeType.startsWith("image/")) return MAX_IMAGE_SIZE;
  if (mimeType.startsWith("audio/")) return MAX_AUDIO_SIZE;
  if (mimeType.startsWith("video/")) return MAX_VIDEO_SIZE;

  return null;
}

export function getFileSizeError(mimeType: string): string {
  if (mimeType.startsWith("image/")) {
    return "Image is too large. Max 10MB.";
  }

  if (mimeType.startsWith("audio/")) {
    return "Audio file is too large. Max 15MB.";
  }

  if (mimeType.startsWith("video/")) {
    return "Video file is too large. Max 25MB.";
  }

  return "Unsupported file type.";
}