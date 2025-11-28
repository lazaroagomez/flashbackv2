// Session store using Svelte 5 runes
// Stores authentication state and username for event logging
// Persists session to localStorage with expiry

import { loadFromStorage, saveToStorage, removeFromStorage, STORAGE_KEYS } from '../utils/localStorage.js';

const SESSION_HOURS = 8; // Session lasts 8 hours

export const session = $state({
  isAuthenticated: false,
  username: ''
});

// Validator for session data
function isValidSession(data) {
  if (!data || !data.expiry || !data.username) return false;
  return new Date(data.expiry) > new Date();
}

// Initialize from localStorage on load
function initSession() {
  const data = loadFromStorage(STORAGE_KEYS.SESSION, null, isValidSession);
  if (data) {
    session.isAuthenticated = true;
    session.username = data.username;
    return true;
  }
  return false;
}

export function login(name, rememberMe = true) {
  session.isAuthenticated = true;
  session.username = name;

  // Always save the last username
  saveToStorage(STORAGE_KEYS.LAST_USERNAME, name);

  if (rememberMe) {
    // Save session with expiry
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + SESSION_HOURS);

    saveToStorage(STORAGE_KEYS.SESSION, {
      username: name,
      expiry: expiry.toISOString()
    });
  }
}

export function logout() {
  session.isAuthenticated = false;
  session.username = '';
  removeFromStorage(STORAGE_KEYS.SESSION);
  // Keep the last username for convenience
}

export function getUsername() {
  return session.username;
}

export function getLastUsername() {
  return loadFromStorage(STORAGE_KEYS.LAST_USERNAME, '');
}

export function getSessionHours() {
  return SESSION_HOURS;
}

// Try to restore session on module load
initSession();
