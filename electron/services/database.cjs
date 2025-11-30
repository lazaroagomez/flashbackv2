const mysql = require('mysql2/promise');

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  host: process.env.DB_HOST || '192.168.11.56',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'flashback_user',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'flashback_usb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  supportBigNumbers: true,
  bigNumberStrings: false,
  // Keep connections alive
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
};

// Logging configuration
const LOG_QUERIES = process.env.DB_LOG_QUERIES === 'true';
const SLOW_QUERY_THRESHOLD_MS = 500;

// ============================================
// CONNECTION MANAGEMENT
// ============================================

let pool = null;
let isHealthy = false;
let lastHealthCheck = null;

/**
 * Get or create the database connection pool
 * @returns {Promise<mysql.Pool>}
 */
async function getPool() {
  if (!pool) {
    pool = mysql.createPool(CONFIG);

    // Handle pool-level errors
    pool.on('error', (err) => {
      console.error('[DB] Pool error:', err.code, err.message);
      if (isConnectionError(err)) {
        isHealthy = false;
        pool = null;
      }
    });

    console.log('[DB] Connection pool created');
  }
  return pool;
}

/**
 * Get a single connection from the pool
 * @returns {Promise<mysql.PoolConnection>}
 */
async function getConnection() {
  const pool = await getPool();
  return pool.getConnection();
}

/**
 * Close the connection pool
 * @returns {Promise<void>}
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    isHealthy = false;
    console.log('[DB] Connection pool closed');
  }
}

// ============================================
// HEALTH CHECK & RECONNECTION
// ============================================

/**
 * Check if an error is a connection-related error
 * @param {Error} error
 * @returns {boolean}
 */
function isConnectionError(error) {
  const connectionErrors = [
    'PROTOCOL_CONNECTION_LOST',
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ER_CON_COUNT_ERROR',
    'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR'
  ];
  return connectionErrors.includes(error.code);
}

/**
 * Perform a database health check
 * @returns {Promise<{healthy: boolean, latency: number|null, error: string|null}>}
 */
async function healthCheck() {
  const startTime = Date.now();
  try {
    const pool = await getPool();
    await pool.execute('SELECT 1 AS health');
    const latency = Date.now() - startTime;

    isHealthy = true;
    lastHealthCheck = new Date();

    console.log(`[DB] Health check passed (${latency}ms)`);
    return { healthy: true, latency, error: null };
  } catch (error) {
    const latency = Date.now() - startTime;
    isHealthy = false;
    pool = null; // Force pool recreation on next attempt

    console.error(`[DB] Health check failed (${latency}ms):`, error.message);
    return { healthy: false, latency, error: error.message };
  }
}

/**
 * Get current health status without performing a check
 * @returns {{healthy: boolean, lastCheck: Date|null}}
 */
function getHealthStatus() {
  return {
    healthy: isHealthy,
    lastCheck: lastHealthCheck
  };
}

// ============================================
// QUERY LOGGING
// ============================================

/**
 * Format SQL query for logging (truncate if too long)
 * @param {string} sql
 * @param {Array} params
 * @returns {string}
 */
function formatQueryForLog(sql, params) {
  // Normalize whitespace
  const normalizedSql = sql.replace(/\s+/g, ' ').trim();
  // Truncate long queries
  const truncatedSql = normalizedSql.length > 200
    ? normalizedSql.substring(0, 200) + '...'
    : normalizedSql;
  // Truncate params array
  const truncatedParams = params.length > 5
    ? [...params.slice(0, 5), `(+${params.length - 5} more)`]
    : params;

  return `${truncatedSql} | params: ${JSON.stringify(truncatedParams)}`;
}

/**
 * Log query execution
 * @param {string} sql
 * @param {Array} params
 * @param {number} duration
 * @param {Error|null} error
 */
function logQuery(sql, params, duration, error = null) {
  const formattedQuery = formatQueryForLog(sql, params);

  if (error) {
    console.error(`[DB ERROR] ${duration}ms | ${formattedQuery}`);
    console.error(`[DB ERROR] ${error.code || 'UNKNOWN'}: ${error.message}`);
  } else if (duration > SLOW_QUERY_THRESHOLD_MS) {
    console.warn(`[DB SLOW] ${duration}ms | ${formattedQuery}`);
  } else if (LOG_QUERIES) {
    console.log(`[DB] ${duration}ms | ${formattedQuery}`);
  }
}

// ============================================
// QUERY EXECUTION WITH RETRY
// ============================================

/**
 * Custom JSON replacer to handle BigInt
 * @param {any} obj
 * @returns {any}
 */
function serializeForIPC(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
}

/**
 * Execute a parameterized SQL query with automatic retry
 * @param {string} sql - SQL query with ? placeholders
 * @param {Array} [params=[]] - Parameter values
 * @param {number} [retries=2] - Number of retry attempts
 * @returns {Promise<Array<Object>>}
 */
async function query(sql, params = [], retries = 2) {
  const startTime = Date.now();

  try {
    const pool = await getPool();
    const [rows] = await pool.execute(sql, params);

    const duration = Date.now() - startTime;
    logQuery(sql, params, duration);
    isHealthy = true;

    return serializeForIPC(rows);
  } catch (error) {
    const duration = Date.now() - startTime;
    logQuery(sql, params, duration, error);

    // Retry on connection errors
    if (retries > 0 && isConnectionError(error)) {
      console.warn(`[DB] Retrying query (${retries} attempts left)...`);
      pool = null; // Reset pool
      await new Promise(r => setTimeout(r, 1000)); // Wait 1 second
      return query(sql, params, retries - 1);
    }

    throw error;
  }
}

/**
 * Execute a query and return only the first row
 * @param {string} sql
 * @param {Array} [params=[]]
 * @returns {Promise<Object|null>}
 */
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

/**
 * Execute a callback within a database transaction
 * @param {Function} callback - Async function receiving the connection
 * @returns {Promise<any>}
 */
async function withTransaction(callback) {
  const startTime = Date.now();
  const connection = await getConnection();

  try {
    await connection.beginTransaction();
    if (LOG_QUERIES) console.log('[DB] Transaction started');

    const result = await callback(connection);

    await connection.commit();
    const duration = Date.now() - startTime;
    if (LOG_QUERIES) console.log(`[DB] Transaction committed (${duration}ms)`);

    return result;
  } catch (error) {
    await connection.rollback();
    const duration = Date.now() - startTime;
    console.error(`[DB] Transaction rolled back (${duration}ms):`, error.message);
    throw error;
  } finally {
    connection.release();
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Connection management
  getPool,
  getConnection,
  closePool,

  // Health checks
  healthCheck,
  getHealthStatus,

  // Query execution
  query,
  queryOne,
  withTransaction,

  // Utilities
  serializeForIPC
};
