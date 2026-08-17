import { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "../config";
import type { Env } from "../types";

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signValue(value: string, secret: string) {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );
  return toBase64Url(new Uint8Array(signature));
}

function parseCookies(request: Request) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const entries = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  const cookies: Record<string, string> = {};

  for (const entry of entries) {
    const eqIndex = entry.indexOf("=");
    if (eqIndex === -1) continue;
    const key = entry.slice(0, eqIndex).trim();
    const value = entry.slice(eqIndex + 1).trim();
    cookies[key] = value;
  }

  return cookies;
}

export async function createOwnerSessionCookie(env: Env) {
  const payload = JSON.stringify({
    role: "owner",
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  });

  const payloadB64 = toBase64Url(new TextEncoder().encode(payload));
  const signature = await signValue(payloadB64, env.OWNER_SESSION_SECRET);
  const cookieValue = `${payloadB64}.${signature}`;

  return `${SESSION_COOKIE_NAME}=${cookieValue}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; Secure; SameSite=None`;
}

export async function verifyOwnerSession(request: Request, env: Env) {
  const cookies = parseCookies(request);
  const raw = cookies[SESSION_COOKIE_NAME];
  if (!raw) return false;

  const parts = raw.split(".");
  if (parts.length !== 2) return false;

  const [payloadB64, signature] = parts;
  const expectedSignature = await signValue(payloadB64, env.OWNER_SESSION_SECRET);

  if (signature !== expectedSignature) return false;

  try {
    const payloadText = new TextDecoder().decode(fromBase64Url(payloadB64));
    const payload = JSON.parse(payloadText) as { role?: string; exp?: number };

    if (payload.role !== "owner") return false;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return false;

    return true;
  } catch {
    return false;
  }
}

export function clearOwnerSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None`;
}