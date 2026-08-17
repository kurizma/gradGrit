const API_BASE = "https://gradgrit-api.kurizmatic.workers.dev";

const loginSection = document.getElementById("login-section");
const adminSection = document.getElementById("admin-section");

const loginForm = document.getElementById("login-form");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("login-button");
const loginStatus = document.getElementById("login-status");

const logoutButton = document.getElementById("logout-button");
const adminStatus = document.getElementById("admin-status");

function showLogin() {
  loginSection.hidden = false;
  adminSection.hidden = true;
}

function showAdmin() {
  loginSection.hidden = true;
  adminSection.hidden = false;
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
      loginStatus.textContent =
        result.error || "Login failed.";
      return;
    }

    passwordInput.value = "";
    loginStatus.textContent = "";
    showAdmin();
  } catch (error) {
    console.error("Login failed:", error);
    loginStatus.textContent =
      "Unable to contact the server.";
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
    adminStatus.textContent =
      "Unable to log out. Please try again.";
  } finally {
    logoutButton.disabled = false;
  }
});

checkOwnerSession();