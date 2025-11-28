/**
 * Event Logger Service
 * Centralized event logging for USB drive operations
 */

/**
 * Log an event for a USB drive
 * @param {Connection} connection - Database connection (for transactions)
 * @param {number} usbId - USB drive ID
 * @param {string} eventType - Type of event (created, assigned, updated, etc.)
 * @param {string} details - Event details
 * @param {string} username - User who triggered the event
 */
async function logEvent(connection, usbId, eventType, details, username) {
  await connection.execute(
    'INSERT INTO event_logs (usb_id, event_type, details, username) VALUES (?, ?, ?, ?)',
    [usbId, eventType, details, username]
  );
}

/**
 * Fetch entity names for logging purposes
 * @param {Connection} connection - Database connection
 * @param {Object} ids - Object containing entity IDs to fetch
 * @returns {Object} - Object with entity names
 */
async function fetchEntityNames(connection, { typeId, versionId, modelId, technicianId }) {
  const result = {};

  if (typeId) {
    const [rows] = await connection.execute('SELECT name FROM usb_types WHERE id = ?', [typeId]);
    result.typeName = rows[0]?.name || null;
  }

  if (versionId) {
    const [rows] = await connection.execute('SELECT version_code FROM versions WHERE id = ?', [versionId]);
    result.versionCode = rows[0]?.version_code || null;
  }

  if (modelId) {
    const [rows] = await connection.execute('SELECT name FROM models WHERE id = ?', [modelId]);
    result.modelName = rows[0]?.name || null;
  }

  if (technicianId) {
    const [rows] = await connection.execute('SELECT name FROM technicians WHERE id = ?', [technicianId]);
    result.technicianName = rows[0]?.name || null;
  }

  return result;
}

/**
 * Handle technician assignment change and log appropriate event
 * @param {Connection} connection - Database connection
 * @param {number} usbId - USB drive ID
 * @param {number|null} oldTechId - Previous technician ID
 * @param {number|null} newTechId - New technician ID
 * @param {string} oldTechName - Previous technician name (if known)
 * @param {string} username - User who triggered the change
 */
async function logTechnicianChange(connection, usbId, oldTechId, newTechId, oldTechName, username) {
  if (newTechId === oldTechId) return;

  if (!oldTechId && newTechId) {
    // New assignment
    const { technicianName } = await fetchEntityNames(connection, { technicianId: newTechId });
    await logEvent(connection, usbId, 'assigned', `Assigned to technician: ${technicianName}`, username);
  } else if (oldTechId && !newTechId) {
    // Unassignment
    await logEvent(connection, usbId, 'updated', `Unassigned from technician: ${oldTechName}`, username);
  } else if (oldTechId && newTechId) {
    // Reassignment
    const { technicianName } = await fetchEntityNames(connection, { technicianId: newTechId });
    await logEvent(connection, usbId, 'reassigned', `Reassigned from ${oldTechName} to ${technicianName}`, username);
  }
}

/**
 * Build a creation details string for logging
 * @param {string} typeName - USB type name
 * @param {string|null} modelName - Model name (optional)
 * @param {string} versionCode - Version code
 * @returns {string} - Formatted creation details
 */
function buildCreationDetails(typeName, modelName, versionCode) {
  return modelName
    ? `USB drive created: Type=${typeName}, Model=${modelName}, Version=${versionCode}`
    : `USB drive created: Type=${typeName}, Version=${versionCode}`;
}

module.exports = {
  logEvent,
  fetchEntityNames,
  logTechnicianChange,
  buildCreationDetails
};
