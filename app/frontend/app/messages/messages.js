const API_BASE = "https://gradgrit-api.kurizmatic.workers.dev";

let lightboxLastTrigger = null;

function getStatusElement() {
  return document.getElementById("preview-status");
}

function getLoadingElement() {
  return document.getElementById("preview-loading");
}

function getEmptyElement() {
  return document.getElementById("preview-empty");
}

function getGalleryElement() {
  return document.getElementById("messages-gallery");
}

function getApprovedCountElement() {
  return document.getElementById("approved-count");
}

function getGalleryColumns() {
  return [
    document.getElementById("gallery-column-1"),
    document.getElementById("gallery-column-2"),
    document.getElementById("gallery-column-3"),
  ].filter(Boolean);
}

function getLightboxElement() {
  return document.getElementById("image-lightbox");
}

function getLightboxImageElement() {
  return document.getElementById("lightbox-image");
}

function getLightboxCloseButton() {
  return document.getElementById("lightbox-close");
}

function setStatus(message) {
  const element = getStatusElement();
  if (!element) return;
  const text = typeof message === "string" ? message.trim() : "";
  element.textContent = text;
  element.hidden = text.length === 0;
}

function setApprovedCount(count) {
  const element = getApprovedCountElement();
  if (!element) return;
  const safeCount = Number.isFinite(count) ? count : 0;
  element.textContent = `${safeCount} message${safeCount === 1 ? "" : "s"}`;
}

function setLoadingState(isLoading) {
  const loading = getLoadingElement();
  if (loading) {
    loading.hidden = !isLoading;
  }
}

function showEmptyState(show) {
  const empty = getEmptyElement();
  const gallery = getGalleryElement();
  if (empty) {
    empty.hidden = !show;
  }
  if (gallery) {
    gallery.hidden = show;
  }
}

function clearGallery() {
  for (const column of getGalleryColumns()) {
    column.innerHTML = "";
  }
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getPublicAttachmentUrl(messageId, attachmentId) {
  return `${API_BASE}/attachments/${attachmentId}`;
}

function openLightbox(src, alt, trigger = null) {
  const lightbox = getLightboxElement();
  const image = getLightboxImageElement();
  const closeButton = getLightboxCloseButton();

  if (!(lightbox instanceof HTMLDialogElement) || !image) {
    console.error("Lightbox dialog or image element was not found.");
    return;
  }

  image.src = src;
  image.alt = alt || "";
  lightboxLastTrigger = trigger;

  if (!lightbox.open) {
    lightbox.showModal();
  }

  if (closeButton instanceof HTMLButtonElement) {
    closeButton.focus();
  }
}

function closeLightbox() {
  const lightbox = getLightboxElement();
  const image = getLightboxImageElement();

  if (!(lightbox instanceof HTMLDialogElement) || !image) {
    return;
  }

  if (lightbox.open) {
    lightbox.close();
  }

  image.src = "";
  image.alt = "";

  if (lightboxLastTrigger instanceof HTMLElement) {
    lightboxLastTrigger.focus();
  }

  lightboxLastTrigger = null;
}

function createMediaElement(messageId, attachment, urlBuilder = getPublicAttachmentUrl) {
  const mimeType = attachment?.mime_type || "";
  const url = urlBuilder(messageId, attachment.id);
  const name = attachment?.original_name || "Attachment";

  if (mimeType.startsWith("image/")) {
    const wrapper = document.createElement("button");
    wrapper.type = "button";
    wrapper.className = "preview-media is-clickable";
    wrapper.setAttribute("aria-label", `Open larger image: ${name}`);

    const img = document.createElement("img");
    img.src = url;
    img.alt = name;
    img.loading = "lazy";

    wrapper.addEventListener("click", () => {
      openLightbox(url, name, wrapper);
    });

    wrapper.appendChild(img);
    return wrapper;
  }

  if (mimeType.startsWith("video/")) {
    const wrapper = document.createElement("div");
    wrapper.className = "preview-media";

    const video = document.createElement("video");
    video.src = url;
    video.controls = true;
    video.preload = "metadata";

    wrapper.appendChild(video);
    return wrapper;
  }

  if (mimeType.startsWith("audio/")) {
    const audio = document.createElement("audio");
    audio.className = "preview-audio";
    audio.src = url;
    audio.controls = true;
    audio.preload = "metadata";
    return audio;
  }

  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.className = "preview-attachments-note";
  link.textContent = `Open ${name}`;
  return link;
}

function pickPrimaryAttachment(attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return null;
  }

  const image = attachments.find((item) => item?.mime_type?.startsWith("image/"));
  if (image) return image;

  const video = attachments.find((item) => item?.mime_type?.startsWith("video/"));
  if (video) return video;

  const audio = attachments.find((item) => item?.mime_type?.startsWith("audio/"));
  if (audio) return audio;

  return attachments[0];
}

function createMessageCard(message, index, options = {}) {
  const includeAttachments = options.includeAttachments !== false;
  const urlBuilder = options.urlBuilder || getPublicAttachmentUrl;

  const card = document.createElement("article");
  card.className = "preview-card";
  card.style.transitionDelay = `${Math.min(index * 70, 560)}ms`;

  const name = document.createElement("p");
  name.className = "preview-card-eyebrow";
  name.textContent = message.name?.trim() || "Anonymous";

  const text = document.createElement("p");
  text.className = "preview-card-text";
  text.textContent = message.message?.trim() || "(No message text)";

  card.append(name, text);

  const metaText = formatDate(message.created_at);

  if (metaText) {
    const meta = document.createElement("p");
    meta.className = "preview-card-meta";
    meta.textContent = metaText;
    card.appendChild(meta);
  }

  if (includeAttachments) {
    const attachments = Array.isArray(message.message_attachments)
      ? message.message_attachments
      : [];

    const primaryAttachment = pickPrimaryAttachment(attachments);

    if (primaryAttachment) {
      card.appendChild(
        createMediaElement(
          message.id,
          primaryAttachment,
          urlBuilder
        )
      );
    }

    if (attachments.length > 1) {
      const more = document.createElement("p");
      more.className = "preview-attachments-note";
      more.textContent = `+${attachments.length - 1} more attachment${
        attachments.length - 1 === 1 ? "" : "s"
      }`;
      card.appendChild(more);
    }
  }

  queueReveal(card);
  return card;
}

function distributeMessages(messages) {
  const columns = getGalleryColumns();
  if (columns.length === 0) return;

  clearGallery();

  messages.forEach((message, index) => {
    const shortestColumn = columns.reduce((shortest, column) =>
      column.offsetHeight < shortest.offsetHeight ? column : shortest
    );
    shortestColumn.appendChild(createMessageCard(message, index));
  });
}

function queueReveal(element) {
  if (!element) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      element.classList.add("is-visible");
    });
  });
}

async function loadMessages() {
  setLoadingState(true);
  showEmptyState(false);
  setStatus("Loading messages...");

  try {
    const response = await fetch(`${API_BASE}/messages`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await parseJsonSafe(response);

    if (!response.ok) {
      const errorMessage =
        data &&
        typeof data === "object" &&
        Object.hasOwn(data, "error") &&
        typeof data.error === "string"
          ? data.error
          : "Failed to load messages.";

      setStatus(errorMessage);
      setApprovedCount(0);
      clearGallery();
      showEmptyState(true);
      return;
    }

    const messages = Array.isArray(data)
      ? [...data].sort((a, b) => {
          const timeA = Number.isNaN(new Date(a?.created_at).getTime())
            ? 0
            : new Date(a.created_at).getTime();

          const timeB = Number.isNaN(new Date(b?.created_at).getTime())
            ? 0
            : new Date(b.created_at).getTime();

          return timeB - timeA;
        })
      : [];

    setApprovedCount(messages.length);

    if (messages.length === 0) {
      clearGallery();
      showEmptyState(true);
      setStatus("No messages yet.");
      return;
    }

    distributeMessages(messages);
    
    if (typeof renderFeaturedCarousel === "function") {
      renderFeaturedCarousel(messages.slice(0, 8));
    } else {
      console.warn("Carousel unavailable: carousel.js did not load.");
    }

    const gallery = getGalleryElement();
    if (gallery) {
      gallery.hidden = false;
    }

    const empty = getEmptyElement();
    if (empty) {
      empty.hidden = true;
    }

    setStatus("");
  } catch (error){
    console.error("Failed to load or render messages:", error);
    setStatus("Unable to display messages. Please try again.");
    setApprovedCount(0);
    clearGallery();
    showEmptyState(true);
  } finally {
    setLoadingState(false);
  }
}

function initLightbox() {
  const lightbox = getLightboxElement();
  const closeButton = getLightboxCloseButton();

  if (!(lightbox instanceof HTMLDialogElement)) {
    console.error("Expected #image-lightbox to be a <dialog>.");
    return;
  }

  closeButton?.addEventListener("click", closeLightbox);

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  lightbox.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeLightbox();
  });
}

async function initApp() {
  initLightbox();
  await loadMessages();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void initApp();
  });
} else {
  void initApp();
}