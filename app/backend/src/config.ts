export const SESSION_COOKIE_NAME = "owner_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export const MAX_NAME_LENGTH = 50;
export const MAX_MESSAGE_LENGTH = 500;
export const COOLDOWN_SECONDS = 60;

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const MAX_AUDIO_SIZE = 15 * 1024 * 1024;
export const MAX_VIDEO_SIZE = 25 * 1024 * 1024;

export const BANNED_WORDS = [
  "viagra",
  "casino",
  "crypto giveaway",
  "free money",
  "loan",
  "http://",
  "https://",
];

export const ALLOWED_ORIGINS = [
  "https://gradgrit.kurizmatic.workers.dev",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
];