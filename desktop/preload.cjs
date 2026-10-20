const { contextBridge, ipcRenderer } = require('electron');
function subscribe(channel, handler) {
  const listener = (_event, data) => handler(data);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}
contextBridge.exposeInMainWorld('e87Desktop', {
  platform: process.platform,
  onDevices: handler => subscribe('e87:devices', handler),
  select: (requestId, deviceId) => ipcRenderer.invoke('e87:select', requestId, deviceId),
  onPairing: handler => subscribe('e87:pairing', handler),
  pair: (requestId, response) => ipcRenderer.invoke('e87:pair', requestId, response),
});
