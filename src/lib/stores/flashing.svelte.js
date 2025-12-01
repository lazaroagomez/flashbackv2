/**
 * Global flashing state store
 * Tracks flashing progress across the entire application
 */

export const flashingState = $state({
  isFlashing: false,
  flashProgress: {},
  deviceProgress: {},
  devices: [],       // Devices being flashed
  imageInfo: null,   // Image being flashed
  imagePath: null
});

/**
 * Start flashing - called when flash operation begins
 */
export function startFlashing(devices, imageInfo, imagePath) {
  flashingState.isFlashing = true;
  flashingState.devices = devices;
  flashingState.imageInfo = imageInfo;
  flashingState.imagePath = imagePath;
  flashingState.flashProgress = {
    type: 'starting',
    percentage: 0,
    speed: 0,
    eta: 0
  };

  // Initialize per-device progress
  flashingState.deviceProgress = {};
  for (const device of devices) {
    flashingState.deviceProgress[device.diskIndex] = {
      type: 'starting',
      percentage: 0,
      speed: 0,
      eta: 0
    };
  }
}

/**
 * Update flash progress
 */
export function updateFlashProgress(progress) {
  flashingState.flashProgress = { ...progress };

  // Track per-device progress
  if (progress.device) {
    const match = progress.device.match(/PhysicalDrive(\d+)/i);
    if (match) {
      const diskIndex = parseInt(match[1], 10);
      flashingState.deviceProgress = {
        ...flashingState.deviceProgress,
        [diskIndex]: {
          type: progress.type,
          percentage: progress.percentage || 0,
          speed: progress.speed || 0,
          eta: progress.eta || 0
        }
      };
    }
  }
}

/**
 * Mark a device as failed
 */
export function markDeviceFailed(device, error) {
  const match = device.match(/PhysicalDrive(\d+)/i);
  if (match) {
    const diskIndex = parseInt(match[1], 10);
    flashingState.deviceProgress = {
      ...flashingState.deviceProgress,
      [diskIndex]: {
        type: 'failed',
        percentage: 0,
        error: error
      }
    };
  }
}

/**
 * Stop flashing - called when flash operation completes
 */
export function stopFlashing() {
  flashingState.isFlashing = false;
  flashingState.flashProgress = { type: 'finished', percentage: 100 };
}

/**
 * Reset flashing state completely
 */
export function resetFlashing() {
  flashingState.isFlashing = false;
  flashingState.flashProgress = {};
  flashingState.deviceProgress = {};
  flashingState.devices = [];
  flashingState.imageInfo = null;
  flashingState.imagePath = null;
}

/**
 * Get overall progress percentage across all devices
 */
export function getOverallProgress() {
  const progressEntries = Object.values(flashingState.deviceProgress);
  if (progressEntries.length === 0) return 0;

  const total = progressEntries.reduce((sum, p) => sum + (p.percentage || 0), 0);
  return Math.round(total / progressEntries.length);
}
