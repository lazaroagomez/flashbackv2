const mysql = require('mysql2/promise');

// Hardcoded connection config as per requirements
const CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'flashback_user',
  password: 'flashback_password',
  database: 'flashback_usb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Convert BigInt to regular numbers for IPC serialization
  supportBigNumbers: true,
  bigNumberStrings: false
};

let pool = null;

async function getPool() {
  if (!pool) {
    pool = mysql.createPool(CONFIG);
  }
  return pool;
}

async function getConnection() {
  const pool = await getPool();
  return pool.getConnection();
}

// Custom JSON replacer to handle BigInt
function serializeForIPC(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
}

async function query(sql, params = []) {
  const pool = await getPool();
  const [rows] = await pool.execute(sql, params);
  // Convert to plain objects for IPC serialization
  return serializeForIPC(rows);
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

/**
 * Execute a callback within a database transaction.
 * Automatically handles commit/rollback and connection release.
 * @param {Function} callback - Async function receiving the connection
 * @returns {Promise} - Result of the callback
 */
async function withTransaction(callback) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getPool,
  getConnection,
  query,
  queryOne,
  withTransaction,
  serializeForIPC
};
