const API_BASE = "https://gradgrit-api.kurizmatic.workers.dev";

const messagesEl = document.getElementById("messages");
const form = document.getElementById("message-form");
const toggleBtn = document.getElementById("toggle-access-code");
const accessInput = document.getElementById("access_code");
const submitButton = document.getElementById("submit-button");
const formStatus = document.getElementById("form-status");

const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024,
  audio: 15 * 1024 * 1024,
  video: 25 * 1024 * 1024,
};

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

  return wrapper;
}

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

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  formStatus.textContent = "";
  submitButton.disabled = true;
  submitButton.textContent = "Sending...";

  try {
    const formData = new FormData(form);
    const file = formData.get("file");

    if (file instanceof File) {
      const fileError = validateFile(file);

      if (fileError) {
        formStatus.textContent = fileError;
        return;
      }

      if (file.size === 0) {
        formData.delete("file");
      }
    }

    const response = await fetch(`${API_BASE}/messages`, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      formStatus.textContent =
        result.error || "Failed to send message.";
      return;
    }

    form.reset();
    formStatus.textContent =
      "Message submitted. It will appear after approval.";

    await loadMessages();
  } catch (error) {
    console.error(error);
    formStatus.textContent =
      "Unable to contact the server. Please try again.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Send message";
  }
});

loadMessages();