const { app, BrowserWindow, ipcMain, clipboard, nativeImage, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const { add } = require('./history');

const SMALL = { width: 120, height: 120 };
const BIG = { width: 320, height: 440 };
let win, open = false, list = [];


function place(size) {
  const wa = screen.getPrimaryDisplay().workArea;
  win.setBounds({ x: wa.x + wa.width - size.width - 16, y: wa.y + wa.height - size.height, ...size });
}

app.whenReady().then(() => {
  // History is memory-only and starts empty each launch; remove the file older versions saved.
  fs.rmSync(path.join(app.getPath('userData'), 'history.json'), { force: true });
  win = new BrowserWindow({
    ...SMALL, frame: false, transparent: true, resizable: false, alwaysOnTop: true,
    skipTaskbar: true, hasShadow: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  place(SMALL);
  win.loadFile('index.html');
});

ipcMain.handle('list', () => list);
ipcMain.handle('toggle', () => { open = !open; place(open ? BIG : SMALL); return open; });
ipcMain.handle('paste', () => {
  const img = clipboard.readImage();
  if (!img.isEmpty()) {
    // shortcut: images are held in memory as PNG data URLs (50 big screenshots can use ~100MB RAM); lower the cap if that matters.
    list = add(list, { type: 'image', data: img.toDataURL() });
  } else {
    const text = clipboard.readText();
    if (!text.trim()) return { list, error: 'Nothing to add. Copy something first.' };
    list = add(list, { type: 'text', text });
  }
  return { list };
});
ipcMain.handle('copy', (_e, i) => {
  const e = list[i];
  if (!e) return 'Not found';
  if (e.type === 'text') { clipboard.writeText(e.text); return null; }
  clipboard.writeImage(nativeImage.createFromDataURL(e.data));
  return null;
});
ipcMain.handle('remove', (_e, i) => { list.splice(i, 1); return list; });
ipcMain.handle('quit', () => app.quit());
