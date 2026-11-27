# Penguin's Helper

A penguin that sits at the bottom-right of your screen and holds your clipboard.

- Click the penguin to open its clipboard list.
- Press **Ctrl+V** while the penguin is focused. Whatever is on the clipboard, text or an image (such as a Win+Shift+S screenshot), is kept in the list. Nothing is saved as a separate file.
- Click an entry to copy it back to the clipboard. The chevron closes the panel, the power icon quits the app. The crossed-out eye sends the penguin away so it stops covering things; it leaves a small red tab at the screen edge, and clicking the tab brings it back.

The list lives in memory only. It starts empty every launch, and the trash icon deletes a single entry.

```
npm install
npm start
npm test
```

## Deadline reminders (Google Calendar and Google Tasks)

The penguin can remind you in a speech bubble:

- 15 minutes before a timed event in your primary calendar
- on the day of an all-day event
- when a task is overdue, due today, or due tomorrow

Click the bubble to dismiss it. If the penguin is hidden, its tab glows until you bring it back. Each reminder shows once per launch. Access is read-only. The sign-in is stored encrypted (Windows DPAPI) in `%APPDATA%\penguins-helper\google-token.bin`.

### One-time setup

Google requires every app to have its own OAuth client, so you need to create one:

1. Go to <https://console.cloud.google.com/>, create a project, then enable the **Google Calendar API** and the **Google Tasks API** (APIs & Services → Library).
2. Go to APIs & Services → OAuth consent screen. Choose **External**, fill in the app name and your email, and add yourself under **Test users**.
3. Go to APIs & Services → Credentials → Create credentials → OAuth client ID. Choose **Desktop app** as the application type, then download the JSON file.
4. Save that file as `%APPDATA%\penguins-helper\google-client.json`.
5. Open the penguin's panel and click **Connect**, then finish signing in in your browser.

While the consent screen is in **Testing** mode, Google expires the sign-in after 7 days and you have to click Connect again. To avoid that, click **Publish app** on the consent screen. Google will warn that the app is unverified, which is fine for an app only you use.

## Anti-cheat safety rule (Valorant / Vanguard)

This app has to stay boring to anti-cheat software. No tool may ever add any of these:

- native modules or automation libraries (robotjs, nut.js, iohook, AutoHotkey, ...)
- global hotkeys or low-level keyboard or mouse hooks
- simulated input
- screen capture APIs (`desktopCapturer`, etc.)
- injection into other processes or reading their memory

Tools only act on what the user hands the penguin while its own window has focus.
