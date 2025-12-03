/**
 * WUSBKit Service - Unified USB operations via wusbkit.exe CLI
 * Handles device detection, formatting, flashing, and ejection
 */
const { spawn } = require('child_process');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Track active flash processes for cancellation
const activeFlashProcesses = new Map();

/**
 * Get path to wusbkit.exe binary
 * Handles both development and packaged app scenarios
 */
function getWusbkitPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'wusbkit.exe');
  }
  return path.join(__dirname, '../../static/wusbkit.exe');
}

/**
 * Map WUSBKit error codes to user-friendly messages
 */
function mapErrorMessage(error) {
  const errorMap = {
    'USB_NOT_FOUND': 'USB drive not found. Ensure it is connected.',
    'PWSH_NOT_FOUND': 'PowerShell 7 is required. Please install it from https://github.com/PowerShell/PowerShell/releases',
    'PERMISSION_DENIED': 'Administrator privileges required. Please run as administrator.',
    'FORMAT_FAILED': 'Format operation failed',
    'FLASH_FAILED': 'Flash operation failed',
    'DISK_BUSY': 'Drive is busy. Close other applications using it.',
    'INVALID_INPUT': 'Invalid input parameters'
  };

  // Try to parse as JSON error from WUSBKit
  try {
    const parsed = JSON.parse(error);
    if (parsed.code && errorMap[parsed.code]) {
      return `${errorMap[parsed.code]}: ${parsed.error || ''}`;
    }
    return parsed.error || error;
  } catch {
    // Check if error string contains a known code
    for (const [code, message] of Object.entries(errorMap)) {
      if (error.includes(code)) {
        return message;
      }
    }
    return error;
  }
}

/**
 * Execute a WUSBKit command and return parsed JSON result
 * @param {string[]} args - Command arguments
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<any>} Parsed JSON result
 */
async function execCommand(args, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const wusbkitPath = getWusbkitPath();

    if (!fs.existsSync(wusbkitPath)) {
      reject(new Error(`WUSBKit binary not found at: ${wusbkitPath}`));
      return;
    }

    const child = spawn(wusbkitPath, args);
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeout);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timer);

      if (timedOut) {
        reject(new Error('Operation timed out'));
        return;
      }

      if (code !== 0) {
        reject(new Error(mapErrorMessage(stderr || `Command failed with exit code ${code}`)));
        return;
      }

      try {
        const result = stdout.trim() ? JSON.parse(stdout.trim()) : null;
        resolve(result);
      } catch (e) {
        reject(new Error(`Failed to parse response: ${e.message}`));
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to execute WUSBKit: ${err.message}`));
    });
  });
}

/**
 * Execute a WUSBKit command with NDJSON progress streaming
 * @param {string[]} args - Command arguments
 * @param {Function} onProgress - Progress callback (receives parsed JSON)
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<any>} Final progress object on success
 */
function execStreamCommand(args, onProgress, timeout = 600000) {
  return new Promise((resolve, reject) => {
    const wusbkitPath = getWusbkitPath();

    if (!fs.existsSync(wusbkitPath)) {
      reject(new Error(`WUSBKit binary not found at: ${wusbkitPath}`));
      return;
    }

    const child = spawn(wusbkitPath, args);
    let lastProgress = null;
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeout);

    // Parse NDJSON lines from stdout
    const rl = readline.createInterface({ input: child.stdout });
    rl.on('line', (line) => {
      try {
        const progress = JSON.parse(line);
        lastProgress = progress;
        if (onProgress) {
          onProgress(progress);
        }
      } catch {
        // Ignore non-JSON lines
      }
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      rl.close();

      if (timedOut) {
        reject(new Error('Operation timed out'));
        return;
      }

      if (code !== 0) {
        reject(new Error(mapErrorMessage(stderr || `Command failed with exit code ${code}`)));
        return;
      }

      resolve(lastProgress);
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      rl.close();
      reject(new Error(`Failed to execute WUSBKit: ${err.message}`));
    });

    // Return child process for cancellation
    return child;
  });
}

/**
 * Map WUSBKit device JSON to frontend expected format
 * @param {Object} device - WUSBKit device object
 * @returns {Object} Mapped device object
 */
function mapWusbkitDevice(device) {
  return {
    model: device.friendlyName || device.model || 'Unknown USB Device',
    serial: device.serialNumber || '',
    sizeGB: device.size ? Math.round((device.size / 1073741824) * 100) / 100 : 0,
    diskIndex: device.diskNumber,
    driveLetter: device.driveLetter || '',
    partitionStyle: device.partitionStyle || 'Unknown',
    healthStatus: device.healthStatus || 'Unknown',
    fileSystem: device.fileSystem || '',
    volumeLabel: device.volumeLabel || '',
    isSystem: false, // WUSBKit only returns USB devices
    isBoot: false,
    isReadOnly: device.status === 'Offline',
    isOffline: device.status === 'Offline',
    // These are enriched by database lookup later
    isRegistered: false,
    dbId: null,
    usbId: null
  };
}

// ==================== DEVICE OPERATIONS ====================

/**
 * List all connected USB devices
 * @returns {Promise<Array>} Array of device objects
 */
async function listDevices() {
  const result = await execCommand(['list', '--json'], 180000); // 180 second timeout for many devices

  // Handle empty array or null
  if (!result) return [];

  // Ensure result is array
  const devices = Array.isArray(result) ? result : [result];
  return devices;
}

/**
 * Get detailed info for a specific device
 * @param {string|number} identifier - Drive letter (E:) or disk number (2)
 * @returns {Promise<Object>} Device info object
 */
async function getDeviceInfo(identifier) {
  const result = await execCommand(['info', String(identifier), '--json']);
  return result;
}

/**
 * Format a USB drive
 * @param {Object} options - Format options
 * @param {string|number} options.identifier - Drive letter or disk number
 * @param {string} options.fileSystem - File system (fat32, exfat, ntfs)
 * @param {string} options.label - Volume label
 * @param {Function} options.onProgress - Progress callback
 * @returns {Promise<Object>} Format result
 */
async function formatDevice(options) {
  const {
    identifier,
    fileSystem = 'exfat',
    label = 'USB',
    onProgress
  } = options;

  const args = [
    'format',
    String(identifier),
    '--fs', fileSystem.toLowerCase(),
    '--label', label,
    '--json',
    '--yes'
  ];

  return execStreamCommand(args, onProgress, 120000); // 2 minute timeout
}

/**
 * Safely eject a USB drive
 * @param {string|number} identifier - Drive letter or disk number
 * @returns {Promise<Object>} Eject result
 */
async function ejectDevice(identifier) {
  return execCommand(['eject', String(identifier), '--json', '--yes']);
}

// ==================== FLASH OPERATIONS ====================

/**
 * Flash an image to a single device
 * @param {Object} options - Flash options
 * @param {string|number} options.identifier - Drive letter or disk number
 * @param {string} options.imagePath - Path to image file
 * @param {boolean} options.verify - Verify after writing
 * @param {Function} options.onProgress - Progress callback
 * @param {string} options.jobId - Optional job ID for tracking
 * @returns {Promise<Object>} Flash result
 */
async function flashDevice(options) {
  const {
    identifier,
    imagePath,
    verify = true,
    onProgress,
    jobId = `flash_${Date.now()}_${identifier}`
  } = options;

  const args = [
    'flash',
    String(identifier),
    '--image', imagePath,
    '--json',
    '--yes'
  ];

  if (verify) {
    args.push('--verify');
  }

  return new Promise((resolve, reject) => {
    const wusbkitPath = getWusbkitPath();

    if (!fs.existsSync(wusbkitPath)) {
      reject(new Error(`WUSBKit binary not found at: ${wusbkitPath}`));
      return;
    }

    const child = spawn(wusbkitPath, args);
    let lastProgress = null;
    let stderr = '';

    // Track process for cancellation
    activeFlashProcesses.set(jobId, child);

    const rl = readline.createInterface({ input: child.stdout });
    rl.on('line', (line) => {
      try {
        const progress = JSON.parse(line);
        lastProgress = progress;
        if (onProgress) {
          onProgress({
            ...progress,
            identifier,
            jobId
          });
        }
      } catch {
        // Ignore non-JSON lines
      }
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      rl.close();
      activeFlashProcesses.delete(jobId);

      if (code !== 0) {
        reject(new Error(mapErrorMessage(stderr || `Flash failed with exit code ${code}`)));
        return;
      }

      resolve({
        success: true,
        identifier,
        jobId,
        ...lastProgress
      });
    });

    child.on('error', (err) => {
      rl.close();
      activeFlashProcesses.delete(jobId);
      reject(new Error(`Failed to execute WUSBKit: ${err.message}`));
    });
  });
}

/**
 * Flash an image to multiple devices in parallel
 * @param {Object} options - Flash options
 * @param {Array<string|number>} options.devices - Array of identifiers
 * @param {string} options.imagePath - Path to image file
 * @param {boolean} options.verify - Verify after writing
 * @param {Function} options.onProgress - Progress callback (called per device)
 * @param {Function} options.onDeviceFailed - Device failure callback
 * @returns {Promise<Object>} Combined flash result
 */
async function flashDevices(options) {
  const {
    devices,
    imagePath,
    verify = true,
    onProgress,
    onDeviceFailed
  } = options;

  if (!devices || devices.length === 0) {
    throw new Error('At least one device is required');
  }

  if (!imagePath || !fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  const results = {
    successfulDevices: [],
    failedDevices: [],
    startTime: Date.now()
  };

  // Start flash operations in parallel
  const promises = devices.map(async (identifier) => {
    const jobId = `flash_${Date.now()}_${identifier}`;

    try {
      const result = await flashDevice({
        identifier,
        imagePath,
        verify,
        jobId,
        onProgress: (progress) => {
          if (onProgress) {
            onProgress({
              ...progress,
              device: identifier
            });
          }
        }
      });

      results.successfulDevices.push({
        identifier,
        ...result
      });
    } catch (error) {
      results.failedDevices.push({
        identifier,
        error: error.message
      });

      if (onDeviceFailed) {
        onDeviceFailed(identifier, error);
      }
    }
  });

  await Promise.allSettled(promises);

  results.duration = Date.now() - results.startTime;
  results.success = results.failedDevices.length === 0;

  return results;
}

/**
 * Cancel all active flash operations
 */
function cancelAllFlash() {
  for (const [jobId, process] of activeFlashProcesses) {
    try {
      process.kill('SIGTERM');
    } catch {
      // Process may already be dead
    }
  }
  activeFlashProcesses.clear();
  return { success: true, message: 'All flash operations cancelled' };
}

/**
 * Cancel a specific flash operation
 * @param {string} jobId - Job ID to cancel
 */
function cancelFlash(jobId) {
  const process = activeFlashProcesses.get(jobId);
  if (process) {
    try {
      process.kill('SIGTERM');
      activeFlashProcesses.delete(jobId);
      return { success: true, message: `Flash job ${jobId} cancelled` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: 'Job not found or already completed' };
}

/**
 * Get status of active flash operations
 */
function getFlashStatus() {
  return {
    activeJobs: activeFlashProcesses.size,
    jobIds: Array.from(activeFlashProcesses.keys())
  };
}

// ==================== UTILITY ====================

/**
 * Get WUSBKit version and PowerShell status
 * @returns {Promise<Object>} Version info
 */
async function getVersion() {
  return execCommand(['version', '--json']);
}

/**
 * Validate image file exists and has supported extension
 * @param {string} imagePath - Path to image file
 * @returns {Object} Validation result
 */
function validateImage(imagePath) {
  if (!imagePath) {
    return { valid: false, error: 'Image path is required' };
  }

  if (!fs.existsSync(imagePath)) {
    return { valid: false, error: `Image file not found: ${imagePath}` };
  }

  const stats = fs.statSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase();

  // Supported formats (same as WUSBKit)
  const supportedFormats = ['.img', '.iso', '.bin', '.raw', '.zip', '.gz', '.xz', '.zst', '.zstd'];
  if (!supportedFormats.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported image format: ${ext}. Supported: ${supportedFormats.join(', ')}`
    };
  }

  const isCompressed = ['.zip', '.gz', '.xz', '.zst', '.zstd'].includes(ext);

  return {
    valid: true,
    path: imagePath,
    name: path.basename(imagePath),
    size: stats.size,
    sizeGB: Math.round(stats.size / 1073741824 * 100) / 100,
    extension: ext,
    isCompressed,
    lastModified: stats.mtime
  };
}

module.exports = {
  // Device operations
  listDevices,
  getDeviceInfo,
  formatDevice,
  ejectDevice,

  // Flash operations
  flashDevice,
  flashDevices,
  cancelAllFlash,
  cancelFlash,
  getFlashStatus,

  // Utilities
  getVersion,
  validateImage,
  mapWusbkitDevice,
  getWusbkitPath
};
