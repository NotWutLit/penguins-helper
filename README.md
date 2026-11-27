# Penguin's Helper

A penguin that sits at the bottom-right of your screen and holds your clipboard.

- Click the penguin to open its clipboard list.
- Press **Ctrl+V** while the penguin is focused. Text is kept in the list. Images, such as a Win+Shift+S screenshot, are saved as PNG files to `Pictures\Penguin's Helper` and kept in the list.
- Click an entry to copy it back to the clipboard. 📁 shows the image file in Explorer. ✕ closes the panel, **Quit** closes the app.

The history is stored in Electron's userData folder (`%APPDATA%\penguins-helper\history.json`).

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
