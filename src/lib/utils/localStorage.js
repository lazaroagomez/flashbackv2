/**
 * localStorage Utility
 * Centralized localStorage operations with error handling
 */

/**
 * Load data from localStorage with validation
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if key doesn't exist or is invalid
 * @param {Function} validator - Optional validation function (returns true if valid)
 * @returns {any} - Parsed data or default value
 */
export function loadFromStorage(key, defaultValue, validator = null) {
  if (typeof window === 'undefined') return defaultValue;

  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;

    const data = JSON.parse(stored);

    if (validator && !validator(data)) {
      localStorage.removeItem(key);
      return defaultValue;
    }

    return data;
  } catch (e) {
    console.error(`Failed to load ${key} from localStorage:`, e);
    localStorage.removeItem(key);
    return defaultValue;
  }
}

/**
 * Save data to localStorage
 * @param {string} key - Storage key
 * @param {any} value - Value to store (will be JSON stringified)
 * @returns {boolean} - True if save succeeded
 */
export function saveToStorage(key, value) {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`Failed to save ${key} to localStorage:`, e);
    return false;
  }
}

/**
 * Remove data from localStorage
 * @param {string} key - Storage key
 */
export function removeFromStorage(key) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`Failed to remove ${key} from localStorage:`, e);
  }
}

/**
 * Storage keys used by the application
 * Centralized to prevent collisions and ensure consistency
 */
export const STORAGE_KEYS = {
  SESSION: 'flashback_session',
  LAST_USERNAME: 'flashback_last_username',
  NAVIGATION: 'flashback_navigation',
  THEME: 'flashback-theme'  // Note: uses dash for backward compatibility
};
