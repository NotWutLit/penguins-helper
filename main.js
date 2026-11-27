const { app, BrowserWindow, ipcMain, clipboard, nativeImage, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const { add } = require('./history');

const SMALL = { width: 120, height: 120 };
const BIG = { width: 320, height: 440 };
let win, open = false, list = [];

const historyFile = () => path.join(app.getPath('userData'), 'history.json');

function load() {
  try { list = JSON.parse(fs.readFileSync(historyFile(), 'utf8')).filter((e) => e.text || e.data); } catch { list = []; }
}
function save() {
  const tmp = historyFile() + '.tmp'; // write-then-rename so a crash can't corrupt history
  fs.writeFileSync(tmp, JSON.stringify(list));
  fs.renameSync(tmp, historyFile());
}

function place(size) {
  const wa = screen.getPrimaryDisplay().workArea;
  win.setBounds({ x: wa.x + wa.width - size.width - 16, y: wa.y + wa.height - size.height, ...size });
}

app.whenReady().then(() => {
  load();
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
    // shortcut: images live as PNG data URLs in history.json (can reach tens of MB at 50 big screenshots); move to files if it gets slow.
    list = add(list, { type: 'image', data: img.toDataURL() });
  } else {
    const text = clipboard.readText();
    if (!text.trim()) return { list, error: 'Clipboard is empty' };
    list = add(list, { type: 'text', text });
  }
  save();
  return { list };
});
ipcMain.handle('copy', (_e, i) => {
  const e = list[i];
  if (!e) return 'Not found';
  if (e.type === 'text') { clipboard.writeText(e.text); return null; }
  clipboard.writeImage(nativeImage.createFromDataURL(e.data));
  return null;
});
ipcMain.handle('quit', () => app.quit());
