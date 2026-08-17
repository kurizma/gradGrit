import type { Env } from "./types";
import { json, getCorsHeaders } from "./lib/http";
import {
  handleOwnerLogin,
  handleOwnerLogout,
  handleOwnerCheck,
  handleGetAdminMessages,
  handleModerateMessage,
  handleGetAttachment,
} from "./routes/admin";
import {
  handleGetPublicMessages,
  handlePostMessage,
} from "./routes/messages";


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);


    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request),
      });
    }


    if (url.pathname === "/health" && request.method === "GET") {
      return json(request, { status: "ok" });
    }


    if (url.pathname === "/admin/login") {
      return handleOwnerLogin(request, env);
    }


    if (url.pathname === "/admin/logout") {
      return handleOwnerLogout(request);
    }


    if (url.pathname === "/admin/check") {
      return handleOwnerCheck(request, env);
    }


    if (url.pathname === "/admin/messages") {
      return handleGetAdminMessages(request, env);
    }


    if (url.pathname.startsWith("/admin/messages/") && request.method === "PATCH") {
      return handleModerateMessage(request, env);
    }


    if (url.pathname.startsWith("/attachments/") && request.method === "GET") {
      return handleGetAttachment(request, env);
    }


    // Public messages endpoints
    if (url.pathname === "/messages" && request.method === "GET") {
      return handleGetPublicMessages(request, env);
    }


    if (url.pathname === "/messages" && request.method === "POST") {
      return handlePostMessage(request, env);
    }


    return json(
      request,
      { error: "Not found" },
      404
    );
  },
};