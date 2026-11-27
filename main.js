const { app, BrowserWindow, ipcMain, clipboard, nativeImage, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const { add } = require('./history');
const google = require('./google');
const { dueReminders } = require('./reminders');

const SMALL = { width: 120, height: 120 };
const BIG = { width: 320, height: 440 };
const PEEK = { width: 22, height: 48 }; // tab left at the screen edge while the penguin is away
const BUBBLE = { width: 280, height: 220 }; // penguin plus a reminder bubble above it
let win, open = false, away = false, list = [];
let upcoming = [], shown = new Set(); // shown keys are memory-only: a restart may repeat today's reminders

async function refreshGoogle() {
  if (!google.connected()) return;
  try { upcoming = await google.upcoming(); }
  catch (e) {
    console.error('google:', e.message); // offline or a Google hiccup: keep the last list
    if (!google.connected()) { upcoming = []; win.webContents.send('google', false); }
  }
}
function checkReminders() {
  for (const r of dueReminders(upcoming, new Date(), shown)) {
    shown.add(r.key);
    win.webContents.send('remind', { label: r.label, title: r.title });
  }
}

function place(size, gap = 16) {
  const wa = screen.getPrimaryDisplay().workArea;
  win.setBounds({ x: wa.x + wa.width - size.width - gap, y: wa.y + wa.height - size.height, ...size });
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
  win.webContents.once('did-finish-load', () => refreshGoogle().then(checkReminders));
  setInterval(refreshGoogle, 5 * 60 * 1000);
  setInterval(checkReminders, 30 * 1000);
});

ipcMain.handle('list', () => list);
ipcMain.handle('hide', () => { open = false; away = true; place(PEEK, 0); });
ipcMain.handle('show', () => { away = false; place(SMALL); });
ipcMain.handle('bubble', (_e, on) => { if (!open && !away) place(on ? BUBBLE : SMALL); });
ipcMain.handle('google-status', () => google.connected());
ipcMain.handle('google-connect', async () => {
  try { await google.connect(); } catch (e) { return { error: e.message }; }
  await refreshGoogle(); checkReminders();
  return {};
});
ipcMain.handle('google-disconnect', () => { google.disconnect(); upcoming = []; });
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
