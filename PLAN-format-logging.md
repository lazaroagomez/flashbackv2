# Format Logging Feature - Implementation Plan

## Executive Summary

Add comprehensive logging for USB drive format operations, including a dedicated format history view and format history section in USB drive details.

---

## 1. Database Schema Changes

### Option A: Extend Existing `event_logs` Table (Recommended)

Add a new event type `'formatted'` to the existing enum and store format details in the JSON-like `details` column.

```sql
-- Alter event_type enum to include 'formatted'
ALTER TABLE event_logs
MODIFY COLUMN event_type ENUM(
  'created','assigned','reassigned','updated','marked_pending',
  'repurpose','damaged','lost','retired','reactivated','formatted'
) NOT NULL;
```

**Pros:**
- No new tables needed
- Leverages existing immutable audit trail (triggers prevent delete/update)
- Consistent with existing logging patterns
- `details` column can store structured format info as text

**Format Details String Pattern:**
```
Format: FileSystem=exFAT, Label=USB, Type=Quick, Result=Success, PrevStatus=assigned, PrevTechnician=John Doe
```

### Option B: New Dedicated `format_logs` Table

```sql
CREATE TABLE format_logs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  usb_id INT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  hardware_serial VARCHAR(100),
  hardware_model VARCHAR(255),
  capacity_gb DECIMAL(10,2),
  file_system ENUM('FAT32','NTFS','exFAT') NOT NULL,
  volume_label VARCHAR(32),
  format_type ENUM('quick','full') DEFAULT 'quick',
  result ENUM('success','failed') NOT NULL,
  error_message TEXT,
  previous_status ENUM('assigned','pending_update','damaged','lost','retired'),
  previous_technician_id INT,
  previous_technician_name VARCHAR(100),
  formatted_by VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_usb_id (usb_id),
  KEY idx_timestamp (timestamp),
  KEY idx_formatted_by (formatted_by),
  CONSTRAINT format_logs_ibfk_1 FOREIGN KEY (usb_id) REFERENCES usb_drives(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Immutability triggers (same pattern as event_logs)
CREATE TRIGGER prevent_format_log_delete BEFORE DELETE ON format_logs FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Format logs are immutable';
END;

CREATE TRIGGER prevent_format_log_update BEFORE UPDATE ON format_logs FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Format logs are immutable';
END;
```

**Pros:**
- Strongly typed columns for format-specific data
- Easier to query/filter by format attributes
- Can add indexes on specific fields

**Recommendation:** Start with **Option A** (existing event_logs) for simplicity. If query performance or reporting needs grow, migrate to Option B later.

---

## 2. Backend Service Modifications

### 2.1 Modify `electron/main.cjs` - Update `usb:format` Handler

**Current** (line ~569):
```javascript
ipcMain.handle('usb:format', async (event, diskIndex, label, fileSystem) => {
  try {
    return await usbDetector.formatUSBDrive(diskIndex, label, fileSystem);
  } catch (error) {
    throw new Error(error.message);
  }
});
```

**New** - Add logging and require additional parameters:
```javascript
ipcMain.handle('usb:format', async (event, formatData) => {
  // formatData: { diskIndex, label, fileSystem, dbId, username }
  const { diskIndex, label, fileSystem, dbId, username } = formatData;

  let previousState = null;

  // If registered drive (has dbId), fetch previous state for logging
  if (dbId) {
    previousState = await database.queryOne(`
      SELECT u.*, tech.name as technician_name
      FROM usb_drives u
      LEFT JOIN technicians tech ON u.technician_id = tech.id
      WHERE u.id = ?
    `, [dbId]);
  }

  try {
    const result = await usbDetector.formatUSBDrive(diskIndex, label, fileSystem);

    // Log successful format for registered drives
    if (dbId && previousState) {
      await database.query(
        `INSERT INTO event_logs (usb_id, event_type, details, username) VALUES (?, 'formatted', ?, ?)`,
        [
          dbId,
          buildFormatDetails(fileSystem, label, 'quick', 'success', null, previousState),
          username
        ]
      );
    }

    return result;
  } catch (error) {
    // Log failed format attempt for registered drives
    if (dbId && previousState) {
      await database.query(
        `INSERT INTO event_logs (usb_id, event_type, details, username) VALUES (?, 'formatted', ?, ?)`,
        [
          dbId,
          buildFormatDetails(fileSystem, label, 'quick', 'failed', error.message, previousState),
          username
        ]
      );
    }
    throw new Error(error.message);
  }
});

function buildFormatDetails(fileSystem, label, formatType, result, errorMsg, prevState) {
  let details = `Format ${result.toUpperCase()}: FS=${fileSystem}, Label=${label}, Type=${formatType}`;
  if (prevState) {
    details += `, PrevStatus=${prevState.status}`;
    if (prevState.technician_name) {
      details += `, PrevTech=${prevState.technician_name}`;
    }
  }
  if (errorMsg) {
    details += `, Error=${errorMsg}`;
  }
  return details;
}
```

### 2.2 Add New IPC Handler for Format History

```javascript
// Get format history (all formatted events)
ipcMain.handle('formatLog:getAll', async (event, filters = {}) => {
  let sql = `
    SELECT el.*, u.usb_id, u.hardware_serial, u.hardware_model, u.capacity_gb,
           m.name as model_name
    FROM event_logs el
    JOIN usb_drives u ON el.usb_id = u.id
    LEFT JOIN models m ON u.model_id = m.id
    WHERE el.event_type = 'formatted'
  `;
  const params = [];

  if (filters.dateFrom) {
    sql += ' AND el.timestamp >= ?';
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    sql += ' AND el.timestamp <= ?';
    params.push(filters.dateTo);
  }
  if (filters.username) {
    sql += ' AND el.username LIKE ?';
    params.push(`%${filters.username}%`);
  }
  if (filters.usbId) {
    sql += ' AND u.usb_id LIKE ?';
    params.push(`%${filters.usbId}%`);
  }

  sql += ' ORDER BY el.timestamp DESC';

  return database.query(sql, params);
});

// Get format history for specific USB drive
ipcMain.handle('formatLog:getByUsb', async (event, usbId) => {
  return database.query(`
    SELECT * FROM event_logs
    WHERE usb_id = ? AND event_type = 'formatted'
    ORDER BY timestamp DESC
  `, [usbId]);
});
```

### 2.3 Update `electron/preload.cjs`

Add new API methods:
```javascript
// Format logs
formatUsbDrive: (formatData) => ipcRenderer.invoke('usb:format', formatData),
getFormatHistory: (filters) => ipcRenderer.invoke('formatLog:getAll', filters),
getUsbFormatHistory: (usbId) => ipcRenderer.invoke('formatLog:getByUsb', usbId),
```

### 2.4 Update `src/lib/api.js`

```javascript
// Format with logging
formatUsbDrive: (formatData) => window.api.formatUsbDrive(toPlain(formatData)),

// Format history
getFormatHistory: (filters = {}) => window.api.getFormatHistory(toPlain(filters)),
getUsbFormatHistory: (usbId) => window.api.getUsbFormatHistory(usbId),
```

---

## 3. Frontend Components

### 3.1 New View: `src/views/format-history/FormatHistoryView.svelte`

Features:
- Table with columns: Timestamp, USB ID, Model, Capacity, File System, Label, Result, Formatted By
- Date range filter (from/to)
- Search by USB ID or technician
- Sortable columns
- Click row to navigate to USB detail
- Optional: Export to CSV button

### 3.2 Modify `ConnectedDrivesView.svelte`

**Changes needed:**
1. Import session store to get username
2. Update `handleSingleFormat()` and `handleBulkFormat()` to pass required data
3. Add format options (file system selector, label input) - currently hardcoded

```javascript
// Before
await api.formatUsbDrive(formatDrive.diskIndex, 'USB', 'exFAT');

// After
await api.formatUsbDrive({
  diskIndex: formatDrive.diskIndex,
  label: formatLabel,  // from input
  fileSystem: formatFileSystem,  // from select
  dbId: formatDrive.dbId,  // null for unregistered
  username: session.username
});
```

### 3.3 Modify `UsbDriveDetail.svelte`

Add "Format History" section below existing "Event History":

```svelte
<!-- Format History Section -->
{#if formatLogs.length > 0}
  <div class="card bg-base-100 shadow">
    <div class="card-body">
      <h3 class="card-title">Format History</h3>
      <div class="overflow-x-auto">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Time</th>
              <th>File System</th>
              <th>Result</th>
              <th>Formatted By</th>
            </tr>
          </thead>
          <tbody>
            {#each formatLogs as log}
              <tr>
                <td>{formatDate(log.timestamp)}</td>
                <td>{parseFormatDetails(log.details).fileSystem}</td>
                <td>
                  <span class="badge" class:badge-success={log.details.includes('SUCCESS')} class:badge-error={log.details.includes('FAILED')}>
                    {log.details.includes('SUCCESS') ? 'Success' : 'Failed'}
                  </span>
                </td>
                <td>{log.username}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
{/if}
```

### 3.4 Update Navigation

**Sidebar.svelte** - Add to main menu:
```javascript
{ id: 'format-history', label: 'Format History', icon: '...' }
```

**App.svelte** - Add route:
```svelte
{:else if navigation.currentView === 'format-history'}
  <FormatHistoryView {navigate} />
```

---

## 4. User Flow

### Format Flow (Updated)
1. User navigates to Connected Drives
2. Selects drive(s) to format
3. Clicks "Format" button
4. **NEW:** Confirmation dialog shows format options:
   - File System: FAT32 / NTFS / exFAT (default)
   - Label: text input (default "USB")
5. User confirms
6. Format executes
7. **NEW:** If registered drive, log entry created with:
   - Timestamp (auto)
   - USB ID, hardware info (from DB)
   - Format details (file system, label, result)
   - Formatted by (session.username)
   - Previous state (status, technician)
8. Success/error toast shown

### View Format History Flow
1. User clicks "Format History" in sidebar
2. Table loads with all format events (newest first)
3. User can filter by date range, search by USB ID/technician
4. Clicking a row navigates to USB Drive Detail

---

## 5. Answers to Questions

| Question | Recommendation |
|----------|----------------|
| Should formatting require confirmation with technician ID? | **No** - Use `session.username` which is already tracked. Requiring separate technician selection adds friction. |
| Should we log attempted formats that failed? | **Yes** - Failed attempts are valuable for audit/debugging. Log with result='failed' and error message. |
| Should there be a "reason for format" field? | **No for MVP** - Optional future enhancement. Would add friction to the common case. |
| Do we need to track what was on the USB before formatting? | **Partially** - Track previous status and technician assignment. Actual file contents not feasible/useful. |
| Should supervisors be notified of certain format events? | **No for MVP** - The format history view provides visibility. Real-time notifications would require additional infrastructure. |

---

## 6. Implementation Order

1. **Database** - Add 'formatted' to event_type enum
2. **Backend** - Modify usb:format handler, add format history handlers
3. **Preload/API** - Update IPC bindings
4. **ConnectedDrivesView** - Update format calls with new data structure
5. **UsbDriveDetail** - Add format history section
6. **FormatHistoryView** - New view component
7. **Navigation** - Add route and sidebar item
8. **Testing** - Manual testing of all flows

---

## 7. Files to Modify/Create

### Modify:
- `flashback_usb.sql` - ALTER event_type enum
- `electron/main.cjs` - Update usb:format, add formatLog handlers
- `electron/preload.cjs` - Add new IPC methods
- `src/lib/api.js` - Add new API methods
- `src/views/connected-drives/ConnectedDrivesView.svelte` - Update format calls
- `src/views/usb-drives/UsbDriveDetail.svelte` - Add format history section
- `src/lib/components/Sidebar.svelte` - Add menu item
- `src/App.svelte` - Add route

### Create:
- `src/views/format-history/FormatHistoryView.svelte` - New view

---

## 8. Estimated Scope

- Database: 1 ALTER statement
- Backend: ~100 lines new/modified
- Frontend: ~300 lines new/modified (mostly new view)
- No new dependencies required
