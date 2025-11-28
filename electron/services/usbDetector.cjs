const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const execAsync = promisify(exec);

/**
 * Detect USB drives connected to the system using PowerShell
 * @returns {Promise<Array>} Array of USB drive info objects
 */
async function detectUSBDrives() {
  const psCommand = `powershell -Command "Get-CimInstance -ClassName Win32_DiskDrive | Where-Object { $_.InterfaceType -eq 'USB' } | Select-Object Model, SerialNumber, @{Name='SizeGB'; Expression={[math]::Round($_.Size/1GB, 2)}}, Index | ConvertTo-Json"`;

  try {
    const { stdout } = await execAsync(psCommand);
    if (!stdout.trim()) return [];

    const result = JSON.parse(stdout);
    // PowerShell returns single object (not array) when only one result
    return Array.isArray(result) ? result : [result];
  } catch (error) {
    // Handle case where no USB drives are connected (empty result)
    if (error.message.includes('SyntaxError')) {
      return [];
    }
    throw error;
  }
}

/**
 * Detect USB drives and check their registration status in database
 * @param {Object} db - Database module with query method
 * @returns {Promise<Array>} Array of USB drives with registration status
 */
async function detectUSBDrivesWithStatus(db) {
  const drives = await detectUSBDrives();
  if (drives.length === 0) return [];

  // Get serials from detected drives (filter out empty/null serials)
  const serials = drives.map(d => d.SerialNumber).filter(Boolean);

  // If no drives have serials, return all as unregistered
  if (serials.length === 0) {
    return drives.map(d => ({
      model: d.Model || 'Unknown',
      serial: d.SerialNumber || '',
      sizeGB: d.SizeGB || 0,
      diskIndex: d.Index,
      isRegistered: false,
      dbId: null,
      usbId: null
    }));
  }

  // Query database for matching serials
  const placeholders = serials.map(() => '?').join(',');
  const rows = await db.query(
    `SELECT id, usb_id, hardware_serial FROM usb_drives WHERE hardware_serial IN (${placeholders})`,
    serials
  );

  // Create lookup map for registered drives
  const serialMap = new Map(rows.map(r => [r.hardware_serial, { id: r.id, usbId: r.usb_id }]));

  // Return drives with registration status
  return drives.map(d => {
    const registered = serialMap.get(d.SerialNumber);
    return {
      model: d.Model || 'Unknown',
      serial: d.SerialNumber || '',
      sizeGB: d.SizeGB || 0,
      diskIndex: d.Index,
      isRegistered: !!registered,
      dbId: registered?.id || null,
      usbId: registered?.usbId || null
    };
  });
}

/**
 * Format a USB drive by disk index using Windows diskpart
 * WARNING: This destroys all data on the drive!
 * @param {number} diskIndex - The disk index to format
 * @param {string} label - Volume label (default: 'USB')
 * @param {string} fileSystem - File system type: 'NTFS', 'FAT32', or 'exFAT' (default: 'exFAT')
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function formatUSBDrive(diskIndex, label = 'USB', fileSystem = 'exFAT') {
  // Validate inputs
  if (typeof diskIndex !== 'number' || diskIndex < 0) {
    throw new Error('Invalid disk index');
  }

  const validFileSystems = ['NTFS', 'FAT32', 'exFAT'];
  if (!validFileSystems.includes(fileSystem)) {
    throw new Error(`Invalid file system. Must be one of: ${validFileSystems.join(', ')}`);
  }

  // Sanitize label (remove special characters, max 11 chars for FAT32/exFAT)
  const safeLabel = label.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 11) || 'USB';

  // Create diskpart script
  const diskpartScript = [
    `select disk ${diskIndex}`,
    'clean',
    'create partition primary',
    `format fs=${fileSystem} label="${safeLabel}" quick`,
    'assign'
  ].join('\n');

  // Write script to temp file
  const scriptPath = path.join(os.tmpdir(), `diskpart_${Date.now()}.txt`);

  try {
    fs.writeFileSync(scriptPath, diskpartScript);

    const { stdout, stderr } = await execAsync(
      `diskpart /s "${scriptPath}"`,
      { timeout: 120000 } // 2 minute timeout
    );

    // Check for success indicators in output
    const output = stdout.toLowerCase();
    if (output.includes('diskpart succeeded') || output.includes('successfully formatted')) {
      return { success: true, message: `Drive formatted successfully as ${fileSystem}` };
    }

    // Check for errors
    if (stderr || output.includes('error') || output.includes('failed')) {
      throw new Error(stderr || stdout);
    }

    return { success: true, message: `Drive formatted successfully as ${fileSystem}` };
  } catch (error) {
    throw new Error(`Format failed: ${error.message}`);
  } finally {
    // Cleanup temp script file
    try {
      if (fs.existsSync(scriptPath)) {
        fs.unlinkSync(scriptPath);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

module.exports = { detectUSBDrives, detectUSBDrivesWithStatus, formatUSBDrive };
