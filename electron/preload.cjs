const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Authentication
  validatePassword: (password) => ipcRenderer.invoke('auth:validate', password),

  // Platforms
  getPlatforms: (activeOnly) => ipcRenderer.invoke('platform:getAll', activeOnly),
  createPlatform: (data) => ipcRenderer.invoke('platform:create', data),
  updatePlatform: (id, data) => ipcRenderer.invoke('platform:update', id, data),

  // USB Types
  getUsbTypes: (platformId, activeOnly) => ipcRenderer.invoke('usbType:getAll', platformId, activeOnly),
  createUsbType: (data) => ipcRenderer.invoke('usbType:create', data),
  updateUsbType: (id, data) => ipcRenderer.invoke('usbType:update', id, data),

  // Models
  getModels: (activeOnly) => ipcRenderer.invoke('model:getAll', activeOnly),
  getModel: (id) => ipcRenderer.invoke('model:getOne', id),
  createModel: (data) => ipcRenderer.invoke('model:create', data),
  updateModel: (id, data) => ipcRenderer.invoke('model:update', id, data),
  getModelUsbDrives: (modelId) => ipcRenderer.invoke('model:getUsbDrives', modelId),

  // Versions
  getVersions: (usbTypeId, modelId) => ipcRenderer.invoke('version:getAll', usbTypeId, modelId),
  createVersion: (data) => ipcRenderer.invoke('version:create', data),
  updateVersion: (id, data) => ipcRenderer.invoke('version:update', id, data),
  setCurrentVersion: (id, username) => ipcRenderer.invoke('version:setCurrent', id, username),

  // Technicians
  getTechnicians: (activeOnly) => ipcRenderer.invoke('technician:getAll', activeOnly),
  getTechnician: (id) => ipcRenderer.invoke('technician:getOne', id),
  createTechnician: (data) => ipcRenderer.invoke('technician:create', data),
  updateTechnician: (id, data) => ipcRenderer.invoke('technician:update', id, data),
  getTechnicianUsbDrives: (technicianId) => ipcRenderer.invoke('technician:getUsbDrives', technicianId),

  // USB Drives
  getUsbDrives: (filters) => ipcRenderer.invoke('usb:getAll', filters),
  getUsbDrive: (id) => ipcRenderer.invoke('usb:getOne', id),
  createUsbDrive: (data, username) => ipcRenderer.invoke('usb:create', data, username),
  createUsbDriveSeries: (data, quantity, username) => ipcRenderer.invoke('usb:createSeries', data, quantity, username),
  updateUsbDrive: (id, data, username) => ipcRenderer.invoke('usb:update', id, data, username),
  repurposeUsbDrive: (id, data, username) => ipcRenderer.invoke('usb:repurpose', id, data, username),

  // Event Logs
  getEventLogs: (usbId) => ipcRenderer.invoke('eventLog:getByUsb', usbId),

  // Pending Updates
  getPendingUpdates: () => ipcRenderer.invoke('pending:getAll'),
  markAsUpdated: (usbIds, username) => ipcRenderer.invoke('pending:markUpdated', usbIds, username),

  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke('dashboard:getStats'),

  // Stickers
  printSticker: (usbId) => ipcRenderer.invoke('sticker:printSingle', usbId),
  printStickerBulk: (usbIds) => ipcRenderer.invoke('sticker:printBulk', usbIds),

  // Links
  openLink: (link) => ipcRenderer.invoke('openLink', link)
});
