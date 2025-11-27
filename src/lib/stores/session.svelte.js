// Session store using Svelte 5 runes
// Stores authentication state and username for event logging
// Persists session to localStorage with expiry

const SESSION_KEY = 'flashback_session';
const USERNAME_KEY = 'flashback_last_username';
const SESSION_HOURS = 8; // Session lasts 8 hours

export const session = $state({
  isAuthenticated: false,
  username: ''
});

// Initialize from localStorage on load
function initSession() {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      const expiry = new Date(data.expiry);

      if (expiry > new Date()) {
        // Session still valid
        session.isAuthenticated = true;
        session.username = data.username;
        return true;
      } else {
        // Session expired, clear it
        localStorage.removeItem(SESSION_KEY);
      }
    }
  } catch (e) {
    console.error('Failed to restore session:', e);
    localStorage.removeItem(SESSION_KEY);
  }
  return false;
}

export function login(name, rememberMe = true) {
  session.isAuthenticated = true;
  session.username = name;

  // Always save the last username
  localStorage.setItem(USERNAME_KEY, name);

  if (rememberMe) {
    // Save session with expiry
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + SESSION_HOURS);

    localStorage.setItem(SESSION_KEY, JSON.stringify({
      username: name,
      expiry: expiry.toISOString()
    }));
  }
}

export function logout() {
  session.isAuthenticated = false;
  session.username = '';
  localStorage.removeItem(SESSION_KEY);
  // Keep the last username for convenience
}

export function getUsername() {
  return session.username;
}

export function getLastUsername() {
  return localStorage.getItem(USERNAME_KEY) || '';
}

export function getSessionHours() {
  return SESSION_HOURS;
}

// Try to restore session on module load
initSession();
