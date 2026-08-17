const API_BASE = "https://gradgrit-api.kurizmatic.workers.dev";

const messagesContainer = document.getElementById("messages-container");
const loadingIndicator = document.getElementById("loading-indicator");

async function loadMessages() {
  if (loadingIndicator) {
    loadingIndicator.hidden = false;
  }

  try {
    const response = await fetch(
      `${API_BASE}/messages`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to load messages");
    }

    const messages = await response.json();
    renderMessages(messages);
  } catch (error) {
    console.error("Failed to load messages:", error);
    if (messagesContainer) {
      messagesContainer.innerHTML = "<p>Failed to load messages. Please try again later.</p>";
    }
  } finally {
    if (loadingIndicator) {
      loadingIndicator.hidden = true;
    }
  }
}

function renderMessages(messages) {
  if (!messagesContainer) return;

  if (!messages || messages.length === 0) {
    messagesContainer.innerHTML = "<p>No messages yet. Be the first to submit one!</p>";
    return;
  }

  const table = document.createElement("table");

  const headerRow = document.createElement("tr");
  headerRow.innerHTML = `
    <th>Date</th>
    <th>Name</th>
    <th>Message</th>
    <th>Attachments</th>
  `;
  table.appendChild(headerRow);

  messages.forEach(msg => {
    const row = document.createElement("tr");

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
    `;
    row.appendChild(attachmentsCell);
    table.appendChild(row);
  });

  messagesContainer.appendChild(table);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

loadMessages();