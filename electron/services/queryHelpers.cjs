/**
 * Query Helpers
 * Reusable SQL query building utilities
 */

/**
 * Append model ID condition to SQL query
 * Handles both NULL and non-NULL model IDs
 * @param {string} sql - Current SQL string
 * @param {Array} params - Current params array
 * @param {number|null} modelId - Model ID to filter by
 * @param {string} tableAlias - Table alias (default: no alias)
 * @returns {Object} - { sql, params } with condition appended
 */
function appendModelIdCondition(sql, params, modelId, tableAlias = '') {
  const column = tableAlias ? `${tableAlias}.model_id` : 'model_id';
  if (modelId) {
    return {
      sql: sql + ` AND ${column} = ?`,
      params: [...params, modelId]
    };
  }
  return {
    sql: sql + ` AND ${column} IS NULL`,
    params
  };
}

/**
 * Base SELECT query for USB drives with all joins
 * Use this as a starting point and add WHERE conditions as needed
 */
const USB_DRIVE_BASE_SELECT = `
  SELECT u.id, u.usb_id, u.status, u.custom_text, u.created_at, u.updated_at,
         u.hardware_model, u.hardware_serial, u.capacity_gb,
         u.platform_id, u.usb_type_id, u.model_id, u.version_id, u.technician_id,
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
`;

/**
 * Base SELECT for sticker printing (minimal fields needed)
 */
const USB_STICKER_SELECT = `
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
`;

/**
 * Build WHERE clause from filter object
 * @param {Object} filters - Filter key-value pairs
 * @param {Object} columnMap - Map of filter keys to SQL columns
 * @returns {Object} - { whereClause, params }
 */
function buildFiltersWhere(filters, columnMap) {
  let whereClause = '';
  const params = [];

  for (const [key, column] of Object.entries(columnMap)) {
    if (filters[key] !== undefined && filters[key] !== null) {
      whereClause += ` AND ${column} = ?`;
      params.push(filters[key]);
    }
  }

  return { whereClause, params };
}

/**
 * Helper to normalize names for similarity comparison
 * @param {string} name - Name to normalize
 * @returns {string} - Normalized name (lowercase, no spaces)
 */
function normalizeName(name) {
  return (name || '').toLowerCase().replace(/\s+/g, '');
}

/**
 * Check if two names are similar (ignoring spaces and case)
 * @param {string} name1 - First name
 * @param {string} name2 - Second name
 * @returns {boolean} - True if names are similar
 */
function namesAreSimilar(name1, name2) {
  return normalizeName(name1) === normalizeName(name2);
}

/**
 * Helper to ensure objects are IPC-serializable (handles BigInt)
 * @param {any} obj - Object to serialize
 * @returns {any} - Plain object safe for IPC
 */
function toPlainObject(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
}

module.exports = {
  appendModelIdCondition,
  USB_DRIVE_BASE_SELECT,
  USB_STICKER_SELECT,
  buildFiltersWhere,
  normalizeName,
  namesAreSimilar,
  toPlainObject
};
