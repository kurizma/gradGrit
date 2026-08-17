const API_BASE = 'https://gradgrit-api.kurizmatic.workers.dev';

const messagesEl = document.getElementById('messages');
const form = document.getElementById('message-form');
const toggleBtn = document.getElementById('toggle-access-code');
const accessInput = document.getElementById('access_code');

// Toggle password visibility
toggleBtn?.addEventListener('click', () => {
  const isPassword = accessInput.type === 'password';
  accessInput.type = isPassword ? 'text' : 'password';
  toggleBtn.textContent = isPassword ? 'Hide' : 'Show';
  toggleBtn.setAttribute('aria-pressed', String(isPassword));
});

async function loadMessages() {
  const res = await fetch(API_BASE + '/messages?approved=true');
  const data = await res.json();

  messagesEl.innerHTML =
    data.length === 0
      ? '<div>No messages yet.</div>'
      : data
          .map(
            (m) =>
              '<div><strong>' +
              (m.name || 'Anonymous') +
              '</strong>: ' +
              (m.message || '') +
              '</div>'
          )
          .join('')
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fd = new FormData(form);
  const name = fd.get('name');
  const message = fd.get('message');
  const access_code = fd.get('access_code');
  const file = fd.get('file');

  // For now, ignore file and just send text + access_code
  const payload = {
    name,
    message,
    access_code,
    ip_address: '',
  };

  await fetch(API_BASE + '/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  form.reset();
  loadMessages();
});

loadMessages();