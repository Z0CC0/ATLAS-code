# Shell — the navigation, the address and the phone around an app

A screen can be right alone and wrong inside its app: the navigation moves, a reload forgets
the tab, the keyboard hides the button. The shell is what every screen shares, decided once.

## Navigation

Placed by width, the same on every page. Below 768 px: a bottom bar of five destinations or
fewer, each an icon with a visible label. From 1024 px: a sidebar or a top bar. Between the
two, the layout of 1024 or of the phone, never a third design. A menu button hides only what
does not fit: on a desktop with seven destinations or fewer, all are shown.
The current place is marked by look and by `aria-current="page"`, so it is seen and spoken.
The bar keeps its items, order and position from page to page; a section with its own
sub-navigation puts it inside the content.
Check: three routes at 375 and at 1280; the bar's bounding box is the same on each within
1 px, and exactly one link carries `aria-current`.

## The address holds what a person would share

Tab, filter, sort, search text, page and the selected item live in the URL, as path or
query, because a reload or a pasted link must land on the same view. A tab held only in
memory is lost on reload, and Back then leaves the app. A deliberate change (another tab,
another item) pushes a history entry; typing in a filter replaces the current one, so Back
does not step through every letter. Hover, an open tooltip, a half-typed draft stay out.
Back restores what was left: the scroll position and the values of the inputs, as the
browser does for plain pages. Data fetched for a list is cached by its URL, so the return
shows the list at once and not a spinner.
Check: choose a tab and a filter, reload, both are kept. Open an item from a list scrolled
to 2000 px, go Back: `scrollY` within 50 px of where it was, the search box still filled.

## A route change is announced

Each route sets `document.title`, the place first and the app second ("Invoice 1042 ·
Ledger"). Focus moves to the new page's `h1` (with `tabindex="-1"`) or to `main`, because a
keyboard or screen reader user is otherwise left on a link that is gone. A change inside the
page (a tab, a filter, a sort) leaves focus where it was.
Check: after each navigation the title differs from the last route, and
`document.activeElement` is the `h1` or `main`.
(Navigation and the state in the address: nextlevelbuilder/ui-ux-pro-max-skill, MIT.)

## The phone around the page

**Safe areas.** `viewport-fit=cover` in the viewport meta, and everything fixed or sticky at
an edge (header, tab bar, bottom action, floating button, toast) adds
`env(safe-area-inset-*)` to its own padding, with `max()` or `calc()`. Scrolling content
stays full width; only what is fixed keeps clear of the notch and the home indicator.
**Keyboard.** The focused field and its submit stay visible while the keyboard is up.
`interactive-widget=resizes-content` in the viewport meta where the browser honours it,
`visualViewport` otherwise; a bottom-fixed bar or composer sits above the keyboard. A form
long enough to scroll has its submit in the flow, not only in a fixed bar.
**Inputs.** Text in fields at 16 px or more, because iOS zooms the page on focus below that.
Each field says what it holds: `type` (`email`, `tel`, `url`; `number` only for quantities),
`inputmode` for the keyboard (`numeric` for codes, `decimal` for amounts), `autocomplete`
with its standard token (`email`, `current-password`, `one-time-code`, `postal-code`), and
`enterkeyhint` for what Return does (`next`, `search`, `send`, `done`).
**Overscroll.** Sheets, drawers, dialogs and inner scroll areas carry
`overscroll-behavior: contain`, so reaching their end neither scrolls the page behind nor
starts a pull to refresh; the page under an open dialog does not scroll.
**Landscape.** A phone turned is about 375 px tall: the fixed header and bottom bar take a
quarter of it at most, the side insets now apply, and the orientation is locked only when
the content needs it.
Check, at 375×812 with touch emulated, then at 812×375: fixed bars inside `innerHeight`;
focus the last field, and its rect and the submit's end above `visualViewport.height`;
every input's computed `font-size` at 16 px or more; scroll a sheet to its end, and the
page's `scrollY` does not change. Once on WebKit or a real iPhone at the same size, because
Chromium's emulation draws no notch and no keyboard: the fixed bars clear the insets there.
(Safe areas, input attributes and the keyboard: nextlevelbuilder/ui-ux-pro-max-skill, MIT;
the WebKit look: microsoft/playwright-cli, Apache-2.0.)

## Inside a native shell

A page shipped in Capacitor or another WebView keeps every rule here; `atlas-stack`'s
`native-shell.md` adds what the native side changes: system bars, the hardware Back,
storage and permissions.
