/**
 * Global connected drives store
 * Caches USB device list and loads on app startup
 */
import { api } from '../api.js';

export const connectedDrivesState = $state({
  drives: [],
  loading: false,
  error: null,
  lastUpdated: null,
  initialized: false
});

// Derived states for convenience
export function getRegisteredDrives() {
  return connectedDrivesState.drives.filter(d => d.isRegistered);
}

export function getUnregisteredDrives() {
  return connectedDrivesState.drives.filter(d => !d.isRegistered && d.serial);
}

export function getNoSerialDrives() {
  return connectedDrivesState.drives.filter(d => !d.isRegistered && !d.serial);
}

/**
 * Load connected USB drives
 * If showLoading is false, loads in background without showing spinner
 */
export async function loadConnectedDrives(showLoading = true) {
  // Only show loading spinner if explicitly requested AND we have no cached data
  if (showLoading && connectedDrivesState.drives.length === 0) {
    connectedDrivesState.loading = true;
  }

  connectedDrivesState.error = null;

  try {
    const drives = await api.detectUsbDevices();
    connectedDrivesState.drives = drives;
    connectedDrivesState.lastUpdated = Date.now();
    connectedDrivesState.initialized = true;
  } catch (e) {
    connectedDrivesState.error = e.message || 'Failed to detect USB devices';
    // Keep existing drives on error so UI doesn't go blank
  } finally {
    connectedDrivesState.loading = false;
  }

  return connectedDrivesState.drives;
}

/**
 * Force refresh - always shows loading state
 */
export async function refreshConnectedDrives() {
  connectedDrivesState.loading = true;
  return loadConnectedDrives(true);
}

/**
 * Remove a drive from the cached list (e.g., after eject)
 */
export function removeDriveFromCache(diskIndex) {
  connectedDrivesState.drives = connectedDrivesState.drives.filter(
    d => d.diskIndex !== diskIndex
  );
}

/**
 * Initialize on app startup - loads in background
 */
export async function initConnectedDrives() {
  if (!connectedDrivesState.initialized) {
    // Load silently in background on first init
    return loadConnectedDrives(false);
  }
  return connectedDrivesState.drives;
}

/**
 * Check if we have cached data
 */
export function hasCachedDrives() {
  return connectedDrivesState.drives.length > 0 || connectedDrivesState.initialized;
}
