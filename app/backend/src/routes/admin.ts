import { json } from "../lib/http";
import {
  clearOwnerSessionCookie,
  createOwnerSessionCookie,
  verifyOwnerSession,
} from "../lib/session";
import type { Env } from "../types";

export async function handleOwnerLogin(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "POST") {
    return json(
      request,
      { error: "Method not allowed." },
      405
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json(
      request,
      { error: "Invalid JSON request." },
      400
    );
  }

  const password =
    body &&
    typeof body === "object" &&
    "password" in body &&
    typeof body.password === "string"
      ? body.password.trim()
      : "";

  if (!password) {
    return json(
      request,
      { error: "Password is required." },
      400
    );
  }

  if (password !== env.OWNER_PASSWORD) {
    return json(
      request,
      { error: "Invalid credentials." },
      401
    );
  }

  const setCookie = await createOwnerSessionCookie(env);

  return json(
    request,
    { success: true },
    200,
    { "Set-Cookie": setCookie }
  );
}

export async function handleOwnerLogout(
  request: Request
): Promise<Response> {
  if (request.method !== "POST") {
    return json(
      request,
      { error: "Method not allowed." },
      405
    );
  }

  return json(
    request,
    { success: true },
    200,
    { "Set-Cookie": clearOwnerSessionCookie() }
  );
}

export async function handleOwnerCheck(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "GET") {
    return json(
      request,
      { error: "Method not allowed." },
      405
    );
  }

  const authenticated = await verifyOwnerSession(
    request,
    env
  );

  if (!authenticated) {
    return json(
      request,
      { authenticated: false },
      401
    );
  }

  return json(
    request,
    { authenticated: true },
    200
  );
}