# Penguin's Helper

A penguin that sits at the bottom-right of your screen and holds your clipboard.

- Click the penguin to open its clipboard list.
- Press **Ctrl+V** while the penguin is focused. Whatever is on the clipboard, text or an image (such as a Win+Shift+S screenshot), is kept in the list. Nothing is saved as a separate file.
- Click an entry to copy it back to the clipboard. ✕ closes the panel, **Quit** closes the app.

The list lives in memory only. It starts empty every launch, and 🗑 deletes a single entry.

```
npm install
npm start
npm test
```

## Anti-cheat safety rule (Valorant / Vanguard)

This app has to stay boring to anti-cheat software. No tool may ever add any of these:

- native modules or automation libraries (robotjs, nut.js, iohook, AutoHotkey, ...)
- global hotkeys or low-level keyboard or mouse hooks
- simulated input
- screen capture APIs (`desktopCapturer`, etc.)
- injection into other processes or reading their memory

Tools only act on what the user hands the penguin while its own window has focus.
