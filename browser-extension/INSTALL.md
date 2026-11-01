# Installation

Quick start for the FitGirl Downloader browser extension. For what the
extension does, see `README.md`.

Requirements: Chrome 121+, Edge 121+ or Firefox 121+. There is no build step and
no package manager; the `browser-extension` folder is the extension.

## Chrome and Edge

1. Open the extensions page.

    chrome://extensions

   In Edge, `edge://extensions` works too.

2. Turn on **Developer mode** with the toggle in the top right.

3. Click **Load unpacked** and select the `browser-extension` folder, the one
   that contains `manifest.json`.

4. The extension appears in the list. Pin it from the toolbar puzzle-piece menu
   so the popup is one click away.

5. Open a FitGirl Repacks page that lists fuckingfast.co links. In the default
   modal mode, an **Open downloader** button appears next to the page's download
   heading.

### Updating a Chrome install

An unpacked extension never updates itself. Chrome offers no mechanism for that
outside the Web Store or an enterprise-managed install, so the extension checks
GitHub once a day and shows a banner in the popup naming any newer version, with
a **View** button to its release page.

To apply an update:

1. Pull the new commits into your local copy.

2. Open `chrome://extensions` and click the reload icon on the extension card.

3. Reload any open FitGirl page so the content script picks up the change.

Firefox does not need this — its signed build updates on its own.

## Firefox

There are two ways to run this in Firefox. Only the first updates itself.

### Signed build (recommended, auto-updates)

1. Open the repository's **Releases** page.

2. Download `fitgirl-downloader-<version>.xpi` from the newest release.

3. Open the downloaded file. Firefox shows an install prompt; accept it.

4. Open a FitGirl Repacks page to verify.

Firefox checks for a newer version about once a day and applies it
automatically. To force a check: **about:addons** → gear icon →
**Check for updates**.

If Firefox downloads the `.xpi` instead of installing it, right-click the file
and choose **Open With Firefox**. The server sends
`application/octet-stream`, which Firefox treats as a plain download until you
open it.

### Temporary add-on (development only, never updates)

Use this only when testing unreleased source. A temporary add-on disappears when
Firefox restarts and **never receives updates**.

1. Open `about:debugging#/runtime/this-firefox`.

2. Click **Load Temporary Add-on**.

3. Select `manifest.json` inside the `browser-extension` folder.

4. The add-on appears under **Temporary Extensions**. Open a FitGirl Repacks page
   to verify.

After restarting Firefox, repeat steps 1 to 3.

If you see "This add-on could not be installed because it appears to be
corrupt", the folder is missing a file listed in `manifest.json`. Check that
`shared/config.js`, `shared/icons.js`, `shared/theme.js` and the whole `content/`
folder are present.

## Verifying the install

On a FitGirl Repacks page with download links:

1. The panel opens from the heading button in modal mode, or is already on the
   page in inline mode.

2. File rows are listed with a **Pending** status.

3. **Calculate sizes** fills the size column.

4. **Start download** runs through the selected files.

5. The popup shows totals and any failed files.

## Reloading after changes

Chrome and Edge:

1. Open `chrome://extensions`.

2. Click the reload icon on the extension card.

3. Reload the FitGirl page so the content script runs again.

Firefox:

1. Open `about:debugging#/runtime/this-firefox`.

2. Click **Reload** next to the temporary add-on.

3. Reload the FitGirl page.

A theme or rendering-mode change made in the popup does not need this; the
extension applies it immediately, and reloads the active tab when the rendering
mode changes.

## Uninstalling

Chrome and Edge: `chrome://extensions`, then **Remove** on the extension card.

Firefox: `about:debugging#/runtime/this-firefox`, then **Remove** next to the
temporary add-on. Closing Firefox also removes it.

Removing the extension leaves nothing behind except its extension storage, which
the browser clears with the extension.

## Troubleshooting

### The button or panel does not appear

The page may have no recognisable fuckingfast.co links, or the content script
ran before the links were in the DOM. Reload the page.

### Nothing downloads

Check the delivery mode in the popup. **Hand-off** relies on a download manager
hook intercepting the request; **Browser downloads API** uses the browser
directly. Try the other mode to isolate the problem.

### Statistics stay at zero

The popup reads its counters from extension storage through the background
script. If the background failed to start, every counter stays zero and the
console shows a startup error. In Chrome, inspect the service worker from
`chrome://extensions`; in Firefox, open the add-on's console from
`about:debugging`.

### Firefox blocks background requests

Host permissions are granted at install from Firefox 127. On older versions the
content script still runs but background requests to fuckingfast.co can be
refused, which shows up as failed URL extraction or a size scan that never
completes. Update Firefox.