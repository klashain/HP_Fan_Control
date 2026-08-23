const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

app.disableHardwareAcceleration();
app.setAppUserModelId('com.klashain.omenfancontrol');

// Paketli ve gelistirme ortamlarinda ikon yollari
const windowIconPath = app.isPackaged
  ? path.join(process.resourcesPath, 'icons', 'icon.png')
  : path.join(__dirname, 'build', 'icon.png');
const trayIconPath = app.isPackaged
  ? path.join(process.resourcesPath, 'icons', 'icon_32.png')
  : path.join(__dirname, 'build', 'icon_32.png');

let tray = null;
let trayLang = 'tr';
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600, // Reduced height for compactness
    backgroundColor: '#0D0D0D',
    icon: windowIconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    frame: false,
    autoHideMenuBar: true
  });

  mainWindow.loadFile('index.html');

  ipcMain.on('window-minimize', () => {
    mainWindow.hide(); // Hide to system tray instead of minimize
  });

  ipcMain.on('window-close', () => {
    mainWindow.close();
  });

  // Autostart via Task Scheduler (app runs elevated, Run-key autostart would fail)
  const TASK_NAME = 'OMEN Fan Control Autostart';

  ipcMain.on('get-autostart-status', (event) => {
    exec(`schtasks /Query /TN "${TASK_NAME}"`, (err) => {
      event.reply('autostart-status', !err);
    });
  });

  ipcMain.on('set-autostart', (event, enable) => {
    if (enable) {
      const exePath = app.getPath('exe');
      exec(`schtasks /Create /TN "${TASK_NAME}" /TR "\\"${exePath}\\"" /SC ONLOGON /RL HIGHEST /F`, () => {});
    } else {
      exec(`schtasks /Delete /TN "${TASK_NAME}" /F`, () => {});
    }
  });

  // Renderer'dan gelen dil secimini tepside uygula
  ipcMain.on('set-lang', (event, l) => {
    trayLang = (l === 'en') ? 'en' : 'tr';
    if (tray) {
      const labels = trayLang === 'en'
        ? { show: 'Show (Open UI)', quit: 'Exit' }
        : { show: 'Göster (Arayüzü Aç)', quit: 'Çıkış' };
      tray.setContextMenu(Menu.buildFromTemplate([
        { label: labels.show, click: () => mainWindow.show() },
        { label: labels.quit, click: () => { app.isQuiting = true; app.quit(); } }
      ]));
    }
  });
}

const { spawn, exec } = require('child_process');
let backendProcess = null;

function startBackend() {
  const isPackaged = app.isPackaged;
  const backendPath = isPackaged 
    ? path.join(process.resourcesPath, 'backend', 'tcp_server.exe')
    : path.join(__dirname, 'backend', 'dist', 'tcp_server.exe');

  // Kill any existing instances first
  exec('taskkill /f /im tcp_server.exe', (err, stdout, stderr) => {
    try {
      backendProcess = spawn(backendPath, [], { detached: false, windowsHide: true });
      backendProcess.on('error', (err) => {
        console.error("Backend process failed to start:", err);
      });
    } catch (e) {
      console.error(e);
    }
  });
}

app.on('will-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

function createTray() {
  const icon = nativeImage.createFromPath(trayIconPath);
  tray = new Tray(icon);

  const labels = trayLang === 'en'
    ? { show: 'Show (Open UI)', quit: 'Exit' }
    : { show: 'Göster (Arayüzü Aç)', quit: 'Çıkış' };

  const contextMenu = Menu.buildFromTemplate([
    { label: labels.show, click: () => mainWindow.show() },
    { label: labels.quit, click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('OMEN Fan Control');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
}

app.whenReady().then(() => {
  startBackend();
  createWindow();
  createTray();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
