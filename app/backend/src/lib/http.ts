import { ALLOWED_ORIGINS } from "../config";

export function getCorsHeaders(request: Request) {
  const origin = request.headers.get("Origin");

  const headers = new Headers({
    "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  });

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  return headers;
}

export function json(
  request: Request,
  data: unknown,
  status = 200,
  extraHeaders?: HeadersInit
) : Response {
  
  const headers = getCorsHeaders(request);

  if (extraHeaders) {
    const extra = new Headers(extraHeaders);
    extra.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        headers.append(key, value);
      } else {
        headers.set(key, value);
      }
    });
  }

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}