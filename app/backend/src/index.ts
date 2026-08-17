import { createClient } from "@supabase/supabase-js";
import type { Env } from "./types";
import { json, getCorsHeaders } from "./lib/http";
import {
  handleOwnerLogin,
  handleOwnerLogout,
  handleOwnerCheck,
} from "./routes/admin";
import {
  containsBannedContent,
  getClientIp,
  getFileSizeError,
  getMaxFileSize,
  sanitizeFilename,
} from "./lib/security";
import {
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
} from "./config";

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

    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    if (
      url.pathname === "/messages" &&
      request.method === "GET"
    ) {
      const { data, error } = await supabase
        .from("messages")
        .select("id, name, message, created_at")
        .eq("approved", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Failed to load messages:", error);

        return json(
          request,
          { error: "Failed to load messages" },
          500
        );
      }

      return json(request, data);
    }

    if (
      url.pathname === "/messages" &&
      request.method === "POST"
    ) {
      let formData: FormData;

      try {
        formData = await request.formData();
      } catch {
        return json(
          request,
          { error: "Invalid form data" },
          400
        );
      }

      const nameValue = formData.get("name");
      const messageValue = formData.get("message");
      const accessCodeValue = formData.get("access_code");
      const fileValue = formData.get("file");

      if (
        typeof nameValue !== "string" ||
        typeof messageValue !== "string" ||
        typeof accessCodeValue !== "string"
      ) {
        return json(
          request,
          { error: "Invalid form fields" },
          400
        );
      }

      if (accessCodeValue !== env.MSG_ACCESS_CODE) {
        return json(
          request,
          { error: "Invalid access code" },
          403
        );
      }

      const cleanName = nameValue.trim();
      const cleanMessage = messageValue.trim();

      if (
        cleanName.length === 0 ||
        cleanName.length > MAX_NAME_LENGTH
      ) {
        return json(
          request,
          { error: "Invalid name" },
          400
        );
      }

      if (
        cleanMessage.length === 0 ||
        cleanMessage.length > MAX_MESSAGE_LENGTH
      ) {
        return json(
          request,
          { error: "Invalid message" },
          400
        );
      }

      if (containsBannedContent(cleanMessage)) {
        return json(
          request,
          { error: "Message contains prohibited content" },
          400
        );
      }

      const file =
        fileValue instanceof File && fileValue.size > 0
          ? fileValue
          : null;

      let objectKey: string | null = null;
      let originalName: string | null = null;

      if (file) {
        const maxFileSize = getMaxFileSize(file.type);

        if (maxFileSize === null) {
          return json(
            request,
            { error: "Unsupported file type" },
            400
          );
        }

        if (file.size > maxFileSize) {
          return json(
            request,
            { error: getFileSizeError(file.type) },
            413
          );
        }

        originalName =
          sanitizeFilename(file.name) || "file";

        objectKey =
          `messages/${crypto.randomUUID()}-${originalName}`;

        try {
          await env.MY_BUCKET.put(
            objectKey,
            file.stream(),
            {
              httpMetadata: {
                contentType: file.type,
              },
            }
          );
        } catch (error) {
          console.error(
            "Failed to upload file to R2:",
            error
          );

          return json(
            request,
            { error: "Failed to upload file" },
            500
          );
        }
      }

      const { data: messageRow, error: messageError } =
        await supabase
          .from("messages")
          .insert({
            name: cleanName,
            message: cleanMessage,
            ip_address: getClientIp(request),
            approved: true,
          })
          .select("id, name, message, approved, created_at")
          .single();

      if (messageError || !messageRow) {
        console.error(
          "Failed to create message:",
          messageError
        );

        if (objectKey) {
          try {
            await env.MY_BUCKET.delete(objectKey);
          } catch (cleanupError) {
            console.error(
              "Failed to clean up R2 object:",
              cleanupError
            );
          }
        }

        return json(
          request,
          { error: "Failed to create message" },
          500
        );
      }

      if (file && objectKey && originalName) {
        const { error: attachmentError } = await supabase
          .from("message_attachments")
          .insert({
            message_id: messageRow.id,
            object_key: objectKey,
            mime_type: file.type || null,
            original_name: originalName,
            file_size: file.size,
          });

        if (attachmentError) {
          console.error(
            "Failed to create attachment:",
            attachmentError
          );

          const { error: deleteMessageError } =
            await supabase
              .from("messages")
              .delete()
              .eq("id", messageRow.id);

          if (deleteMessageError) {
            console.error(
              "Failed to delete orphaned message:",
              deleteMessageError
            );
          }

          try {
            await env.MY_BUCKET.delete(objectKey);
          } catch (cleanupError) {
            console.error(
              "Failed to clean up R2 object:",
              cleanupError
            );
          }

          return json(
            request,
            { error: "Failed to save attachment" },
            500
          );
        }
      }

      return json(request, messageRow, 201);
    }

    return json(
      request,
      { error: "Not found" },
      404
    );
  },
};