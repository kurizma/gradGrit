const API_BASE = "https://gradgrit-api.kurizmatic.workers.dev";

const loginSection = document.getElementById("login-section");
const adminSection = document.getElementById("admin-section");

const loginForm = document.getElementById("login-form");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("login-button");
const loginStatus = document.getElementById("login-status");

const logoutButton = document.getElementById("logout-button");
const adminStatus = document.getElementById("admin-status");

const messagesContainer = document.getElementById("messages-container");
const refreshButton = document.getElementById("refresh-button");
const loadingIndicator = document.getElementById("loading-indicator");
const viewButton = document.getElementById("view-button");

if (viewButton) {
  viewButton.addEventListener("click", () => {
    window.location.href = "/messages";
  });
}

function showLogin() {
  loginSection.hidden = false;
  adminSection.hidden = true;
}

function showAdmin() {
  loginSection.hidden = true;
  adminSection.hidden = false;
  loadMessages();
}

async function checkOwnerSession() {
  try {
    const response = await fetch(
      `${API_BASE}/admin/check`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (response.ok) {
      const result = await response.json();

      if (result.authenticated === true) {
        showAdmin();
        return;
      }
    }

    showLogin();
  } catch (error) {
    console.error("Session check failed:", error);
    showLogin();
  }
}

async function loadMessages() {
  console.log("Loading messages...");
  
  if (messagesContainer) {
    messagesContainer.innerHTML = "";
  }
  if (loadingIndicator) {
    loadingIndicator.hidden = false;
  }

  try {
    const response = await fetch(
      `${API_BASE}/admin/messages`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      }
    );

    // console.log("Response status:", response.status);

    if (!response.ok) {
      throw new Error("Failed to load messages");
    }

    const result = await response.json();
    // console.log("Messages loaded:", result.messages?.length || 0);
    
    renderMessages(result.messages || []);
  } catch (error) {
    console.error("Failed to load messages:", error);
    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <p>Failed to load messages. Please refresh the page.</p>
      `;
    }
  } finally {
    if (loadingIndicator) {
      loadingIndicator.hidden = true;
    }
  }
}

function renderMessages(messages) {
  if (!messagesContainer) return;

  if (messages.length === 0) {
    messagesContainer.innerHTML = "<p>No messages found.</p>";
    return;
  }

  const table = document.createElement("table");

  const headerRow = document.createElement("tr");
  headerRow.innerHTML = `
    <th>Date</th>
    <th>Name</th>
    <th>Message</th>
    <th>Status</th>
    <th>Attachments</th>
    <th>Actions</th>
  `;
  table.appendChild(headerRow);

  messages.forEach(msg => {
    const row = document.createElement("tr");
    row.dataset.messageId = msg.id;

    const attachmentsCell = document.createElement("td");

    if (msg.message_attachments && msg.message_attachments.length > 0) {
      msg.message_attachments.forEach(att => {
        const fileUrl = `${API_BASE}/attachments/${att.id}`;
        const fileName = escapeHtml(att.original_name || "attachment");
        const mimeType = att.mime_type || "";
        const attDiv = document.createElement("div");

        if (mimeType.startsWith("image/")) {
          const img = document.createElement("img");
          img.src = fileUrl;
          img.alt = fileName;
          const link = document.createElement("a");
          link.href = fileUrl;
          link.target = "_blank";
          link.appendChild(img);
          attDiv.appendChild(link);
          
          const nameLink = document.createElement("a");
          nameLink.href = fileUrl;
          nameLink.target = "_blank";
          nameLink.textContent = fileName;
          attDiv.appendChild(document.createElement("br"));
          attDiv.appendChild(nameLink);
        } else if (mimeType.startsWith("video/")) {
          const video = document.createElement("video");
          video.controls = true;
          const source = document.createElement("source");
          source.src = fileUrl;
          source.type = mimeType;
          video.appendChild(source);
          video.innerHTML += "Your browser does not support video.";
          
          const link = document.createElement("a");
          link.href = fileUrl;
          link.target = "_blank";
          link.textContent = fileName;
          
          attDiv.appendChild(video);
          attDiv.appendChild(document.createElement("br"));
          attDiv.appendChild(link);
        } else if (mimeType.startsWith("audio/")) {
          const audio = document.createElement("audio");
          audio.controls = true;
          const source = document.createElement("source");
          source.src = fileUrl;
          source.type = mimeType;
          audio.appendChild(source);
          audio.innerHTML += "Your browser does not support audio.";
          
          const link = document.createElement("a");
          link.href = fileUrl;
          link.target = "_blank";
          link.textContent = fileName;
          
          attDiv.appendChild(audio);
          attDiv.appendChild(document.createElement("br"));
          attDiv.appendChild(link);
        } else {
          const link = document.createElement("a");
          link.href = fileUrl;
          link.target = "_blank";
          link.textContent = "📎 " + fileName;
          attDiv.appendChild(link);
        }

        attachmentsCell.appendChild(attDiv);
      });
    } else {
      attachmentsCell.textContent = "None";
    }

    row.innerHTML = `
      <td>${new Date(msg.created_at).toLocaleDateString()}</td>
      <td>${escapeHtml(msg.name || "")}</td>
      <td>${escapeHtml(msg.message || "")}</td>
      <td>${msg.approved ? "Approved" : "Hidden"}</td>
    `;
    row.appendChild(attachmentsCell);

    const actionsCell = document.createElement("td");
    const actionButton = document.createElement("button");
    actionButton.className = "toggle-approval-btn";
    actionButton.dataset.messageId = msg.id;
    actionButton.dataset.approved = msg.approved;
    actionButton.textContent = msg.approved ? "Hide" : "Restore";
    actionsCell.appendChild(actionButton);
    row.appendChild(actionsCell);

    table.appendChild(row);
  });

  messagesContainer.appendChild(table);

  document.querySelectorAll(".toggle-approval-btn").forEach(btn => {
    btn.addEventListener("click", async (event) => {
      const messageId = event.target.dataset.messageId;
      const currentApproved = event.target.dataset.approved === "true";
      const newApproved = !currentApproved;

      await toggleMessageApproval(messageId, newApproved);
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function toggleMessageApproval(messageId, approved) {
  try {
    const response = await fetch(
      `${API_BASE}/admin/messages/${messageId}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ approved }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to update message");
    }

    await loadMessages();
  } catch (error) {
    console.error("Failed to toggle approval:", error);
    alert("Failed to update message. Please try again.");
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginStatus.textContent = "";
  loginButton.disabled = true;
  loginButton.textContent = "Logging in...";

  const password = passwordInput.value;

  try {
    const response = await fetch(
      `${API_BASE}/admin/login`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      loginStatus.textContent = result.error || "Login failed.";
      return;
    }

    passwordInput.value = "";
    loginStatus.textContent = "";
    showAdmin();
  } catch (error) {
    console.error("Login failed:", error);
    loginStatus.textContent = "Unable to contact the server.";
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Log in";
  }
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  adminStatus.textContent = "Logging out...";

  try {
    const response = await fetch(
      `${API_BASE}/admin/logout`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Logout failed");
    }

    adminStatus.textContent = "";
    showLogin();
  } catch (error) {
    console.error("Logout failed:", error);
    adminStatus.textContent = "Unable to log out. Please try again.";
  } finally {
    logoutButton.disabled = false;
  }
});

if (refreshButton) {
  refreshButton.addEventListener("click", loadMessages);
}

checkOwnerSession();