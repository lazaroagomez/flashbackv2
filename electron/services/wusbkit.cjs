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
 * @param {string} error - Error string from WUSBKit
 * @param {string} command - The command that was executed (for context-aware messages)
 */
function mapErrorMessage(error, command = '') {
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
    if (parsed.code === 'PWSH_NOT_FOUND') {
      // For list/info commands, WMI failed and fell back to PowerShell
      if (command === 'list' || command === 'info') {
        return 'USB detection failed: Native WMI query failed and PowerShell 7 (fallback) is not installed. Please install PowerShell 7 from https://github.com/PowerShell/PowerShell/releases';
      }
      return errorMap['PWSH_NOT_FOUND'];
    }
    if (parsed.code && errorMap[parsed.code]) {
      return `${errorMap[parsed.code]}: ${parsed.error || ''}`;
    }
    return parsed.error || error;
  } catch {
    // Check if error string contains a known code
    if (error.includes('PWSH_NOT_FOUND')) {
      if (command === 'list' || command === 'info') {
        return 'USB detection failed: Native WMI query failed and PowerShell 7 (fallback) is not installed. Please install PowerShell 7 from https://github.com/PowerShell/PowerShell/releases';
      }
      return errorMap['PWSH_NOT_FOUND'];
    }
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
    const command = args[0] || ''; // First arg is the command (list, info, format, etc.)

    if (!fs.existsSync(wusbkitPath)) {
      reject(new Error(`WUSBKit binary not found at: ${wusbkitPath}`));
      return;
    }

    const child = spawn(wusbkitPath, args);
    let stdout = '';
    let stderr = '';
    let settled = false;

    // Helper to ensure we only resolve/reject once
    const settle = (fn) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        clearTimeout(killTimer);
        fn();
      }
    };

    // Primary timeout - try graceful kill
    const timer = setTimeout(() => {
      child.kill(); // On Windows, this sends SIGTERM equivalent
    }, timeout);

    // Fallback timeout - force kill if still running after 5 more seconds
    const killTimer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {
        // Process may already be dead
      }
      // Force settle with timeout error if process won't die
      settle(() => reject(new Error('Operation timed out')));
    }, timeout + 5000);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      settle(() => {
        if (code !== 0 && code !== null) {
          reject(new Error(mapErrorMessage(stderr || `Command failed with exit code ${code}`, command)));
        } else if (code === null) {
          // Process was killed (timeout)
          reject(new Error('Operation timed out'));
        } else {
          try {
            const result = stdout.trim() ? JSON.parse(stdout.trim()) : null;
            resolve(result);
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        }
      });
    });

    child.on('error', (err) => {
      settle(() => reject(new Error(`Failed to execute WUSBKit: ${err.message}`)));
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
    const command = args[0] || ''; // First arg is the command

    if (!fs.existsSync(wusbkitPath)) {
      reject(new Error(`WUSBKit binary not found at: ${wusbkitPath}`));
      return;
    }

    const child = spawn(wusbkitPath, args);
    let lastProgress = null;
    let stderr = '';
    let settled = false;

    // Helper to ensure we only resolve/reject once
    const settle = (fn) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        clearTimeout(killTimer);
        rl.close();
        fn();
      }
    };

    // Primary timeout - try graceful kill
    const timer = setTimeout(() => {
      child.kill(); // On Windows, this sends SIGTERM equivalent
    }, timeout);

    // Fallback timeout - force kill if still running after 5 more seconds
    const killTimer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {
        // Process may already be dead
      }
      // Force settle with timeout error if process won't die
      settle(() => reject(new Error('Operation timed out')));
    }, timeout + 5000);

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
      settle(() => {
        if (code !== 0 && code !== null) {
          reject(new Error(mapErrorMessage(stderr || `Command failed with exit code ${code}`, command)));
        } else if (code === null) {
          // Process was killed (timeout)
          reject(new Error('Operation timed out'));
        } else {
          resolve(lastProgress);
        }
      });
    });

    child.on('error', (err) => {
      settle(() => reject(new Error(`Failed to execute WUSBKit: ${err.message}`)));
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
  const result = await execCommand(['list', '--json'], 30000); // 30 second timeout

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
        reject(new Error(mapErrorMessage(stderr || `Flash failed with exit code ${code}`, 'flash')));
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
