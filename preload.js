const { contextBridge, ipcRenderer } = require('electron');
const call = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);
contextBridge.exposeInMainWorld('penguin', {
  list: call('list'), toggle: call('toggle'), paste: call('paste'),
  copy: call('copy'), reveal: call('reveal'), quit: call('quit'),
});
