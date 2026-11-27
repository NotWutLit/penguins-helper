const { app, BrowserWindow, ipcMain, clipboard, nativeImage, screen, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { add } = require('./history');

const SMALL = { width: 120, height: 120 };
const BIG = { width: 320, height: 440 };
let win, open = false, list = [];

const historyFile = () => path.join(app.getPath('userData'), 'history.json');
const shotsDir = () => path.join(app.getPath('pictures'), "Penguin's Helper");

function load() {
  try { list = JSON.parse(fs.readFileSync(historyFile(), 'utf8')); } catch { list = []; }
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

function stamp() {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
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
    fs.mkdirSync(shotsDir(), { recursive: true });
    let file = path.join(shotsDir(), `screenshot-${stamp()}.png`);
    for (let i = 2; fs.existsSync(file); i++) file = path.join(shotsDir(), `screenshot-${stamp()}-${i}.png`);
    fs.writeFileSync(file, img.toPNG());
    list = add(list, { type: 'image', path: file });
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
  if (!fs.existsSync(e.path)) return 'Image file was moved or deleted';
  clipboard.writeImage(nativeImage.createFromPath(e.path));
  return null;
});
ipcMain.handle('reveal', (_e, i) => { if (list[i]?.path) shell.showItemInFolder(list[i].path); });
ipcMain.handle('quit', () => app.quit());
