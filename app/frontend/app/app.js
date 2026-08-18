// test

const API_BASE = "https://gradgrit-api.kurizmatic.workers.dev";

const messagesEl = document.getElementById("messages");
const form = document.getElementById("message-form");
const toggleBtn = document.getElementById("toggle-access-code");
const accessInput = document.getElementById("access_code");
const submitButton = document.getElementById("submit-button");
const formStatus = document.getElementById("form-status");

// Preview modal elements.
const previewModal = document.getElementById("preview-modal");
const previewName = document.getElementById("preview-name");
const previewMessage = document.getElementById("preview-message");
const previewMedia = document.getElementById("preview-media");
const editMessageButton = document.getElementById("edit-message");
const confirmMessageButton = document.getElementById("confirm-message");
const closePreviewButton = document.getElementById("close-preview");

// View modal elements (for clicking an approved message card).
const viewModal = document.getElementById("view-modal");
const viewName = document.getElementById("view-name");
const viewMessage = document.getElementById("view-message");
const viewMedia = document.getElementById("view-media");
const closeViewButton = document.getElementById("close-view");

const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024,
  audio: 15 * 1024 * 1024,
  video: 25 * 1024 * 1024,
};

// Holds the FormData that was validated and previewed, ready to submit on confirm.
let pendingFormData = null;

toggleBtn.addEventListener("click", () => {
  const shouldShow = accessInput.type === "password";

  accessInput.type = shouldShow ? "text" : "password";
  toggleBtn.textContent = shouldShow ? "Hide" : "Show";
  toggleBtn.setAttribute("aria-pressed", String(shouldShow));
});

function getFileCategory(file) {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";

  return null;
}

function validateFile(file) {
  if (!file || file.size === 0) {
    return null;
  }

  const category = getFileCategory(file);

  if (!category) {
    return "Please select an image, audio, or video file.";
  }

  if (file.size > MAX_FILE_SIZES[category]) {
    const maxSize = MAX_FILE_SIZES[category] / (1024 * 1024);

    return `The selected ${category} file is too large. Maximum size is ${maxSize} MB.`;
  }

  return null;
}

function createMessageElement(message) {
  const wrapper = document.createElement("div");
  const name = document.createElement("strong");
  const text = document.createElement("span");

  name.textContent = message.name || "Anonymous";
  text.textContent = `: ${message.message || ""}`;

  wrapper.append(name, text);

  wrapper.tabIndex = 0;
  wrapper.setAttribute("role", "button");
  wrapper.setAttribute(
    "aria-label",
    `View full message from ${message.name || "Anonymous"}`
  );

  wrapper.addEventListener("click", () => openViewModal(message));
  wrapper.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openViewModal(message);
    }
  });

  return wrapper;
}

function renderMediaInto(container, source) {
  container.replaceChildren();

  if (!source) {
    return;
  }

  let element;
  let src;
  let type;

  if (source instanceof File) {
    if (source.size === 0) return;
    src = URL.createObjectURL(source);
    type = source.type;
  } else if (typeof source === "string") {
    src = source;
    type = "";
  } else {
    return;
  }

  if (type.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(src)) {
    element = document.createElement("img");
    element.alt = "Message attachment";
  } else if (type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(src)) {
    element = document.createElement("video");
    element.controls = true;
  } else if (type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a)$/i.test(src)) {
    element = document.createElement("audio");
    element.controls = true;
  } else {
    return;
  }

  element.src = src;
  container.append(element);
}

function openViewModal(message) {
  viewName.textContent = message.name || "Anonymous";
  viewMessage.textContent = message.message || "";
  renderMediaInto(viewMedia, message.file_url || message.fileUrl || message.url || null);
  viewModal.showModal();
}

closeViewButton.addEventListener("click", () => viewModal.close());
viewModal.addEventListener("click", (event) => {
  if (event.target === viewModal) viewModal.close();
});

async function loadMessages() {
  messagesEl.textContent = "Loading messages...";

  try {
    const response = await fetch(`${API_BASE}/messages`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to load messages");
    }

    messagesEl.replaceChildren();

    if (!Array.isArray(result) || result.length === 0) {
      messagesEl.textContent = "No messages yet.";
      return;
    }

    for (const message of result) {
      messagesEl.appendChild(createMessageElement(message));
    }
  } catch (error) {
    console.error(error);
    messagesEl.textContent = "Unable to load messages.";
  }
}

// Step 1: form submit validates and opens the preview modal instead of sending immediately.
form.addEventListener("submit", (event) => {
  event.preventDefault();

  formStatus.textContent = "";
  delete formStatus.dataset.status;

  const formData = new FormData(form);
  const file = formData.get("file");

  if (file instanceof File) {
    const fileError = validateFile(file);

    if (fileError) {
      formStatus.dataset.status = "error";
      formStatus.textContent = fileError;
      return;
    }

    if (file.size === 0) {
      formData.delete("file");
    }
  }

  pendingFormData = formData;

  previewName.textContent = formData.get("name");
  previewMessage.textContent = formData.get("message");
  renderMediaInto(previewMedia, formData.get("file"));

  previewModal.showModal();
});

// Step 2a: user wants to change something — close preview, keep their input intact.
editMessageButton.addEventListener("click", () => {
  previewModal.close();
  document.getElementById("name").focus();
});

closePreviewButton.addEventListener("click", () => {
  previewModal.close();
});

previewModal.addEventListener("click", (event) => {
  if (event.target === previewModal) {
    previewModal.close();
  }
});

// Step 2b: user confirms — this is the only path that actually calls the API.
confirmMessageButton.addEventListener("click", async () => {
  if (!pendingFormData) return;

  confirmMessageButton.disabled = true;
  editMessageButton.disabled = true;
  confirmMessageButton.textContent = "Sending...";

  try {
    const response = await fetch(`${API_BASE}/messages`, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: pendingFormData,
    });

    const result = await response.json();

    if (!response.ok) {
      previewModal.close();
      formStatus.dataset.status = "error";
      formStatus.textContent = result.error || "Failed to send message.";
      return;
    }

    // previewModal.close();
    // form.reset();
    pendingFormData = null;
    window.location.href = "/messages";

    // formStatus.dataset.status = "success";
    // formStatus.textContent = "Message submitted. It will appear after approval.";

    // await loadMessages();
  } catch (error) {
    console.error(error);
    previewModal.close();
    formStatus.dataset.status = "error";
    formStatus.textContent = "Unable to contact the server. Please try again.";
  } finally {
    confirmMessageButton.disabled = false;
    editMessageButton.disabled = false;
    confirmMessageButton.textContent = "Confirm and send";
  }
});

// loadMessages();