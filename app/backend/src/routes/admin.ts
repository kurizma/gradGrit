import { getCorsHeaders, json } from "../lib/http";
import {
  clearOwnerSessionCookie,
  createOwnerSessionCookie,
  verifyOwnerSession,
} from "../lib/session";
import type { Env } from "../types";
import { createClient } from "@supabase/supabase-js";


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

export async function handleGetAdminMessages(
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

  const authenticated = await verifyOwnerSession(request, env);
  if (!authenticated) {
    return json(
      request,
      { error: "Unauthorized" },
      401
    );
  }

  try {
    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch all messages with attachment metadata (approved and hidden)
    const { data: messages, error } = await supabase
      .from("messages")
      .select(`
        *,
        message_attachments (
          id,
          original_name,
          mime_type,
          file_size,
          object_key
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch admin messages:", error);
      return json(
        request,
        { error: "Failed to fetch messages" },
        500
      );
    }

    return json(
      request,
      { messages: messages || [] },
      200
    );
  } catch (err) {
    console.error("Error in /admin/messages:", err);
    return json(
      request,
      { error: "Internal server error" },
      500
    );
  }
}

export async function handleModerateMessage(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "PATCH") {
    return json(
      request,
      { error: "Method not allowed." },
      405
    );
  }

  // Verify admin session
  const authenticated = await verifyOwnerSession(request, env);
  if (!authenticated) {
    return json(
      request,
      { error: "Unauthorized" },
      401
    );
  }

  // Extract message ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // Path: /admin/messages/:id
  const messageId = pathParts[2];

  if (!messageId) {
    return json(
      request,
      { error: "Message ID required" },
      400
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(
      request,
      { error: "Invalid JSON request" },
      400
    );
  }

  // Validate approved field
  const approved =
    body &&
    typeof body === "object" &&
    "approved" in body &&
    typeof body.approved === "boolean"
      ? body.approved
      : null;

  if (approved === null) {
    return json(
      request,
      { error: "approved field (boolean) is required" },
      400
    );
  }

  try {
    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Update the message approval status
    const { data: updatedMessage, error } = await supabase
      .from("messages")
      .update({ approved })
      .eq("id", messageId)
      .select("id, name, message, approved, created_at")
      .single();

    if (error || !updatedMessage) {
      console.error("Failed to moderate message:", error);
      return json(
        request,
        { error: "Failed to update message" },
        500
      );
    }

    return json(
      request,
      { message: updatedMessage },
      200
    );
  } catch (err) {
    console.error("Error in /admin/messages/:id:", err);
    return json(
      request,
      { error: "Internal server error" },
      500
    );
  }
}

export async function handleGetAttachment(
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

  // Extract attachment ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // Path: /attachments/:id
  const attachmentId = pathParts[1];

  if (!attachmentId) {
    return json(
      request,
      { error: "Attachment ID required" },
      400
    );
  }

  try {
    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get attachment metadata
    const { data: attachment, error } = await supabase
      .from("message_attachments")
      .select(`
        id,
        message_id,
        object_key,
        mime_type,
        original_name,
        file_size,
        messages (
          approved
        )
      `)
      .eq("id", attachmentId)
      .single();

    if (error || !attachment) {
      console.error("Attachment not found:", error);
      return json(
        request,
        { error: "Attachment not found" },
        404
      );
    }

    // Check if parent message is approved (for public access)
    // For now, we allow access to all attachments
    // You can add approval check here later if needed

    // Get file from R2
    const object = await env.MY_BUCKET.get(attachment.object_key);

    if (!object || !object.body) {
      console.error("R2 object not found:", attachment.object_key);
      return json(
        request,
        { error: "File not found" },
        404
      );
    }

    // Set response headers
    const headers = getCorsHeaders(request);
    headers.set(
      "Content-Type",
      attachment.mime_type || object.httpMetadata?.contentType || "application/octet-stream"
    );
    headers.set(
      "Content-Disposition",
      `inline; filename="${(attachment.original_name || "attachment").replace(/"/g, "")}"`
    );
    headers.set("Cache-Control", "public, max-age=31536000");

    return new Response(object.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("Error in /attachments/:id:", err);
    return json(
      request,
      { error: "Internal server error" },
      500
    );
  }
}