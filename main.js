const { app, BrowserWindow, ipcMain, clipboard, nativeImage, screen, Tray, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const { add } = require('./history');

// One fixed-size window in the bottom-right corner, flush with the screen edge. It never resizes:
// resizing a transparent window on Windows flashes the previous frame in the corner.
// Empty areas are click-through; the page turns clicks on only over the penguin, panel and peek tab.
const SIZE = { width: 336, height: 440 };
let win, tray, open = false, list = [];

// Start with Windows is on by default; unticking it in the tray leaves this marker file.
const noAutostartFile = () => path.join(app.getPath('userData'), 'no-autostart');
// The portable exe unpacks to a temp folder each run, so register the real file instead.
const exePath = () => process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
function setAutostart(on) {
  if (!app.isPackaged) return; // in dev this would register electron.exe itself
  app.setLoginItemSettings({ openAtLogin: on, path: exePath() });
  if (on) fs.rmSync(noAutostartFile(), { force: true }); else fs.writeFileSync(noAutostartFile(), '');
}

function makeTray() {
  tray = new Tray(path.join(__dirname, 'build', 'icon.ico'));
  tray.setToolTip("Penguin's Helper");
  const send = (cmd) => () => win.webContents.send('tray', cmd);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show penguin', click: send('show') },
    { label: 'Hide penguin', click: send('hide') },
    { type: 'separator' },
    { label: 'Start with Windows', type: 'checkbox', enabled: app.isPackaged,
      checked: app.isPackaged && !fs.existsSync(noAutostartFile()), click: (item) => setAutostart(item.checked) },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]));
  tray.on('click', send('show'));
}

// Only one penguin: a second launch (e.g. autostart plus a manual start) just exits.
const firstInstance = app.requestSingleInstanceLock();
if (!firstInstance) app.quit();
app.on('second-instance', () => win && win.webContents.send('tray', 'show'));

app.whenReady().then(() => {
  if (!firstInstance) return;
  // History is memory-only and starts empty each launch; remove the file older versions saved.
  fs.rmSync(path.join(app.getPath('userData'), 'history.json'), { force: true });
  win = new BrowserWindow({
    ...SIZE, frame: false, transparent: true, resizable: false, alwaysOnTop: true,
    skipTaskbar: true, hasShadow: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  const wa = screen.getPrimaryDisplay().workArea;
  win.setPosition(wa.x + wa.width - SIZE.width, wa.y + wa.height - SIZE.height);
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile('index.html');
  makeTray();
  if (!fs.existsSync(noAutostartFile())) setAutostart(true); // re-register each launch so the path stays current
});

ipcMain.handle('list', () => list);
ipcMain.handle('click-through', (_e, on) => win.setIgnoreMouseEvents(on, { forward: true }));
ipcMain.handle('hide', () => { open = false; });
ipcMain.handle('toggle', () => { open = !open; return open; });
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
