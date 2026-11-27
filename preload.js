const { contextBridge, ipcRenderer } = require('electron');
const call = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);
contextBridge.exposeInMainWorld('penguin', {
  list: call('list'), toggle: call('toggle'), paste: call('paste'),
  copy: call('copy'), remove: call('remove'), hide: call('hide'), clickThrough: call('click-through'), quit: call('quit'),
});
