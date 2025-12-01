const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Execute a PowerShell command and return parsed JSON result
 * Uses Base64 encoding to avoid escaping issues with complex scripts
 * @param {string} script - PowerShell script to execute
 * @param {number} timeout - Command timeout in milliseconds
 * @returns {Promise<any>} Parsed JSON result or null
 */
async function runPowerShell(script, timeout = 30000) {
  // Wrap script to suppress progress output and ensure clean JSON
  const wrappedScript = `$ProgressPreference = 'SilentlyContinue'; ${script.trim()}`;

  // Encode script as Base64 to avoid escaping issues
  const encodedScript = Buffer.from(wrappedScript, 'utf16le').toString('base64');
  const command = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encodedScript}`;

  try {
    const { stdout, stderr } = await execAsync(command, { timeout });

    // Only treat stderr as error if it contains actual error keywords (not progress/CLIXML)
    if (stderr && !stderr.includes('CLIXML') && !stderr.includes('progress')) {
      const lowerStderr = stderr.toLowerCase();
      if (lowerStderr.includes('error') || lowerStderr.includes('exception') || lowerStderr.includes('cannot')) {
        throw new Error(stderr);
      }
    }

    if (!stdout.trim()) return null;

    return JSON.parse(stdout);
  } catch (error) {
    if (error.killed) {
      throw new Error('Operation timed out');
    }
    if (error.message.includes('Access is denied')) {
      throw new Error('Access denied - run as administrator');
    }
    // Handle empty JSON parse
    if (error.message.includes('SyntaxError') || error.message.includes('Unexpected end of JSON')) {
      return null;
    }
    throw error;
  }
}

/**
 * Normalize PowerShell result to always be an array
 * @param {any} result - PowerShell result (may be single object or array)
 * @returns {Array} Array of results
 */
function normalizeToArray(result) {
  if (result === null || result === undefined) return [];
  return Array.isArray(result) ? result : [result];
}

/**
 * Detect USB drives connected to the system using PowerShell Get-Disk
 * Enhanced with safety properties (IsSystem, IsBoot, IsReadOnly)
 * @returns {Promise<Array>} Array of USB drive info objects
 */
async function detectUSBDrives() {
  const script = `
    Get-Disk | Where-Object { $_.BusType -eq 'USB' } | ForEach-Object {
      $disk = $_
      $physicalDisk = Get-PhysicalDisk | Where-Object { $_.DeviceId -eq $disk.Number } | Select-Object -First 1
      [PSCustomObject]@{
        Number = $disk.Number
        FriendlyName = $disk.FriendlyName
        Model = $disk.Model
        SerialNumber = $disk.SerialNumber
        SizeGB = [math]::Round($disk.Size/1GB, 2)
        PartitionStyle = $disk.PartitionStyle.ToString()
        HealthStatus = $disk.HealthStatus.ToString()
        OperationalStatus = $disk.OperationalStatus.ToString()
        IsSystem = $disk.IsSystem
        IsBoot = $disk.IsBoot
        IsReadOnly = $disk.IsReadOnly
        IsOffline = $disk.IsOffline
        BusType = $disk.BusType.ToString()
        MediaType = if ($physicalDisk) { $physicalDisk.MediaType } else { 'Unknown' }
      }
    } | ConvertTo-Json -Depth 2
  `;

  try {
    const result = await runPowerShell(script);
    return normalizeToArray(result);
  } catch (error) {
    console.error('USB detection error:', error.message);
    return [];
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
      model: d.Model || d.FriendlyName || 'Unknown',
      serial: d.SerialNumber || '',
      sizeGB: d.SizeGB || 0,
      diskIndex: d.Number,
      partitionStyle: d.PartitionStyle || 'Unknown',
      healthStatus: d.HealthStatus || 'Unknown',
      isSystem: d.IsSystem || false,
      isBoot: d.IsBoot || false,
      isReadOnly: d.IsReadOnly || false,
      isOffline: d.IsOffline || false,
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

  // Return drives with registration status and safety properties
  return drives.map(d => {
    const registered = serialMap.get(d.SerialNumber);
    return {
      model: d.Model || d.FriendlyName || 'Unknown',
      serial: d.SerialNumber || '',
      sizeGB: d.SizeGB || 0,
      diskIndex: d.Number,
      partitionStyle: d.PartitionStyle || 'Unknown',
      healthStatus: d.HealthStatus || 'Unknown',
      isSystem: d.IsSystem || false,
      isBoot: d.IsBoot || false,
      isReadOnly: d.IsReadOnly || false,
      isOffline: d.IsOffline || false,
      isRegistered: !!registered,
      dbId: registered?.id || null,
      usbId: registered?.usbId || null
    };
  });
}

/**
 * Validate that a disk is a USB drive and safe for operations
 * @param {number} diskNumber - The disk number to validate
 * @returns {Promise<{isValid: boolean, isUSB: boolean, isSystem: boolean, isBoot: boolean, isReadOnly: boolean, error?: string}>}
 */
async function validateUsbDisk(diskNumber) {
  if (typeof diskNumber !== 'number' || diskNumber < 0) {
    return { isValid: false, isUSB: false, isSystem: false, isBoot: false, isReadOnly: false, error: 'Invalid disk number' };
  }

  const script = `
    $disk = Get-Disk -Number ${diskNumber} -ErrorAction SilentlyContinue
    if (-not $disk) {
      [PSCustomObject]@{ Error = 'Disk not found' } | ConvertTo-Json
    } else {
      [PSCustomObject]@{
        IsUSB = ($disk.BusType -eq 'USB')
        IsSystem = $disk.IsSystem
        IsBoot = $disk.IsBoot
        IsReadOnly = $disk.IsReadOnly
        IsOffline = $disk.IsOffline
        BusType = $disk.BusType.ToString()
      } | ConvertTo-Json
    }
  `;

  try {
    const result = await runPowerShell(script);

    if (!result) {
      return { isValid: false, isUSB: false, isSystem: false, isBoot: false, isReadOnly: false, error: 'Failed to get disk info' };
    }

    if (result.Error) {
      return { isValid: false, isUSB: false, isSystem: false, isBoot: false, isReadOnly: false, error: result.Error };
    }

    // Validate the disk is safe for operations
    const errors = [];
    if (!result.IsUSB) errors.push(`Not a USB drive (BusType: ${result.BusType})`);
    if (result.IsSystem) errors.push('System disk - cannot modify');
    if (result.IsBoot) errors.push('Boot disk - cannot modify');
    if (result.IsReadOnly) errors.push('Disk is read-only');

    return {
      isValid: errors.length === 0,
      isUSB: result.IsUSB,
      isSystem: result.IsSystem,
      isBoot: result.IsBoot,
      isReadOnly: result.IsReadOnly,
      isOffline: result.IsOffline,
      error: errors.length > 0 ? errors.join('; ') : null
    };
  } catch (error) {
    return { isValid: false, isUSB: false, isSystem: false, isBoot: false, isReadOnly: false, error: error.message };
  }
}

/**
 * Get partition and volume information for a disk
 * @param {number} diskNumber - The disk number
 * @returns {Promise<Array>} Array of partition info
 */
async function getDiskPartitions(diskNumber) {
  const script = `
    Get-Partition -DiskNumber ${diskNumber} -ErrorAction SilentlyContinue | ForEach-Object {
      $partition = $_
      $volume = Get-Volume -Partition $partition -ErrorAction SilentlyContinue
      [PSCustomObject]@{
        PartitionNumber = $partition.PartitionNumber
        DriveLetter = $partition.DriveLetter
        Size = $partition.Size
        SizeGB = [math]::Round($partition.Size/1GB, 2)
        Type = $partition.Type.ToString()
        FileSystem = if ($volume) { $volume.FileSystem } else { $null }
        FileSystemLabel = if ($volume) { $volume.FileSystemLabel } else { $null }
      }
    } | ConvertTo-Json -Depth 2
  `;

  try {
    const result = await runPowerShell(script);
    return normalizeToArray(result);
  } catch (error) {
    console.error('Get partitions error:', error.message);
    return [];
  }
}

/**
 * Format a USB drive using PowerShell cmdlets
 * WARNING: This destroys all data on the drive!
 * @param {number} diskNumber - The disk number to format
 * @param {Object} options - Format options
 * @param {string} options.partitionStyle - 'MBR' or 'GPT' (default: 'MBR')
 * @param {string} options.fileSystem - 'NTFS', 'FAT32', or 'exFAT' (default: 'exFAT')
 * @param {string} options.label - Volume label (default: 'USB')
 * @returns {Promise<{success: boolean, message: string, driveLetter?: string}>}
 */
async function formatUSBDrive(diskNumber, options = {}) {
  const {
    partitionStyle = 'MBR',
    fileSystem = 'exFAT',
    label = 'USB'
  } = options;

  // Validate inputs
  if (typeof diskNumber !== 'number' || diskNumber < 0) {
    throw new Error('Invalid disk number');
  }

  const validPartitionStyles = ['MBR', 'GPT'];
  if (!validPartitionStyles.includes(partitionStyle)) {
    throw new Error(`Invalid partition style. Must be one of: ${validPartitionStyles.join(', ')}`);
  }

  const validFileSystems = ['NTFS', 'FAT32', 'exFAT'];
  if (!validFileSystems.includes(fileSystem)) {
    throw new Error(`Invalid file system. Must be one of: ${validFileSystems.join(', ')}`);
  }

  // Sanitize label (max 11 chars for FAT32/exFAT, 32 for NTFS)
  const maxLabelLength = fileSystem === 'NTFS' ? 32 : 11;
  const safeLabel = label.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, maxLabelLength) || 'USB';

  // First validate the disk is safe to format
  const validation = await validateUsbDisk(diskNumber);
  if (!validation.isValid) {
    throw new Error(`Disk validation failed: ${validation.error}`);
  }

  // Bring disk online if offline
  if (validation.isOffline) {
    await runPowerShell(`Set-Disk -Number ${diskNumber} -IsOffline $false`, 30000);
  }

  // PowerShell script to format the drive
  // Simplified approach: always clear if not RAW, then initialize fresh
  const script = `
    $ErrorActionPreference = 'Stop'
    try {
      $disk = Get-Disk -Number ${diskNumber}

      # Step 1: Clear disk if not RAW (always clears to RAW state)
      if ($disk.PartitionStyle -ne 'RAW') {
        Clear-Disk -Number ${diskNumber} -RemoveData -RemoveOEM -Confirm:$false
        # Wait for Windows to update disk state
        Start-Sleep -Seconds 1
        # Refresh disk object to get updated state
        $disk = Get-Disk -Number ${diskNumber}
      }

      # Step 2: Initialize only if disk is RAW
      if ($disk.PartitionStyle -eq 'RAW') {
        Initialize-Disk -Number ${diskNumber} -PartitionStyle ${partitionStyle}
      }

      # Step 3: Create partition with drive letter
      $partition = New-Partition -DiskNumber ${diskNumber} -UseMaximumSize -AssignDriveLetter

      # Step 4: Format the volume
      Format-Volume -DriveLetter $partition.DriveLetter -FileSystem ${fileSystem} -NewFileSystemLabel '${safeLabel}' -Confirm:$false | Out-Null

      # Return result
      [PSCustomObject]@{
        Success = $true
        DriveLetter = $partition.DriveLetter
        Message = 'Drive formatted successfully'
      } | ConvertTo-Json
    } catch {
      [PSCustomObject]@{
        Success = $false
        Error = $_.Exception.Message
      } | ConvertTo-Json
    }
  `;

  try {
    const result = await runPowerShell(script, 120000); // 2 minute timeout

    if (!result) {
      throw new Error('Format operation returned no result');
    }

    if (!result.Success) {
      throw new Error(result.Error || 'Format failed');
    }

    return {
      success: true,
      message: `Drive formatted successfully as ${fileSystem} (${partitionStyle})`,
      driveLetter: result.DriveLetter
    };
  } catch (error) {
    throw new Error(`Format failed: ${error.message}`);
  }
}

/**
 * Clear a disk (remove all partitions and data)
 * @param {number} diskNumber - The disk number to clear
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function clearDisk(diskNumber) {
  // Validate first
  const validation = await validateUsbDisk(diskNumber);
  if (!validation.isValid) {
    throw new Error(`Disk validation failed: ${validation.error}`);
  }

  const script = `
    $ErrorActionPreference = 'Stop'
    try {
      Clear-Disk -Number ${diskNumber} -RemoveData -RemoveOEM -Confirm:$false
      [PSCustomObject]@{ Success = $true } | ConvertTo-Json
    } catch {
      [PSCustomObject]@{ Success = $false; Error = $_.Exception.Message } | ConvertTo-Json
    }
  `;

  const result = await runPowerShell(script, 60000);

  if (!result || !result.Success) {
    throw new Error(result?.Error || 'Clear disk failed');
  }

  return { success: true, message: 'Disk cleared successfully' };
}

module.exports = {
  detectUSBDrives,
  detectUSBDrivesWithStatus,
  validateUsbDisk,
  getDiskPartitions,
  formatUSBDrive,
  clearDisk
};
