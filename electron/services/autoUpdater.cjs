const { autoUpdater } = require('electron-updater');
const { dialog, app } = require('electron');

// GitHub token for private repo access - replaced at build time by GitHub Actions
const GH_TOKEN = '__GH_TOKEN__';

// Configure auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Set GitHub token for private repo
if (GH_TOKEN && GH_TOKEN !== '__GH_TOKEN__') {
  autoUpdater.setRequestHeaders({
    'Authorization': `token ${GH_TOKEN}`
  });
  // Also set the token in the provider
  process.env.GH_TOKEN = GH_TOKEN;
}

function init() {
  // Set up event handlers
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });

  autoUpdater.on('update-available', async (info) => {
    console.log('Update available:', info.version);

    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available.`,
      detail: 'Would you like to download and install it now?',
      buttons: ['Download Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    });

    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('No updates available. Current version:', info.version);
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`Download progress: ${Math.round(progress.percent)}%`);
  });

  autoUpdater.on('update-downloaded', async (info) => {
    console.log('Update downloaded:', info.version);

    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded.`,
      detail: 'The application will restart to install the update.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  });

  autoUpdater.on('error', (error) => {
    console.error('Auto-updater error:', error.message);
    // Don't show error dialog for network issues on startup
    // Only log to console
  });
}

async function checkForUpdates() {
  try {
    return await autoUpdater.checkForUpdates();
  } catch (error) {
    console.error('Update check failed:', error.message);
    return null;
  }
}

function getCurrentVersion() {
  return app.getVersion();
}

module.exports = {
  init,
  checkForUpdates,
  getCurrentVersion
};
