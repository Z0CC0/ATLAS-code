# Desktop: the doors an Electron or Tauri app has instead of routes

Read when the project depends on `electron` or `@tauri-apps/*`, or the request names a
desktop app, a preload or IPC. The doors here join the door list of `code.md`; the proof and
the tiers are `method.md`'s. The renderer is outside the trust boundary: any page it shows,
or any script that gets into it, reaches the main process through what is listed below. A
hole in the renderer (raw HTML, `security.md`) becomes code execution through a bridge that
is too wide, so the width of the bridge sets the tier.

## Electron

- **Windows.** Every `BrowserWindow` and its `webPreferences`: `contextIsolation` false,
  `nodeIntegration` true, `sandbox` false, `webSecurity` false. Each is its own line; in a
  window that loads remote content, `high`.
- **The preload bridge.** What `contextBridge.exposeInMainWorld` hands the page. A raw
  `ipcRenderer`, a generic `invoke(channel, ...args)` that forwards any channel, or `fs`,
  `child_process` or `shell` exposed: the page then holds every handler in main. The fix is
  one narrow function per action, with its channel fixed in the preload.
- **Handlers in main.** Every `ipcMain.handle` and `ipcMain.on`: which arguments it trusts,
  whether it checks `event.senderFrame` (its URL or origin) when more than one origin can
  load, and what it reaches (a path written, a process started, a URL opened). A handler that
  writes or runs from renderer arguments behind a generic bridge is `high` or above.
- **Navigation and new windows.** `will-navigate` and `setWindowOpenHandler` missing or
  allowing any URL: a link or a redirect puts a remote page in a window that has the bridge.
- **Opening outside.** `shell.openExternal`, `shell.openPath` or `loadURL` on a value that is
  not a constant: a scheme check (`https:` only, or a list of hosts) before the call.
- **Custom protocols and deep links.** A `protocol.handle` or a file protocol that maps a URL
  to a path without resolving it and checking the prefix; a deep link (`open-url`, the
  arguments of a second instance) that changes state or runs an action with no step the user
  sees and confirms.
- **A local server.** An HTTP or WebSocket server on `127.0.0.1` or `localhost`: any web page
  the user opens can reach it. Without a token made at launch and a check of `Origin` and
  `Host`, every handler it serves is a door from the web.
- **The updater.** A feed over plain `http`; a signature checked but not the version (an
  older signed build accepted) or the channel; signature checks turned off in the config.

## Tauri

The same questions in its terms: a capability or allowlist scope wider than the app needs
(`fs`, `shell`, `http`, a path scope of `**`); every `#[tauri::command]` read as an IPC
handler, for what it trusts; a remote URL granted IPC by a capability; the CSP in
`tauri.conf.json` set to null; the updater's public key and endpoints.

## The built app

What the source says is not always what ships. The packaged `.asar` or binary, and its
fuses, are read with `atlas-artifact`'s `app.md`. (The pass: usestrix/strix, Apache-2.0, and
cloudflare/security-audit-skill, MIT.)
