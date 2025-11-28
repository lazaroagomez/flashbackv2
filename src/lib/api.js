// API wrapper for IPC calls
// Provides a clean interface to the Electron API

// Helper to convert Svelte 5 reactive proxies to plain objects for IPC serialization
// Svelte 5's $state() creates Proxy objects that cannot be cloned through Electron IPC
function toPlain(obj) {
  if (obj === null || obj === undefined) return obj;
  return JSON.parse(JSON.stringify(obj));
}

export const api = {
  // Authentication
  validatePassword: (password) => window.api.validatePassword(password),

  // Platforms
  getPlatforms: (activeOnly = false) => window.api.getPlatforms(activeOnly),
  checkSimilarPlatform: (name) => window.api.checkSimilarPlatform(name),
  createPlatform: (data) => window.api.createPlatform(toPlain(data)),
  updatePlatform: (id, data) => window.api.updatePlatform(id, toPlain(data)),

  // USB Types
  getUsbTypes: (platformId = null, activeOnly = false) => window.api.getUsbTypes(platformId, activeOnly),
  checkSimilarUsbType: (name, platformId = null) => window.api.checkSimilarUsbType(name, platformId),
  createUsbType: (data) => window.api.createUsbType(toPlain(data)),
  updateUsbType: (id, data) => window.api.updateUsbType(id, toPlain(data)),

  // Models
  getModels: (activeOnly = false) => window.api.getModels(activeOnly),
  getModel: (id) => window.api.getModel(id),
  checkSimilarModel: (name) => window.api.checkSimilarModel(name),
  createModel: (data) => window.api.createModel(toPlain(data)),
  updateModel: (id, data) => window.api.updateModel(id, toPlain(data)),
  getModelUsbDrives: (modelId) => window.api.getModelUsbDrives(modelId),

  // Versions
  getVersions: (usbTypeId = null, modelId = null) => window.api.getVersions(usbTypeId, modelId),
  checkSimilarVersion: (versionCode, usbTypeId, modelId = null) => window.api.checkSimilarVersion(versionCode, usbTypeId, modelId),
  createVersion: (data) => window.api.createVersion(toPlain(data)),
  updateVersion: (id, data) => window.api.updateVersion(id, toPlain(data)),
  setCurrentVersion: (id, username) => window.api.setCurrentVersion(id, username),
  toggleVersionStatus: (id) => window.api.toggleVersionStatus(id),

  // Technicians
  getTechnicians: (activeOnly = false) => window.api.getTechnicians(activeOnly),
  getTechnician: (id) => window.api.getTechnician(id),
  checkSimilarTechnician: (name) => window.api.checkSimilarTechnician(name),
  createTechnician: (data) => window.api.createTechnician(toPlain(data)),
  updateTechnician: (id, data) => window.api.updateTechnician(id, toPlain(data)),
  getTechnicianUsbDrives: (technicianId) => window.api.getTechnicianUsbDrives(technicianId),

  // USB Drives
  getUsbDrives: (filters = {}) => window.api.getUsbDrives(toPlain(filters)),
  getUsbDrive: (id) => window.api.getUsbDrive(id),
  createUsbDrive: (data, username) => window.api.createUsbDrive(toPlain(data), username),
  createUsbDriveSeries: (data, quantity, username) => window.api.createUsbDriveSeries(toPlain(data), quantity, username),
  updateUsbDrive: (id, data, username) => window.api.updateUsbDrive(id, toPlain(data), username),
  repurposeUsbDrive: (id, data, username) => window.api.repurposeUsbDrive(id, toPlain(data), username),
  bulkUpdateUsbDrives: (usbIds, updates, username) => window.api.bulkUpdateUsbDrives(toPlain(usbIds), toPlain(updates), username),
  detectUsbDevices: () => window.api.detectUsbDevices(),
  bulkRegisterDrives: (commonData, hardwareList, username) => window.api.bulkRegisterDrives(toPlain(commonData), toPlain(hardwareList), username),

  // Event Logs
  getEventLogs: (usbId) => window.api.getEventLogs(usbId),

  // Pending Updates
  getPendingUpdates: () => window.api.getPendingUpdates(),
  markAsUpdated: (usbIds, username) => window.api.markAsUpdated(toPlain(usbIds), username),

  // Dashboard
  getDashboardStats: () => window.api.getDashboardStats(),

  // Stickers
  printSticker: (usbId) => window.api.printSticker(usbId),
  printStickerBulk: (usbIds) => window.api.printStickerBulk(toPlain(usbIds)),

  // Links
  openLink: (link) => window.api.openLink(link)
};
