const { contextBridge, ipcRenderer } = require('electron');
const call = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);
contextBridge.exposeInMainWorld('penguin', {
  list: call('list'), toggle: call('toggle'), paste: call('paste'),
  bubble: call('bubble'), googleStatus: call('google-status'),
  googleConnect: call('google-connect'), googleDisconnect: call('google-disconnect'),
  onRemind: (cb) => ipcRenderer.on('remind', (_e, r) => cb(r)),
  onGoogle: (cb) => ipcRenderer.on('google', (_e, on) => cb(on)),
  copy: call('copy'), remove: call('remove'), hide: call('hide'), show: call('show'), quit: call('quit'),
});
