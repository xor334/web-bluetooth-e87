const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { Selection } = require('./selection.cjs');

const entry = path.join(__dirname, '../web/dist-desktop/desktop.html');
const entryURL = pathToFileURL(entry).href;
let window;
let chooser;
let pairing;
let pairingId = 0;
let nativeScanner;
let rawDevices = [];
let nativeAddresses = new Map();

function stopNativeScan() {
  if (nativeScanner) { nativeScanner.kill(); nativeScanner = null; }
}
function enrichDevices() {
  return rawDevices.map(device => ({ ...device, ...nativeAddresses.get(device.deviceId) }));
}
function startNativeScan() {
  if (process.platform !== 'darwin') return;
  const binary = app.isPackaged ? path.join(process.resourcesPath, 'mac-badge-discovery') : path.join(__dirname, 'bin/mac-badge-discovery');
  if (!existsSync(binary)) return;
  stopNativeScan();
  const child = spawn(binary, [], { stdio: ['ignore', 'pipe', 'ignore'] });
  nativeScanner = child;
  let buffered = '';
  child.stdout.on('data', data => {
    buffered += data.toString();
    const lines = buffered.split('\n'); buffered = lines.pop();
    for (const line of lines) {
      if (nativeScanner !== child || !chooser.pending) continue;
      try {
        const record = JSON.parse(line);
        const macPattern = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/;
        if (!macPattern.test(record.deviceId) || !macPattern.test(record.advertisedMac)) continue;
        nativeAddresses.set(record.deviceId, { advertisedMac: record.advertisedMac, rssi: record.rssi });
        chooser.update(enrichDevices(), chooser.pending.callback);
      } catch { /* Ignore incomplete/unsupported manufacturer records. */ }
    }
  });
  child.on('error', () => { if (nativeScanner === child) nativeScanner = null; });
  child.on('exit', () => { if (nativeScanner === child) nativeScanner = null; });
}
app.on('before-quit', stopNativeScan);

// Chromium's Linux Web Bluetooth implementation is behind this feature switch.
// Keep the Chromium sandbox enabled on all platforms.
if (process.platform === 'linux') app.commandLine.appendSwitch('enable-experimental-web-platform-features');

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window) { window.restore(); window.focus(); } });
  app.whenReady().then(createWindow);
  app.on('activate', () => { if (!window) createWindow(); });
  app.on('window-all-closed', () => app.quit());
}

function validSender(event) {
  return window && event.sender === window.webContents && event.senderFrame === window.webContents.mainFrame && event.senderFrame.url === entryURL;
}

function finishPairing(response) {
  if (!pairing) return;
  const pending = pairing;
  pairing = null;
  clearTimeout(pending.timer);
  if (window && !window.isDestroyed()) window.webContents.send('e87:pairing', null);
  pending.callback(response);
}

ipcMain.handle('e87:select', (event, requestId, deviceId) => {
  if (!validSender(event) || typeof deviceId !== 'string') return false;
  return chooser.finish(requestId, deviceId);
});
ipcMain.handle('e87:pair', (event, requestId, response) => {
  if (!validSender(event) || !pairing || pairing.id !== requestId || typeof response?.confirmed !== 'boolean') return false;
  if (response.confirmed && pairing.kind === 'providePin' && (typeof response.pin !== 'string' || !/^[\x20-\x7E]{1,16}$/.test(response.pin))) return false;
  finishPairing({ confirmed: response.confirmed, pin: response.pin });
  return true;
});

function createWindow() {
  window = new BrowserWindow({
    width: 920, height: 720, minWidth: 800, minHeight: 600,
    title: 'E87 Studio', backgroundColor: '#101311', show: false,
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false },
  });
  const wc = window.webContents;
  chooser = new Selection(data => {
    if (data === null) stopNativeScan();
    if (!wc.isDestroyed()) wc.send('e87:devices', data);
  });
  wc.on('select-bluetooth-device', (event, devices, callback) => {
    event.preventDefault();
    const isNew = !chooser.pending;
    if (isNew) nativeAddresses = new Map();
    rawDevices = devices;
    chooser.update(enrichDevices(), callback);
    if (isNew) startNativeScan();
  });
  const trusted = contents => contents === wc && contents.getURL() === entryURL;
  wc.session.setPermissionCheckHandler((contents, permission) => trusted(contents) && permission === 'bluetooth');
  wc.session.setPermissionRequestHandler((contents, permission, callback) => callback(trusted(contents) && permission === 'bluetooth'));
  wc.session.setBluetoothPairingHandler((details, callback) => {
    if (!details.frame || details.frame !== wc.mainFrame) { callback({ confirmed: false }); return; }
    finishPairing({ confirmed: false });
    const id = ++pairingId;
    pairing = { id, kind: details.pairingKind, callback, timer: setTimeout(() => finishPairing({ confirmed: false }), 60000) };
    wc.send('e87:pairing', { requestId: id, deviceId: details.deviceId, pairingKind: details.pairingKind, pin: details.pin });
  });
  wc.setWindowOpenHandler(() => ({ action: 'deny' }));
  wc.on('will-navigate', event => event.preventDefault());
  wc.on('will-attach-webview', event => event.preventDefault());
  wc.on('did-start-navigation', (_event, _url, inPlace, isMainFrame) => { if (isMainFrame && !inPlace) { chooser.cancel(); finishPairing({ confirmed: false }); } });
  wc.on('render-process-gone', () => { chooser.cancel(); finishPairing({ confirmed: false }); });
  wc.on('will-prevent-unload', event => {
    const leave = dialog.showMessageBoxSync(window, { type: 'warning', buttons: ['Продолжить передачу', 'Закрыть'], defaultId: 0, cancelId: 0, message: 'Идёт передача на значок', detail: 'Закрытие приложения прервёт загрузку.' });
    if (leave === 1) event.preventDefault();
  });
  window.on('closed', () => { chooser.cancel(); finishPairing({ confirmed: false }); window = null; });
  window.once('ready-to-show', () => window.show());
  window.loadFile(entry);

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ label: 'E87 Studio', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { type: 'separator' }, { role: 'quit' }] }] : []),
    { label: 'Правка', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'Вид', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    { label: 'Окно', submenu: [{ role: 'minimize' }, { role: 'close' }] },
  ]));
  app.setAboutPanelOptions({ applicationName: 'E87 Studio', applicationVersion: app.getVersion(), copyright: 'Based on web-bluetooth-e87 by Felix Herbst · MIT', credits: 'Локальный редактор для круглых значков E87. Все изображения обрабатываются на вашем компьютере.' });
}
