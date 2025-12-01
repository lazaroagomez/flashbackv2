const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');

// etcher-sdk will be imported dynamically to handle native module loading
let sdk = null;

/**
 * Lazily load etcher-sdk (handles native module issues)
 */
async function getSDK() {
  if (!sdk) {
    try {
      sdk = require('etcher-sdk');
    } catch (error) {
      throw new Error(`Failed to load etcher-sdk: ${error.message}. Make sure native modules are rebuilt for Electron.`);
    }
  }
  return sdk;
}

/**
 * Throttle function to limit callback frequency
 */
function throttle(fn, delay) {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return fn(...args);
    }
  };
}

/**
 * USB Flashing service using etcher-sdk
 * Handles multi-device parallel image flashing with progress monitoring
 */
class USBFlasher extends EventEmitter {
  constructor() {
    super();
    this.scanner = null;
    this.activeJob = null;
    this.abortController = null;
  }

  /**
   * Initialize the device scanner for real-time device monitoring
   */
  async initScanner() {
    if (this.scanner) {
      return; // Already initialized
    }

    const { scanner } = await getSDK();

    const adapters = [
      new scanner.adapters.BlockDeviceAdapter({
        includeSystemDrives: () => false,
        direct: true,
        unmountOnSuccess: false,
        write: true
      })
    ];

    this.scanner = new scanner.Scanner(adapters);

    // Forward scanner events
    this.scanner.on('attach', (drive) => {
      this.emit('device:attach', this._mapDriveInfo(drive));
    });

    this.scanner.on('detach', (drive) => {
      this.emit('device:detach', this._mapDriveInfo(drive));
    });

    this.scanner.on('error', (error) => {
      this.emit('scanner:error', error);
    });

    await this.scanner.start();
  }

  /**
   * Map drive info to a simplified object
   */
  _mapDriveInfo(drive) {
    return {
      device: drive.device,
      devicePath: drive.devicePath || drive.device,
      size: drive.size,
      sizeGB: Math.round((drive.size || 0) / (1024 * 1024 * 1024) * 100) / 100,
      description: drive.description,
      mountpoints: drive.mountpoints || [],
      isSystem: drive.isSystem || false,
      isReadOnly: drive.isReadOnly || false
    };
  }

  /**
   * Get currently connected USB devices from scanner
   * @returns {Promise<Array>} Array of device info objects
   */
  async getConnectedDevices() {
    if (!this.scanner) {
      await this.initScanner();
    }

    const drives = Array.from(this.scanner.drives || []);
    return drives.map(drive => this._mapDriveInfo(drive));
  }

  /**
   * Validate and get info about an image file
   * @param {string} imagePath - Path to the image file
   * @returns {Promise<Object>} Image information
   */
  async validateImage(imagePath) {
    if (!imagePath) {
      throw new Error('Image path is required');
    }

    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    const stats = fs.statSync(imagePath);
    const ext = path.extname(imagePath).toLowerCase();

    // Supported formats
    const supportedFormats = ['.img', '.iso', '.bin', '.raw', '.zip', '.gz', '.xz', '.bz2'];
    if (!supportedFormats.includes(ext)) {
      throw new Error(`Unsupported image format: ${ext}. Supported: ${supportedFormats.join(', ')}`);
    }

    // For compressed images, we can't easily get the uncompressed size without reading
    // So we'll just return the file size and note it's compressed
    const isCompressed = ['.zip', '.gz', '.xz', '.bz2'].includes(ext);

    return {
      path: imagePath,
      name: path.basename(imagePath),
      size: stats.size,
      sizeGB: Math.round(stats.size / (1024 * 1024 * 1024) * 100) / 100,
      extension: ext,
      isCompressed,
      lastModified: stats.mtime
    };
  }

  /**
   * Flash an image to multiple USB devices simultaneously
   * @param {string} imagePath - Path to the image file
   * @param {Array<string>} devicePaths - Array of device paths (e.g., '\\\\.\\PhysicalDrive2')
   * @param {Object} options - Flash options
   * @returns {Promise<Object>} Flash result
   */
  async flashImage(imagePath, devicePaths, options = {}) {
    const {
      verify = true,
      onProgress = () => {},
      onFail = () => {}
    } = options;

    if (!imagePath || !devicePaths || devicePaths.length === 0) {
      throw new Error('Image path and at least one device path are required');
    }

    // Validate image exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    const { sourceDestination, multiWrite } = await getSDK();

    const jobId = `flash_${Date.now()}`;
    this.activeJob = {
      id: jobId,
      status: 'starting',
      imagePath,
      devicePaths,
      startTime: Date.now()
    };

    // Track failed devices
    const failedDevices = new Map();

    try {
      // Create source from image file
      const source = new sourceDestination.File({
        path: imagePath
      });

      // Create destinations for each device
      const destinations = [];
      for (const devicePath of devicePaths) {
        const dest = new sourceDestination.BlockDevice({
          drive: {
            device: devicePath,
            devicePath: devicePath,
            raw: devicePath,
            size: 0, // Will be determined
            isSystem: false,
            isReadOnly: false
          },
          unmountOnSuccess: false,
          write: true,
          direct: true
        });
        destinations.push(dest);
      }

      // Throttle progress updates to every 100ms
      const throttledProgress = throttle((progress) => {
        this.activeJob.status = progress.type || 'flashing';
        this.activeJob.progress = progress;

        onProgress({
          jobId,
          type: progress.type || 'flashing',
          percentage: progress.percentage || 0,
          speed: progress.speed || 0,
          averageSpeed: progress.averageSpeed || 0,
          eta: progress.eta || 0,
          bytesWritten: progress.bytes || 0,
          position: progress.position || 0
        });
      }, 100);

      // Get inner source (handles decompression)
      const innerSource = await source.getInnerSource();

      // Perform the flash
      const result = await multiWrite.pipeSourceToDestinations({
        source: innerSource,
        destinations,
        onFail: (destination, error) => {
          const devicePath = destination.drive?.device || 'unknown';
          failedDevices.set(devicePath, error.message);
          onFail(devicePath, error);
        },
        onProgress: throttledProgress,
        verify
      });

      // Build result
      const flashResult = {
        jobId,
        success: failedDevices.size === 0,
        bytesWritten: result.bytesWritten || 0,
        verified: verify,
        duration: Date.now() - this.activeJob.startTime,
        failedDevices: Array.from(failedDevices.entries()).map(([device, error]) => ({
          device,
          error
        })),
        successfulDevices: devicePaths.filter(p => !failedDevices.has(p))
      };

      this.activeJob = null;
      return flashResult;

    } catch (error) {
      this.activeJob = null;

      // Map common errors to user-friendly messages
      let message = error.message;
      if (error.code === 'ENOENT') {
        message = `Image file not found: ${imagePath}`;
      } else if (error.code === 'EACCES') {
        message = 'Permission denied - run as administrator';
      } else if (error.code === 'EBUSY') {
        message = 'Device is busy - close other applications using the drive';
      }

      throw new Error(`Flash failed: ${message}`);
    }
  }

  /**
   * Cancel the active flash job
   * Note: Cancellation support depends on etcher-sdk version
   */
  async cancelJob() {
    if (!this.activeJob) {
      return { success: false, error: 'No active job to cancel' };
    }

    // etcher-sdk doesn't have built-in cancellation, but we can track the abort
    this.activeJob.status = 'cancelled';

    // The actual cancellation would require stream destruction
    // which may leave the drive in an inconsistent state
    return { success: true, message: 'Cancellation requested' };
  }

  /**
   * Get the current flash job status
   */
  getJobStatus() {
    if (!this.activeJob) {
      return { active: false };
    }

    return {
      active: true,
      jobId: this.activeJob.id,
      status: this.activeJob.status,
      progress: this.activeJob.progress || null,
      elapsed: Date.now() - this.activeJob.startTime
    };
  }

  /**
   * Stop the scanner and cleanup resources
   */
  async dispose() {
    if (this.scanner) {
      this.scanner.stop();
      this.scanner = null;
    }
    this.activeJob = null;
    this.removeAllListeners();
  }
}

// Singleton instance
const flasher = new USBFlasher();

module.exports = {
  flasher,
  USBFlasher
};
