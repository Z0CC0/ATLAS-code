# Native shell — a web app shipped as an iOS or Android app with Capacitor

On top of `typescript.md` and the framework's file; screens follow `atlas-ui` and `shell.md`.
Capacitor changes between majors (target SDK, system bars, live reload): the version
installed decides, and its documentation is read for every name below.
(The ideas: Capacitor's documentation, Apache-2.0; the checks are ours.)

## When it is the right choice

Capacitor: a web app made of content and forms that needs a store listing or a few device
features (camera, push, files, biometrics, share). A PWA: neither a store nor a feature the
browser lacks is needed, so one build less and no review. A native build: the value is the
native feel itself (gesture-heavy lists at 60 fps, deep navigation stacks, long background
work, games). A shell loading the live site from a URL is a likely store refusal for minimum
functionality: the built assets ship inside. Check: the plan names the choice and why.

## The project and the loop

`webDir` is the bundler's output folder. `ios/` and `android/` are source and committed,
because they carry hand edits (Info.plist, the manifest, entitlements, icons). The core, the
CLI and the platform packages stay on one version. Build the web app, then sync (copies the
bundle, updates native plugins) after any change of plugin or config; a copy is enough when
only web code changed. Live reload goes through the CLI's run option, never a committed
`server.url` or cleartext traffic. Check: CI fails a release config with `server.url` set;
the bundle in the built app matches the last `webDir` build.

## Safe areas and edge to edge

`viewport-fit=cover`, and every fixed bar padded with `env(safe-area-inset-*)`, as in
`shell.md`. Current Android draws the app under the system bars with no opt-out, so the old
status bar's overlay and background colour do nothing there; the core's system bars plugin
and its insets setting handle it, also for WebViews below Chromium 140, whose `env()` values
are wrong. Check: on an emulator with a cutout and gesture navigation, and an iPhone
simulator with a notch, the header starts at or below the top inset and the tab bar ends
at or above the viewport height minus the bottom inset.

## The keyboard

The iOS resize mode (whole view, body, or none) is chosen and written in the config; on
Android edge to edge, the keyboard plugin's full-screen resize workaround is on. A fixed
composer moves up by the height the show event reports. Check: on a 375×667 device, the
last field and its submit stay above the keyboard.

## Behaving like an app

Android Back steps back through the app's history and exits only at the root. The status bar
style follows the theme. The splash hides when the first real screen has painted, not on a
timer. Nothing only on hover; no grey tap flash; no selection or long-press callout on
chrome (bars, tabs, buttons), while content stays selectable; the page body does not bounce.
Check: Back from depth 2 lands on depth 1 and exits at the root; no blank frame at cold start.

## Storage that survives

iOS may clear localStorage and IndexedDB under storage pressure. Small settings through the
preferences plugin, large data through SQLite or files, tokens in the Keychain or Keystore.
The scheme and hostname the app is served from are its origin: changing either loses all
web storage. Check: no token in localStorage by grep; scheme and hostname as last release.

## Permissions at the moment of use

Every plugin's iOS usage description is present and says why in the user's words: a missing
one crashes the app the first time the feature runs. Check the permission first; on
`prompt`, explain in the app, then ask at the tap that needs it, never at launch; on
`denied`, say what is lost and offer the way to Settings. Check: first launch shows no
system prompt; each plugin in `package.json` has its Info.plist keys and manifest entries.

## Deep links and sign-in

HTTPS links (Universal Links, App Links), not custom schemes, which any app can claim. The
Apple association file sits in `.well-known`, with no extension, over HTTPS with no
redirect; the Android one carries the fingerprint of the store's signing key, not the upload
key, and the intent filter verifies itself. The URL-open listener routes by the parsed
pathname, never by splitting the string. OAuth runs with PKCE in the system browser; no
token passes through a custom scheme. Check: `adb shell pm get-app-links` says verified, and
Apple's validator passes.

## What the stores require

The Android target SDK is the one the Capacitor major sets. On iOS a privacy manifest with
reason codes for the APIs that need them (preferences and file storage do). Icons and splash
generated from one large source by the assets tool; Android 12 and later show an icon on a
colour. An app that creates accounts lets them be deleted inside it. The release build is
tested, not only debug, because the shrinker removes what debug kept. iOS needs a Mac and a
physical device before submission. Check: a pre-submit list run on the built artifacts.

## One codebase, still a website

Native calls behind the platform check or the plugin's web implementation, so the dev server
still runs in a browser; file URIs converted by the core's helper before an `img` uses them;
a content security policy listing the API hosts. Check: the web build has no console errors.
