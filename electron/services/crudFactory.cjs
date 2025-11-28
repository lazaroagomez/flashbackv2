/**
 * CRUD Handler Factory
 * Generates standardized IPC handlers for simple CRUD operations
 */

const database = require('./database.cjs');
const { namesAreSimilar, toPlainObject } = require('./queryHelpers.cjs');

/**
 * Create standard CRUD handlers for an entity
 * @param {Object} config - Configuration object
 * @param {string} config.tableName - Database table name
 * @param {string} config.entityName - Entity name for IPC channels (e.g., 'platform')
 * @param {Array<string>} config.selectColumns - Columns to select (default: ['*'])
 * @param {Array<string>} config.createColumns - Columns for INSERT
 * @param {Array<string>} config.updateColumns - Columns for UPDATE
 * @param {string} config.orderBy - ORDER BY clause (default: 'name')
 * @param {string} config.similarCheckColumn - Column to check for similarity (default: 'name')
 * @param {Array<string>} config.similarSelectColumns - Columns to return for similarity check
 * @returns {Object} - Object with handler functions
 */
function createCrudHandlers(config) {
  const {
    tableName,
    entityName,
    selectColumns = ['*'],
    createColumns,
    updateColumns,
    orderBy = 'name',
    similarCheckColumn = 'name',
    similarSelectColumns = ['id', 'name']
  } = config;

  const selectClause = selectColumns.join(', ');
  const similarSelectClause = similarSelectColumns.join(', ');

  return {
    /**
     * Get all entities, optionally filtered by active status
     */
    async getAll(activeOnly = false) {
      let sql = `SELECT ${selectClause} FROM ${tableName}`;
      if (activeOnly) sql += " WHERE status = 'active'";
      sql += ` ORDER BY ${orderBy}`;
      return database.query(sql);
    },

    /**
     * Get a single entity by ID
     */
    async getOne(id) {
      const sql = `SELECT ${selectClause} FROM ${tableName} WHERE id = ?`;
      return database.queryOne(sql, [id]);
    },

    /**
     * Check for similar entities by name
     */
    async checkSimilar(name) {
      const sql = `SELECT ${similarSelectClause} FROM ${tableName}`;
      const items = await database.query(sql);
      const similar = items.filter(item => namesAreSimilar(item[similarCheckColumn], name));
      return toPlainObject(similar);
    },

    /**
     * Create a new entity
     */
    async create(data) {
      const columns = createColumns.join(', ');
      const placeholders = createColumns.map(() => '?').join(', ');
      const values = createColumns.map(col => data[col] ?? null);

      const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
      const result = await database.query(sql, values);
      return toPlainObject({ id: result.insertId, ...data });
    },

    /**
     * Update an existing entity
     */
    async update(id, data) {
      const setClause = updateColumns.map(col => `${col} = ?`).join(', ');
      const values = [...updateColumns.map(col => data[col] ?? null), id];

      const sql = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
      await database.query(sql, values);
      return toPlainObject({ id, ...data });
    }
  };
}

/**
 * Register CRUD handlers with ipcMain
 * @param {Object} ipcMain - Electron ipcMain
 * @param {string} prefix - IPC channel prefix (e.g., 'platform')
 * @param {Object} handlers - Handlers from createCrudHandlers
 * @param {Object} overrides - Optional handler overrides
 */
function registerCrudHandlers(ipcMain, prefix, handlers, overrides = {}) {
  const finalHandlers = { ...handlers, ...overrides };

  if (finalHandlers.getAll) {
    ipcMain.handle(`${prefix}:getAll`, (event, ...args) => finalHandlers.getAll(...args));
  }
  if (finalHandlers.getOne) {
    ipcMain.handle(`${prefix}:getOne`, (event, ...args) => finalHandlers.getOne(...args));
  }
  if (finalHandlers.checkSimilar) {
    ipcMain.handle(`${prefix}:checkSimilar`, (event, ...args) => finalHandlers.checkSimilar(...args));
  }
  if (finalHandlers.create) {
    ipcMain.handle(`${prefix}:create`, (event, ...args) => finalHandlers.create(...args));
  }
  if (finalHandlers.update) {
    ipcMain.handle(`${prefix}:update`, (event, ...args) => finalHandlers.update(...args));
  }
}

module.exports = {
  createCrudHandlers,
  registerCrudHandlers
};
