const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Import services (using .cjs extensions)
const database = require('./services/database.cjs');
const usbIdGenerator = require('./services/usbIdGenerator.cjs');
const pdfGenerator = require('./services/pdfGenerator.cjs');
const eventLogger = require('./services/eventLogger.cjs');
const { createCrudHandlers, registerCrudHandlers } = require('./services/crudFactory.cjs');
const usbDetector = require('./services/usbDetector.cjs');
const {
  appendModelIdCondition,
  USB_DRIVE_BASE_SELECT,
  USB_STICKER_SELECT,
  namesAreSimilar,
  toPlainObject
} = require('./services/queryHelpers.cjs');

// Application password from environment variable (with fallback)
const APP_PASSWORD = process.env.APP_PASSWORD || 'flashback2024';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, '../static/favicon.ico')
  });

  // Load app
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// =====================================================
// Authentication IPC Handlers
// =====================================================
ipcMain.handle('auth:validate', async (event, password) => {
  return password === APP_PASSWORD;
});

// =====================================================
// Platform IPC Handlers (using CRUD factory)
// =====================================================
const platformHandlers = createCrudHandlers({
  tableName: 'platforms',
  entityName: 'platform',
  createColumns: ['name'],
  updateColumns: ['name', 'status']
});
registerCrudHandlers(ipcMain, 'platform', platformHandlers);

// =====================================================
// USB Type IPC Handlers
// =====================================================
ipcMain.handle('usbType:getAll', async (event, platformId = null, activeOnly = false) => {
  let sql = `
    SELECT ut.*, p.name as platform_name
    FROM usb_types ut
    JOIN platforms p ON ut.platform_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (platformId) {
    sql += ' AND ut.platform_id = ?';
    params.push(platformId);
  }
  if (activeOnly) {
    sql += " AND ut.status = 'active'";
  }
  sql += ' ORDER BY p.name, ut.name';

  return database.query(sql, params);
});

ipcMain.handle('usbType:checkSimilar', async (event, name, platformId = null) => {
  let sql = 'SELECT ut.id, ut.name, p.name as platform_name FROM usb_types ut JOIN platforms p ON ut.platform_id = p.id';
  const params = [];
  if (platformId) {
    sql += ' WHERE ut.platform_id = ?';
    params.push(platformId);
  }
  const types = await database.query(sql, params);
  const similar = types.filter(t => namesAreSimilar(t.name, name));
  return toPlainObject(similar);
});

ipcMain.handle('usbType:create', async (event, data) => {
  const sql = `
    INSERT INTO usb_types (platform_id, name, requires_model, supports_legacy)
    VALUES (?, ?, ?, ?)
  `;
  const result = await database.query(sql, [
    data.platform_id,
    data.name,
    data.requires_model || false,
    data.supports_legacy || false
  ]);
  return toPlainObject({ id: result.insertId, ...data });
});

ipcMain.handle('usbType:update', async (event, id, data) => {
  const sql = `
    UPDATE usb_types
    SET platform_id = ?, name = ?, requires_model = ?, supports_legacy = ?, status = ?
    WHERE id = ?
  `;
  await database.query(sql, [
    data.platform_id,
    data.name,
    data.requires_model,
    data.supports_legacy,
    data.status,
    id
  ]);
  return toPlainObject({ id, ...data });
});

// =====================================================
// Model IPC Handlers (using CRUD factory)
// =====================================================
const modelHandlers = createCrudHandlers({
  tableName: 'models',
  entityName: 'model',
  createColumns: ['name', 'model_number', 'notes'],
  updateColumns: ['name', 'model_number', 'notes', 'status'],
  similarSelectColumns: ['id', 'name', 'model_number']
});
registerCrudHandlers(ipcMain, 'model', modelHandlers);

// Custom handler for getting USB drives by model
ipcMain.handle('model:getUsbDrives', async (event, modelId) => {
  const sql = `
    SELECT u.*,
           p.name as platform_name,
           t.name as usb_type_name,
           v.version_code,
           tech.name as technician_name,
           tech.status as technician_status
    FROM usb_drives u
    JOIN platforms p ON u.platform_id = p.id
    JOIN usb_types t ON u.usb_type_id = t.id
    JOIN versions v ON u.version_id = v.id
    LEFT JOIN technicians tech ON u.technician_id = tech.id
    WHERE u.model_id = ?
    ORDER BY u.usb_id
  `;
  return database.query(sql, [modelId]);
});

// =====================================================
// Version IPC Handlers
// =====================================================
ipcMain.handle('version:getAll', async (event, usbTypeId = null, modelId = null) => {
  let sql = `
    SELECT v.*,
           t.name as usb_type_name,
           t.requires_model,
           m.name as model_name
    FROM versions v
    JOIN usb_types t ON v.usb_type_id = t.id
    LEFT JOIN models m ON v.model_id = m.id
    WHERE 1=1
  `;
  const params = [];

  if (usbTypeId) {
    sql += ' AND v.usb_type_id = ?';
    params.push(usbTypeId);
  }
  if (modelId !== null) {
    if (modelId === 'null') {
      sql += ' AND v.model_id IS NULL';
    } else {
      sql += ' AND v.model_id = ?';
      params.push(modelId);
    }
  }
  sql += ' ORDER BY t.name, m.name, v.version_code';

  return database.query(sql, params);
});

ipcMain.handle('version:checkSimilar', async (event, versionCode, usbTypeId, modelId = null) => {
  let sql = 'SELECT id, version_code FROM versions WHERE usb_type_id = ?';
  const params = [usbTypeId];
  if (modelId) {
    sql += ' AND model_id = ?';
    params.push(modelId);
  } else {
    sql += ' AND model_id IS NULL';
  }
  const versions = await database.query(sql, params);
  const similar = versions.filter(v => namesAreSimilar(v.version_code, versionCode));
  return toPlainObject(similar);
});

ipcMain.handle('version:create', async (event, data) => {
  const sql = `
    INSERT INTO versions (usb_type_id, model_id, version_code, is_current, is_legacy_valid, official_link, internal_link, comments)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const result = await database.query(sql, [
    data.usb_type_id,
    data.model_id || null,
    data.version_code,
    data.is_current || false,
    data.is_legacy_valid || false,
    data.official_link || null,
    data.internal_link || null,
    data.comments || null
  ]);

  // If marked as current, trigger cascade logic
  if (data.is_current) {
    await handleSetCurrentVersion(result.insertId, data.usb_type_id, data.model_id);
  }

  return toPlainObject({ id: result.insertId, ...data });
});

ipcMain.handle('version:update', async (event, id, data) => {
  const sql = `
    UPDATE versions
    SET version_code = ?, is_current = ?, is_legacy_valid = ?, official_link = ?, internal_link = ?, comments = ?, status = ?
    WHERE id = ?
  `;
  await database.query(sql, [
    data.version_code,
    data.is_current,
    data.is_legacy_valid,
    data.official_link,
    data.internal_link,
    data.comments,
    data.status || 'active',
    id
  ]);

  return toPlainObject({ id, ...data });
});

ipcMain.handle('version:toggleStatus', async (event, id) => {
  // Toggle between 'active' and 'inactive'
  const version = await database.queryOne('SELECT status FROM versions WHERE id = ?', [id]);
  if (!version) throw new Error('Version not found');

  const newStatus = version.status === 'active' ? 'inactive' : 'active';
  await database.query('UPDATE versions SET status = ? WHERE id = ?', [newStatus, id]);

  return toPlainObject({ id, status: newStatus });
});

ipcMain.handle('version:setCurrent', async (event, id, username) => {
  // Get version details first
  const version = await database.queryOne('SELECT * FROM versions WHERE id = ?', [id]);
  if (!version) throw new Error('Version not found');

  await handleSetCurrentVersion(id, version.usb_type_id, version.model_id, username);
  return toPlainObject({ success: true });
});

async function handleSetCurrentVersion(versionId, usbTypeId, modelId, username = 'System') {
  // Unset previous current version for this type/model combination
  let unsql = 'UPDATE versions SET is_current = FALSE WHERE usb_type_id = ? AND is_current = TRUE';
  const unparams = [usbTypeId];

  if (modelId) {
    unsql += ' AND model_id = ?';
    unparams.push(modelId);
  } else {
    unsql += ' AND model_id IS NULL';
  }

  await database.query(unsql, unparams);

  // Set new current version
  await database.query(
    'UPDATE versions SET is_current = TRUE, marked_current_at = NOW() WHERE id = ?',
    [versionId]
  );

  // Get the new current version's created_at to compare
  const currentVersion = await database.queryOne('SELECT created_at FROM versions WHERE id = ?', [versionId]);

  // Cascade: Mark USB drives as pending_update only if they have OLDER versions
  // A version is considered older if it was created before the new current version
  let cascadeSql = `
    SELECT u.id, u.usb_id, v.version_code as old_version
    FROM usb_drives u
    JOIN versions v ON u.version_id = v.id
    WHERE u.usb_type_id = ?
    AND u.version_id != ?
    AND v.is_legacy_valid = FALSE
    AND v.created_at < ?
    AND u.status NOT IN ('lost', 'retired')
  `;
  const cascadeParams = [usbTypeId, versionId, currentVersion.created_at];

  if (modelId) {
    cascadeSql += ' AND u.model_id = ?';
    cascadeParams.push(modelId);
  } else {
    cascadeSql += ' AND u.model_id IS NULL';
  }

  const drivesToUpdate = await database.query(cascadeSql, cascadeParams);

  // Get new version code for logging
  const newVersion = await database.queryOne('SELECT version_code FROM versions WHERE id = ?', [versionId]);

  // Update each drive and create event log
  for (const drive of drivesToUpdate) {
    await database.query(
      "UPDATE usb_drives SET status = 'pending_update' WHERE id = ?",
      [drive.id]
    );

    await database.query(
      'INSERT INTO event_logs (usb_id, event_type, details, username) VALUES (?, ?, ?, ?)',
      [
        drive.id,
        'marked_pending',
        `Marked for update: current version ${drive.old_version} is outdated (new current: ${newVersion.version_code})`,
        username
      ]
    );
  }

  // Also: Clear pending_update for drives with NEWER versions (rollback scenario)
  // If a drive has a version created AFTER the new current, and is pending_update, set back to ready
  let clearPendingSql = `
    SELECT u.id, u.usb_id, v.version_code as drive_version
    FROM usb_drives u
    JOIN versions v ON u.version_id = v.id
    WHERE u.usb_type_id = ?
    AND u.version_id != ?
    AND v.created_at > ?
    AND u.status = 'pending_update'
  `;
  const clearParams = [usbTypeId, versionId, currentVersion.created_at];

  if (modelId) {
    clearPendingSql += ' AND u.model_id = ?';
    clearParams.push(modelId);
  } else {
    clearPendingSql += ' AND u.model_id IS NULL';
  }

  const drivesToClear = await database.query(clearPendingSql, clearParams);

  for (const drive of drivesToClear) {
    await database.query(
      "UPDATE usb_drives SET status = 'ready' WHERE id = ?",
      [drive.id]
    );

    await database.query(
      'INSERT INTO event_logs (usb_id, event_type, details, username) VALUES (?, ?, ?, ?)',
      [
        drive.id,
        'status_cleared',
        `Cleared pending status: drive version ${drive.drive_version} is newer than current ${newVersion.version_code}`,
        username
      ]
    );
  }

  return { markedPending: drivesToUpdate.length, clearedPending: drivesToClear.length };
}

// =====================================================
// Technician IPC Handlers (using CRUD factory)
// =====================================================
const technicianHandlers = createCrudHandlers({
  tableName: 'technicians',
  entityName: 'technician',
  createColumns: ['name', 'notes'],
  updateColumns: ['name', 'notes', 'status'],
  similarSelectColumns: ['id', 'name', 'notes']
});
registerCrudHandlers(ipcMain, 'technician', technicianHandlers);

// Custom handler for getting USB drives by technician
ipcMain.handle('technician:getUsbDrives', async (event, technicianId) => {
  const sql = `
    SELECT u.*,
           p.name as platform_name,
           t.name as usb_type_name,
           m.name as model_name,
           v.version_code
    FROM usb_drives u
    JOIN platforms p ON u.platform_id = p.id
    JOIN usb_types t ON u.usb_type_id = t.id
    LEFT JOIN models m ON u.model_id = m.id
    JOIN versions v ON u.version_id = v.id
    WHERE u.technician_id = ?
    ORDER BY u.usb_id
  `;
  return database.query(sql, [technicianId]);
});

// =====================================================
// USB Drive IPC Handlers
// =====================================================
ipcMain.handle('usb:getAll', async (event, filters = {}) => {
  let sql = `
    SELECT u.id, u.usb_id, u.status, u.custom_text, u.created_at, u.updated_at,
           p.id as platform_id, p.name as platform_name,
           t.id as usb_type_id, t.name as usb_type_name, t.requires_model,
           m.id as model_id, m.name as model_name, m.model_number,
           v.id as version_id, v.version_code, v.is_current as version_is_current, v.is_legacy_valid,
           tech.id as technician_id, tech.name as technician_name, tech.status as technician_status
    FROM usb_drives u
    JOIN platforms p ON u.platform_id = p.id
    JOIN usb_types t ON u.usb_type_id = t.id
    LEFT JOIN models m ON u.model_id = m.id
    JOIN versions v ON u.version_id = v.id
    LEFT JOIN technicians tech ON u.technician_id = tech.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.platform_id) {
    sql += ' AND u.platform_id = ?';
    params.push(filters.platform_id);
  }
  if (filters.usb_type_id) {
    sql += ' AND u.usb_type_id = ?';
    params.push(filters.usb_type_id);
  }
  if (filters.model_id) {
    sql += ' AND u.model_id = ?';
    params.push(filters.model_id);
  }
  if (filters.technician_id) {
    sql += ' AND u.technician_id = ?';
    params.push(filters.technician_id);
  }
  if (filters.status) {
    sql += ' AND u.status = ?';
    params.push(filters.status);
  }
  if (filters.search) {
    const terms = filters.search.trim().split(/\s+/);
    for (const term of terms) {
      sql += ` AND (
        u.usb_id LIKE ? OR
        tech.name LIKE ? OR
        m.name LIKE ? OR
        m.model_number LIKE ? OR
        t.name LIKE ? OR
        p.name LIKE ? OR
        u.custom_text LIKE ? OR
        v.version_code LIKE ?
      )`;
      const likeTerm = `%${term}%`;
      params.push(likeTerm, likeTerm, likeTerm, likeTerm, likeTerm, likeTerm, likeTerm, likeTerm);
    }
  }

  sql += ' ORDER BY u.usb_id';

  return database.query(sql, params);
});

ipcMain.handle('usb:getOne', async (event, id) => {
  const sql = `
    SELECT u.*,
           p.name as platform_name,
           t.name as usb_type_name, t.requires_model, t.supports_legacy,
           m.name as model_name, m.model_number,
           v.version_code, v.is_current as version_is_current, v.is_legacy_valid,
           tech.name as technician_name, tech.status as technician_status
    FROM usb_drives u
    JOIN platforms p ON u.platform_id = p.id
    JOIN usb_types t ON u.usb_type_id = t.id
    LEFT JOIN models m ON u.model_id = m.id
    JOIN versions v ON u.version_id = v.id
    LEFT JOIN technicians tech ON u.technician_id = tech.id
    WHERE u.id = ?
  `;
  return database.queryOne(sql, [id]);
});

ipcMain.handle('usb:create', async (event, data, username) => {
  return database.withTransaction(async (connection) => {
    // Generate USB ID
    const usbId = await usbIdGenerator.getNextId(connection);

    // Insert USB drive
    const [result] = await connection.execute(
      `INSERT INTO usb_drives (usb_id, platform_id, usb_type_id, model_id, version_id, technician_id, custom_text, hardware_model, hardware_serial, capacity_gb)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [usbId, data.platform_id, data.usb_type_id, data.model_id || null, data.version_id, data.technician_id || null, data.custom_text || null, data.hardware_model || null, data.hardware_serial || null, data.capacity_gb || null]
    );

    const usbDriveId = result.insertId;

    // Get details for event log
    const names = await eventLogger.fetchEntityNames(connection, {
      typeId: data.usb_type_id,
      versionId: data.version_id,
      modelId: data.model_id
    });

    // Create 'created' event log
    const createdDetails = eventLogger.buildCreationDetails(
      names.typeName,
      names.modelName,
      names.versionCode
    );
    await eventLogger.logEvent(connection, usbDriveId, 'created', createdDetails, username);

    // If technician assigned, log assignment
    if (data.technician_id) {
      await eventLogger.logTechnicianChange(connection, usbDriveId, null, data.technician_id, null, username);
    }

    return toPlainObject({ id: usbDriveId, usb_id: usbId, ...data });
  });
});

// USB Detection - detect connected USB drives and check registration status
ipcMain.handle('usb:detect', async () => {
  try {
    return await usbDetector.detectUSBDrivesWithStatus(database);
  } catch (error) {
    throw new Error(`USB detection failed: ${error.message}`);
  }
});

// Format a USB drive (WARNING: destroys all data!)
ipcMain.handle('usb:format', async (event, diskIndex, label, fileSystem) => {
  try {
    return await usbDetector.formatUSBDrive(diskIndex, label, fileSystem);
  } catch (error) {
    throw new Error(error.message);
  }
});

// Bulk register detected USB drives with hardware info
ipcMain.handle('usb:bulkRegister', async (event, commonData, hardwareList, username) => {
  return database.withTransaction(async (connection) => {
    const created = [];

    const names = await eventLogger.fetchEntityNames(connection, {
      typeId: commonData.usb_type_id,
      versionId: commonData.version_id,
      modelId: commonData.model_id
    });
    const createdDetails = eventLogger.buildCreationDetails(
      names.typeName,
      names.modelName,
      names.versionCode
    );

    for (const hw of hardwareList) {
      const usbId = await usbIdGenerator.getNextId(connection);

      const [result] = await connection.execute(
        `INSERT INTO usb_drives (usb_id, platform_id, usb_type_id, model_id, version_id, technician_id, hardware_model, hardware_serial, capacity_gb)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [usbId, commonData.platform_id, commonData.usb_type_id, commonData.model_id || null, commonData.version_id,
         commonData.technician_id || null, hw.hardware_model || null, hw.hardware_serial || null, hw.capacity_gb || null]
      );

      const usbDriveId = result.insertId;
      await eventLogger.logEvent(connection, usbDriveId, 'created', createdDetails, username);

      if (commonData.technician_id) {
        await eventLogger.logTechnicianChange(connection, usbDriveId, null, commonData.technician_id, null, username);
      }

      created.push({ id: usbDriveId, usb_id: usbId });
    }

    return toPlainObject(created);
  });
});

ipcMain.handle('usb:createSeries', async (event, data, quantity, username) => {
  return database.withTransaction(async (connection) => {
    const created = [];

    // Fetch entity names once for all drives in series
    const names = await eventLogger.fetchEntityNames(connection, {
      typeId: data.usb_type_id,
      versionId: data.version_id,
      modelId: data.model_id
    });
    const createdDetails = eventLogger.buildCreationDetails(
      names.typeName,
      names.modelName,
      names.versionCode
    );

    for (let i = 0; i < quantity; i++) {
      const usbId = await usbIdGenerator.getNextId(connection);

      const [result] = await connection.execute(
        `INSERT INTO usb_drives (usb_id, platform_id, usb_type_id, model_id, version_id, technician_id, custom_text)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [usbId, data.platform_id, data.usb_type_id, data.model_id || null, data.version_id, data.technician_id || null, data.custom_text || null]
      );

      const usbDriveId = result.insertId;

      await eventLogger.logEvent(connection, usbDriveId, 'created', createdDetails, username);

      if (data.technician_id) {
        await eventLogger.logTechnicianChange(connection, usbDriveId, null, data.technician_id, null, username);
      }

      created.push({ id: usbDriveId, usb_id: usbId });
    }

    return toPlainObject(created);
  });
});

ipcMain.handle('usb:update', async (event, id, data, username) => {
  return database.withTransaction(async (connection) => {
    // Get current state
    const [current] = await connection.execute(
      `SELECT u.*, v.version_code, tech.name as technician_name
       FROM usb_drives u
       JOIN versions v ON u.version_id = v.id
       LEFT JOIN technicians tech ON u.technician_id = tech.id
       WHERE u.id = ?`,
      [id]
    );
    const oldData = current[0];

    // Update USB drive
    await connection.execute(
      `UPDATE usb_drives
       SET version_id = ?, technician_id = ?, status = ?, custom_text = ?
       WHERE id = ?`,
      [data.version_id, data.technician_id || null, data.status, data.custom_text || null, id]
    );

    // Log version change
    if (data.version_id !== oldData.version_id) {
      const { versionCode } = await eventLogger.fetchEntityNames(connection, { versionId: data.version_id });
      await eventLogger.logEvent(connection, id, 'updated',
        `Version updated from ${oldData.version_code} to ${versionCode}`, username);
    }

    // Log technician change
    await eventLogger.logTechnicianChange(
      connection, id, oldData.technician_id, data.technician_id, oldData.technician_name, username
    );

    // Log status change
    if (data.status !== oldData.status) {
      const terminalStates = ['lost', 'retired'];
      const wasTerminal = terminalStates.includes(oldData.status);
      const isTerminal = terminalStates.includes(data.status);

      if (isTerminal) {
        await eventLogger.logEvent(connection, id, data.status, `Status changed to ${data.status}`, username);
      } else if (wasTerminal && !isTerminal) {
        await eventLogger.logEvent(connection, id, 'reactivated',
          `Reactivated from '${oldData.status}' status to '${data.status}'`, username);
      }
    }

    return toPlainObject({ id, ...data });
  });
});

ipcMain.handle('usb:repurpose', async (event, id, data, username) => {
  return database.withTransaction(async (connection) => {
    // Get current state for logging
    const [current] = await connection.execute(
      `SELECT u.*, t.name as type_name, m.name as model_name, v.version_code, tech.name as technician_name
       FROM usb_drives u
       JOIN usb_types t ON u.usb_type_id = t.id
       LEFT JOIN models m ON u.model_id = m.id
       JOIN versions v ON u.version_id = v.id
       LEFT JOIN technicians tech ON u.technician_id = tech.id
       WHERE u.id = ?`,
      [id]
    );
    const oldData = current[0];

    // Update USB drive
    await connection.execute(
      `UPDATE usb_drives
       SET platform_id = ?, usb_type_id = ?, model_id = ?, version_id = ?, technician_id = ?, custom_text = ?, status = 'assigned'
       WHERE id = ?`,
      [data.platform_id, data.usb_type_id, data.model_id || null, data.version_id, data.technician_id || null, data.custom_text || null, id]
    );

    // Get new details for logging
    const newNames = await eventLogger.fetchEntityNames(connection, {
      typeId: data.usb_type_id,
      versionId: data.version_id,
      modelId: data.model_id,
      technicianId: data.technician_id
    });

    const oldDesc = oldData.model_name
      ? `${oldData.type_name}/${oldData.model_name}/${oldData.version_code}`
      : `${oldData.type_name}/${oldData.version_code}`;
    const newDesc = newNames.modelName
      ? `${newNames.typeName}/${newNames.modelName}/${newNames.versionCode}`
      : `${newNames.typeName}/${newNames.versionCode}`;

    let details = `Repurposed from ${oldDesc} to ${newDesc}`;
    if (newNames.technicianName) {
      details += `, assigned to ${newNames.technicianName}`;
    }

    await eventLogger.logEvent(connection, id, 'repurpose', details, username);

    return toPlainObject({ id, ...data });
  });
});

// =====================================================
// Event Log IPC Handlers
// =====================================================
ipcMain.handle('eventLog:getByUsb', async (event, usbId) => {
  const sql = `
    SELECT * FROM event_logs
    WHERE usb_id = ?
    ORDER BY timestamp DESC
  `;
  return database.query(sql, [usbId]);
});

// =====================================================
// Pending Updates IPC Handlers
// =====================================================
ipcMain.handle('pending:getAll', async () => {
  const sql = `
    SELECT u.id, u.usb_id, u.custom_text,
           p.name as platform_name,
           t.name as usb_type_name,
           m.name as model_name,
           v.version_code,
           tech.id as technician_id,
           tech.name as technician_name,
           cv.version_code as current_version_code
    FROM usb_drives u
    JOIN platforms p ON u.platform_id = p.id
    JOIN usb_types t ON u.usb_type_id = t.id
    LEFT JOIN models m ON u.model_id = m.id
    JOIN versions v ON u.version_id = v.id
    LEFT JOIN technicians tech ON u.technician_id = tech.id
    LEFT JOIN versions cv ON cv.usb_type_id = u.usb_type_id
      AND (cv.model_id = u.model_id OR (cv.model_id IS NULL AND u.model_id IS NULL))
      AND cv.is_current = TRUE
    WHERE u.status = 'pending_update'
    ORDER BY tech.name, u.usb_id
  `;
  return database.query(sql);
});

ipcMain.handle('pending:markUpdated', async (event, usbIds, username) => {
  return database.withTransaction(async (connection) => {
    for (const usbId of usbIds) {
      // Get USB drive and find current version
      const [usb] = await connection.execute(
        `SELECT u.*, v.version_code as old_version_code,
                cv.id as current_version_id, cv.version_code as new_version_code
         FROM usb_drives u
         JOIN versions v ON u.version_id = v.id
         LEFT JOIN versions cv ON cv.usb_type_id = u.usb_type_id
           AND (cv.model_id = u.model_id OR (cv.model_id IS NULL AND u.model_id IS NULL))
           AND cv.is_current = TRUE
         WHERE u.id = ?`,
        [usbId]
      );

      if (usb[0] && usb[0].current_version_id) {
        // Update to current version and set status to assigned
        await connection.execute(
          "UPDATE usb_drives SET version_id = ?, status = 'assigned' WHERE id = ?",
          [usb[0].current_version_id, usbId]
        );

        // Log the update
        await eventLogger.logEvent(connection, usbId, 'updated',
          `Version updated from ${usb[0].old_version_code} to ${usb[0].new_version_code}`, username);
      }
    }

    return toPlainObject({ success: true, count: usbIds.length });
  });
});

// Bulk update USB drives
ipcMain.handle('usb:bulkUpdate', async (event, usbIds, updates, username) => {
  return database.withTransaction(async (connection) => {
    let updatedCount = 0;

    for (const usbId of usbIds) {
      // Get current state
      const [current] = await connection.execute(
        `SELECT u.*, tech.name as technician_name, v.version_code,
                ut.name as usb_type_name, p.name as platform_name, m.name as model_name
         FROM usb_drives u
         LEFT JOIN technicians tech ON u.technician_id = tech.id
         LEFT JOIN versions v ON u.version_id = v.id
         LEFT JOIN usb_types ut ON u.usb_type_id = ut.id
         LEFT JOIN platforms p ON ut.platform_id = p.id
         LEFT JOIN models m ON u.model_id = m.id
         WHERE u.id = ?`,
        [usbId]
      );
      const oldData = current[0];
      if (!oldData) continue;

      // Build dynamic update
      const setClauses = [];
      const params = [];
      const changes = [];

      // Handle repurpose (platform/type/model/version change)
      if (updates.repurpose) {
        const repurpose = updates.repurpose;
        setClauses.push('usb_type_id = ?', 'model_id = ?', 'version_id = ?');
        params.push(repurpose.usb_type_id, repurpose.model_id || null, repurpose.version_id);

        // Get new names for logging using eventLogger
        const [newType] = await connection.execute(
          `SELECT ut.name as type_name, p.name as platform_name
           FROM usb_types ut JOIN platforms p ON ut.platform_id = p.id
           WHERE ut.id = ?`,
          [repurpose.usb_type_id]
        );
        const newNames = await eventLogger.fetchEntityNames(connection, {
          versionId: repurpose.version_id,
          modelId: repurpose.model_id
        });

        const oldDesc = `${oldData.platform_name} ${oldData.usb_type_name}${oldData.model_name ? ' - ' + oldData.model_name : ''} (${oldData.version_code})`;
        const newDesc = `${newType[0]?.platform_name} ${newType[0]?.type_name}${newNames.modelName ? ' - ' + newNames.modelName : ''} (${newNames.versionCode})`;
        changes.push({ type: 'repurpose', detail: `Repurposed from ${oldDesc} to ${newDesc}` });
      }

      // Handle version-only change (not repurpose)
      if ('version_id' in updates && !updates.repurpose && updates.version_id !== oldData.version_id) {
        setClauses.push('version_id = ?');
        params.push(updates.version_id);
        const { versionCode } = await eventLogger.fetchEntityNames(connection, { versionId: updates.version_id });
        changes.push({ type: 'updated', detail: `Version changed from ${oldData.version_code} to ${versionCode}` });
      }

      if ('technician_id' in updates) {
        setClauses.push('technician_id = ?');
        params.push(updates.technician_id || null);

        // Track change for logging
        if (updates.technician_id !== oldData.technician_id) {
          if (!oldData.technician_id && updates.technician_id) {
            const { technicianName } = await eventLogger.fetchEntityNames(connection, { technicianId: updates.technician_id });
            changes.push({ type: 'assigned', detail: `Assigned to technician: ${technicianName || 'Unknown'}` });
          } else if (oldData.technician_id && !updates.technician_id) {
            changes.push({ type: 'updated', detail: `Unassigned from technician: ${oldData.technician_name}` });
          } else if (oldData.technician_id && updates.technician_id) {
            const { technicianName } = await eventLogger.fetchEntityNames(connection, { technicianId: updates.technician_id });
            changes.push({ type: 'reassigned', detail: `Reassigned from ${oldData.technician_name} to ${technicianName || 'Unknown'}` });
          }
        }
      }

      if ('status' in updates && updates.status !== oldData.status) {
        setClauses.push('status = ?');
        params.push(updates.status);
        changes.push({ type: 'updated', detail: `Status changed from ${oldData.status} to ${updates.status}` });
      }

      if ('custom_text' in updates) {
        setClauses.push('custom_text = ?');
        params.push(updates.custom_text || null);
        if (updates.custom_text !== oldData.custom_text) {
          changes.push({ type: 'updated', detail: `Custom text changed` });
        }
      }

      if (setClauses.length === 0) continue;

      // Execute update
      params.push(usbId);
      await connection.execute(
        `UPDATE usb_drives SET ${setClauses.join(', ')} WHERE id = ?`,
        params
      );

      // Log changes
      for (const change of changes) {
        await eventLogger.logEvent(connection, usbId, change.type, `[Bulk Edit] ${change.detail}`, username);
      }

      updatedCount++;
    }

    return toPlainObject({ success: true, updated: updatedCount });
  });
});

// =====================================================
// Dashboard IPC Handlers
// =====================================================
ipcMain.handle('dashboard:getStats', async () => {
  const stats = {};

  // USB counts by status
  const statusCounts = await database.query(`
    SELECT status, COUNT(*) as count
    FROM usb_drives
    GROUP BY status
  `);
  stats.byStatus = {};
  for (const row of statusCounts) {
    stats.byStatus[row.status] = row.count;
  }
  stats.totalUsb = Object.values(stats.byStatus).reduce((a, b) => a + b, 0);

  // USB per technician
  stats.byTechnician = await database.query(`
    SELECT tech.name, COUNT(u.id) as count
    FROM technicians tech
    LEFT JOIN usb_drives u ON u.technician_id = tech.id
    WHERE tech.status = 'active'
    GROUP BY tech.id, tech.name
    ORDER BY count DESC
    LIMIT 10
  `);

  // USB per platform
  stats.byPlatform = await database.query(`
    SELECT p.name, COUNT(u.id) as count
    FROM platforms p
    LEFT JOIN usb_drives u ON u.platform_id = p.id
    GROUP BY p.id, p.name
    ORDER BY count DESC
  `);

  // Recent events
  stats.recentEvents = await database.query(`
    SELECT e.*, u.id as drive_id, u.usb_id
    FROM event_logs e
    JOIN usb_drives u ON e.usb_id = u.id
    ORDER BY e.timestamp DESC
    LIMIT 20
  `);

  // USBs assigned to inactive technicians
  stats.inactiveTechnicianWarnings = await database.query(`
    SELECT u.usb_id, tech.name as technician_name
    FROM usb_drives u
    JOIN technicians tech ON u.technician_id = tech.id
    WHERE tech.status = 'inactive'
    ORDER BY u.usb_id
  `);

  return toPlainObject(stats);
});

// =====================================================
// Sticker IPC Handlers
// =====================================================
ipcMain.handle('sticker:printSingle', async (event, usbId) => {
  const usb = await database.queryOne(`
    SELECT u.usb_id, u.custom_text,
           t.name as usb_type_name, t.requires_model,
           m.name as model_name,
           v.version_code,
           tech.name as technician_name
    FROM usb_drives u
    JOIN usb_types t ON u.usb_type_id = t.id
    LEFT JOIN models m ON u.model_id = m.id
    JOIN versions v ON u.version_id = v.id
    LEFT JOIN technicians tech ON u.technician_id = tech.id
    WHERE u.id = ?
  `, [usbId]);

  if (!usb) throw new Error('USB drive not found');
  if (!usb.technician_name) throw new Error('Cannot print sticker: No technician assigned');

  const pdfBytes = await pdfGenerator.generateStickerPDF([usb]);

  // Save to temp file and open
  const tempPath = path.join(app.getPath('temp'), `sticker_${usb.usb_id}_${Date.now()}.pdf`);
  fs.writeFileSync(tempPath, pdfBytes);
  shell.openPath(tempPath);

  return toPlainObject({ success: true, path: tempPath });
});

ipcMain.handle('sticker:printBulk', async (event, usbIds) => {
  const placeholders = usbIds.map(() => '?').join(',');
  const usbs = await database.query(`
    SELECT u.usb_id, u.custom_text,
           t.name as usb_type_name, t.requires_model,
           m.name as model_name,
           v.version_code,
           tech.name as technician_name
    FROM usb_drives u
    JOIN usb_types t ON u.usb_type_id = t.id
    LEFT JOIN models m ON u.model_id = m.id
    JOIN versions v ON u.version_id = v.id
    LEFT JOIN technicians tech ON u.technician_id = tech.id
    WHERE u.id IN (${placeholders}) AND tech.name IS NOT NULL
    ORDER BY u.usb_id
  `, usbIds);

  if (usbs.length === 0) throw new Error('No valid USB drives to print (all must have technician assigned)');

  const pdfBytes = await pdfGenerator.generateStickerPDF(usbs);

  const tempPath = path.join(app.getPath('temp'), `stickers_bulk_${Date.now()}.pdf`);
  fs.writeFileSync(tempPath, pdfBytes);
  shell.openPath(tempPath);

  return toPlainObject({ success: true, path: tempPath, count: usbs.length });
});

// =====================================================
// Link Handler
// =====================================================
ipcMain.handle('openLink', async (event, link) => {
  if (link.startsWith('http://') || link.startsWith('https://')) {
    shell.openExternal(link);
  } else if (link.startsWith('\\\\')) {
    // Windows network path
    shell.openPath(link);
  }
  return toPlainObject({ success: true });
});
