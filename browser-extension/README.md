# FitGirl Downloader - Browser Extension

A browser extension that automates downloads from FitGirl Repacks pages. It lists
every fuckingfast.co link on the page, lets you pick which files you want, hands
the direct URLs to your download manager, and remembers your selections per page.

The interface is a flat, text-first "desktop utility" design: hairline borders,
one accent colour, inline SVG icons, and a light/dark theme toggle. No emoji, no
gradients, no decorative shadows outside overlays.

## Features

### Download control

- **Start / Stop**: start a bulk run, or stop cleanly after the current file
  finishes so the file in flight is never corrupted.
- **Pause and resume**: stop mid-run and the extension records the file index,
  the page hash and the file list. Return to the same page within an hour and a
  resume banner offers to continue from that index.
- **Two delivery modes**: hand the URL to the page navigation flow so an
  external download manager (FDM and similar) can intercept it, or use the
  browser downloads API directly.

### File selection

- Per-file checkboxes, with Select all / Deselect all as a single toggle.
- Live counter: "X of Y files selected (Z skipped)".
- Page-scoped persistence keyed by URL hash, so each game page keeps its own
  selection.
- Search box that filters the visible rows by filename or URL.

### Skip and retry

- **Skip** a file to remove it from the run; skipped rows are struck through and
  greyed, with an **Undo** button to restore them.
- **Retry** is available on failed rows *and* on rows that already succeeded, so
  a file can be downloaded again without reloading the page.
- Bulk retry of every failed download is available from the popup.

### Size calculation

- **Calculate sizes** probes every file whose size is not already known.
  Files already resolved are skipped; entries previously marked unknown are
  re-probed, so clicking again recovers from a transient failure.
- Per-file size cell, a scan progress line, and a package summary that groups
  files by repack part and totals the known sizes.

### Status indicators

Every row shows a status tag, so no row is ever blank:

- **Pending** - not started yet (the default state).
- **Processing** - request in flight, with a spinner.
- **Success** / **Completed** - finished; a Retry button stays visible.
- **Failed** - errored; hover the tag for the error message.
- **Retrying** - a retry is running.
- **Skipped** - excluded from the run.

### Clear page state

The **Clear** button in the control column wipes everything the extension
remembers about the current page: selections, skips, cached sizes and any pause
state. The list is then rebuilt from the page. It asks for confirmation first.

### Themes

Light and dark themes, with the choice stored in extension storage and shared
between the popup and the in-page panel. See [Themes](#themes).

### Rendering modes

- **Modal UI** (default): a trigger button next to the page's download heading
  opens the panel in a centred overlay. Closes on Escape, backdrop click, or the
  close button.
- **Inline UI**: the panel is rendered directly above the download section.
- Switching mode in the popup reloads the active tab so the change applies at
  once.

### Original links overlay

In modal mode the page's own link list is hidden behind the panel. **Show
original links** opens a scrollable overlay listing each fuckingfast.co URL;
close it with the close button, a backdrop click, or Escape.

### Popup

- Totals for all, successful and failed downloads.
- Live progress bar when a run is active.
- Pause indicator with a Resume button that jumps back to the paused page.
- Retry all failed, view the failed list with error messages, and clear logs.
- Rendering mode and download delivery preferences.
- Theme toggle.

### fuckingfast.co pages

On a `/dl/` page a floating **Send to downloader** button downloads the file
directly. On a link page, **Extract & download** resolves the real URL first.

## Installation

### Chrome / Edge (Manifest V3)

1. Open `chrome://extensions/` and enable **Developer mode**.

2. Click **Load unpacked** and select the `browser-extension` folder.

3. Confirm the extension icon appears in the toolbar.

4. Open a FitGirl Repacks page with download links to verify.

There is no build step: the extension runs directly from source, and the same
folder loads in both engines.

Icons live in `icons/` as `icon16.png`, `icon48.png` and `icon128.png`.

Chrome may show the warning `'background.scripts' requires manifest version of
2 or lower`. It is expected and safe to ignore. The manifest declares both
background forms so a single folder works in Chrome and Firefox; Chrome 121+
ignores `scripts` and uses `service_worker`, while Firefox does the opposite.
The warning is cosmetic. A hard error instead means Chrome is older than 121.

### Firefox

Firefox 121 or newer.

**End users:** download `fitgirl-downloader-<version>.xpi` from the
[releases page](../releases) and open it. Firefox installs the signed build and
then keeps it up to date on its own, checking `docs/updates.json` roughly once a
day (or immediately from **about:addons** → gear icon → **Check for updates**).

This is the only Firefox install that updates. A temporary add-on loaded through
`about:debugging` never checks for updates and disappears when Firefox restarts.

**Developers:** to run unreleased source, open
`about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and
select `manifest.json` inside the `browser-extension` folder. Reload it the same
way after every change. Do not use this path to test update behaviour.

The manifest declares both `background.service_worker` and
`background.scripts`. Chrome uses the service worker, Firefox uses the event
page. This is why the extension needs Chrome 121 or Firefox 121 as a minimum:
older versions of either browser refuse the combined form.

## Usage

### On a FitGirl Repacks page

1. Open a game page that lists fuckingfast.co links.

2. Wait for the extension to detect the links (it retries for a few seconds).

3. In modal mode, click **Open downloader** next to the download heading. In
   inline mode the panel is already on the page.

### A typical run

1. Deselect or **Skip** anything you do not want.

2. Optionally click **Calculate sizes** to fill in the size column.

3. Click **Start download**.

4. Watch the status column and the footer status line.

5. Click **Stop** at any time; it pauses after the current file.

### Resuming

1. Click **Stop** during a run.

2. Return to the same page within one hour.

3. A banner appears: **Download paused - resume from file N of M**. Click
   **Resume**, or **Discard** to drop the saved session.

### Retrying

- Single file: click **Retry** on that row. Available on failed and on already
  successful rows.
- Everything that failed: open the popup and click **Retry all failed**.

### Clearing a page

Click **Clear** in the control column. This removes the saved selections, skips,
size results and pause state for the current page only. Download history and the
failed log are stored globally and are cleared from the popup instead.

## Themes

The theme toggle appears in the popup header and in the in-page panel header. It
shows the icon for the theme you would switch to (moon while light, sun while
dark).

- The choice is stored as `theme_mode` in extension storage and applies to both
  the popup and any open page panel immediately.
- On first use the theme follows the operating system setting and keeps tracking
  it until you toggle.
- The theme is applied with a `data-fg-theme` attribute on the document element,
  which is deliberately different from the common `data-theme` so host pages are
  not affected.

## Configuration

Timing and storage constants live in `shared/config.js`:

    CONFIG = {
      WAIT_BETWEEN: 3000,                  // ms between downloads
      MAX_RETRIES_EXTRACTION: 3,           // URL extraction retries
      MAX_RETRIES_FDM: 2,                  // download retries
      RETRY_BASE_DELAY_EXTRACTION: 2000,   // base retry delay (ms)
      RETRY_BASE_DELAY_FDM: 1000,          // download retry delay (ms)
      CONSECUTIVE_FAILURES_THRESHOLD: 3,   // pause after N failures in a row
      PAUSE_EXPIRATION_TIME: 3600000,      // 1 hour (ms)
      SIZE_CALC_TIMEOUT_MS: 12000,
      SIZE_CACHE_TTL_MS: 21600000          // 6 hours
    }

### Theming tokens

All colours, radii and type sizes are CSS custom properties in
`shared/tokens.css`, loaded before both `popup.css` and `content/styles.css`:

    :root {
      --surface: #ffffff;      /* card and panel background */
      --surface-2: #fafbfb;    /* headers and footers */
      --surface-3: #f4f6f7;    /* hover and table header */
      --border: #d7dbe0;       /* hairlines */
      --border-strong: #c3c9d0;
      --text: #1b1f24;
      --dim: #5c646e;
      --faint: #8a919b;
      --accent: #2f6fb5;       /* the single accent colour */
      --accent-hi: #285f9c;
      --accent-soft: #e9f1fa;
      --ok: #2e7d4f;
      --err: #b0403a;
      --warn: #8f6412;
      --r: 4px;
      --r-lg: 6px;
    }

The dark palette is declared twice: once under
`:root[data-fg-theme="dark"]` for an explicit choice, and once under
`@media (prefers-color-scheme: dark)` scoped to `:root:not([data-fg-theme])` as
a fallback before the theme script runs.

## File structure

    browser-extension/
      manifest.json                 MV3 manifest, registers scripts and CSS
      background/
        background.js               service worker: extraction, downloads, storage
      content/
        content-script.js           orchestrator, DOM cache, event wiring
        page-ui-manager.js          builds the panel, size-scan UI state
        modal-ui.js                 overlay container and trigger button
        inline-ui.js                in-place rendering
        link-list-manager.js        link extraction and file rows
        selection-manager.js        select all, skip, undo, reset
        download-manager.js         per-file and bulk download, retry
        size-compute-manager.js     size scan start, poll, cancel
        storage-manager.js          page state, pause state, clearing
        original-links-modal.js     original link overlay
        feedback-manager.js         counter, progress, status, notifications
        dom-helpers.js              hashing, filenames, timestamps, escaping
        mutation-handler.js         re-init when the page changes
        styles.css                  in-page stylesheet
      popup/
        popup.html
        popup.css
        popup.js
      shared/
        config.js                   constants, status enums, storage keys
        utils.js
        icons.js                    inline SVG sprite and icon() helper
        theme.js                    light/dark manager
        tokens.css                  design tokens and primitives
      icons/
        icon16.png
        icon48.png
        icon128.png

Script order matters: `config.js`, `utils.js`, `icons.js` and `theme.js` load
before any `content/` module, and `content-script.js` loads last.

## Permissions

- **storage** - selections, skips, sizes, pause state, preferences, history.
- **downloads** - handing a URL to the browser downloads API.
- **notifications** - status notifications.
- **tabs** - opening the paused page from the popup, reloading after a mode change.
- **host_permissions** - `paste.fitgirl-repacks.site`, `fuckingfast.co` and its
  subdomains.

## Troubleshooting

### The panel does not appear

- The page may not contain recognisable download links, or it loaded before the
  extension did. Reload the page.
- In modal mode, look for the **Open downloader** button next to the download
  heading.

### Downloads do not start

- Check the browser allows automatic downloads for the site.
- Confirm the delivery mode in the popup: **hand-off** relies on a download
  manager hook intercepting the request, **API** uses the browser directly.

### Resume banner is missing

Pause state is per page and expires after one hour.

### A row stays on Pending

Nothing has been requested for that file yet. Click **Start download**, or
**Download** on that row alone.

### Sizes are not filled in

Click **Calculate sizes**. It only probes files without a known size, so it will
report "All files already have known sizes" once everything is resolved.

## Development

Requirements: Chrome or Edge 88+, a text editor, basic JavaScript knowledge.

Reload loop:

1. Edit the source files.

2. Open `chrome://extensions/` and click the reload icon on the extension card.

3. Reload the FitGirl page to re-run the content script.

Debugging:

- Content script: right-click the page, Inspect, Console.
- Service worker: `chrome://extensions/` - Details - Inspect service worker.
- Popup: right-click the toolbar icon, Inspect popup.

Handy snippets:

    // log from the content script
    console.log('FitGirl Downloader:', message);

    // dump everything the extension has stored
    chrome.storage.local.get(null, (data) => console.log(data));

    // reset stored state
    chrome.storage.local.clear();

### Adding an icon

Add a symbol to the `SYMBOLS` map in `shared/icons.js`, then call
`FitGirlIcons.icon('name')` (or the per-class `icon()` helper) from markup.
The sprite is injected once per document.

### Adding a status

Add the value to `CONFIG.STATUS`, a class in the `tagClasses` map and a label in
the `statusTexts` map in `download-manager.js`, plus a `.fg-tag-*` rule in
`shared/tokens.css`.

## Known limitations

1. Only the domains listed in `manifest.json` can be accessed.
2. The background context is suspended after inactivity on both engines; it
   restarts on the next message.
3. Pause state expires after one hour.
4. Chrome 121+, Edge 121+ and Firefox 121+ only. Older versions reject the
   combined `background` block.
5. Firefox host permissions are granted at install from Firefox 127 onwards. On
   older versions the content scripts still inject, but background requests to
   fuckingfast.co may be refused.

## Credits

- FitGirl Repacks, for the repacks themselves.
- The Chrome extension API documentation.

## Related projects

- Main repository: [fitgirl-downloader-suite](../)
- Browser automation: [../browser-automation/](../browser-automation/)
- Tampermonkey script: [../tampermonkey-script/](../tampermonkey-script/)
- Python downloader: [../python-downloader/](../python-downloader/)

---

This extension is for personal automation convenience. Respect the terms of
service and rate limits of the sites you use it on.