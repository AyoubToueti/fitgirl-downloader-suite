# FitGirl FDM Downloader (Tampermonkey)

A userscript that lists every fuckingfast.co link on a FitGirl page, lets you
pick which files you want, resolves the real download URL, and hands it to your
download manager. It uses the same panel design and the same link-resolution
flow as the `browser-extension`, so the two tools behave identically.

## What it does

### File selection

Every fuckingfast.co link on the page becomes a row with a checkbox, the file
name, the URL and a size cell. Select all / deselect all is one toggle. The
counter reads "X of Y files selected (Z skipped)". Selections are remembered per
page, keyed by URL hash, so each game page keeps its own.

### Skip and retry

**Skip** removes a file from the run and strikes it through; **Undo** restores
it. **Retry** is available on failed rows and on rows that already succeeded, so
a file can be re-downloaded without reloading the page.

### Size scan

**Calculate sizes** probes every file whose size is not already known, filling
the size column and a package summary that groups parts and totals them. Files
already resolved are skipped, so a second click only fills the gaps. **Cancel
scan** stops mid-run.

### Status tags

Each row carries a status, so nothing is ever blank:

- **Pending** — not started.
- **Processing** — resolving, with a spinner.
- **Success** — handed off; the Retry button stays visible.
- **Failed** — errored; hover the tag for the message.
- **Skipped** — excluded from the run.

### Themes

Light and dark, toggled from the panel header. The choice is stored and applies
to both the panel and the trigger button.

### Clear

**Clear** wipes everything saved for the current page: selections, skips, cached
sizes and this page's entries in the download history. A styled dialog asks for
confirmation first.

## How links are resolved

The old `window.open('/dl/...')` pattern no longer appears in the page markup.
fuckingfast.co now takes an HTMX POST to `/f/<id>/go` and returns the direct URL
in an `HX-Redirect` response header.

The userscript derives the file id from the link, issues that POST through
`GM_xmlhttpRequest` (a page-level `fetch` cannot read the response header
cross-origin), reads `HX-Redirect`, and hands the resulting URL to the browser
through a hidden anchor click. That anchor is what lets a download manager hook
such as FDM intercept the download.

Two fallbacks remain, in order: the legacy `window.open` pattern if the POST
yields nothing, then a constructed `https://fuckingfast.co/f/<id>/dl`.

## Installation

Requires [Tampermonkey](https://www.tampermonkey.net/) (or another userscript
manager that supports `GM_xmlhttpRequest`), and a browser that supports
constructable stylesheets — Chrome 73+, Edge 79+, Firefox 101+, Safari 16.4+.

1. Open the Tampermonkey dashboard.

2. Choose **Create a new script**.

3. Delete the placeholder code.

4. Paste the entire contents of `fitgirl_Tampermonkey_downloader.js`.

5. Save with Ctrl+S.

6. Visit a FitGirl Repacks page or a paste page that lists fuckingfast.co links.

## Usage

On a FitGirl or paste page:

1. Click **Open downloader** next to the download heading. If the page has no
   heading, a button appears centred on screen.

2. Deselect or **Skip** anything you do not want.

3. Optionally click **Calculate sizes** to fill the size column.

4. Click **Start download**. Each selected file is resolved and handed to the
   browser in turn, with a two-second gap between files.

5. **Stop** halts after the current file finishes; a second run works normally.

6. Close the panel with the header button or the Escape key.

On a fuckingfast.co `/dl/` page a floating **Send to downloader** button resolves
that single file directly.

## Regenerating the styles

The CSS and icon sprite inside the script are generated from the browser
extension, so the two UIs cannot drift. After changing
`browser-extension/shared/tokens.css`, `browser-extension/content/styles.css` or
`browser-extension/shared/icons.js`, regenerate:

    node scripts/build-userscript.mjs

That rewrites the three `<<<GENERATED:...>>>` regions in place. Do not edit
inside those markers by hand.

Two transforms are applied during generation:

- `:root` selectors become `:host`, because the panel lives in a shadow root.
- `body.fg-ui-modal-open` and `body.fg-links-modal-open` rules are dropped, since
  a shadow root cannot style the document body; scroll locking is handled in JS.

## Notes and limitations

- The panel renders inside a shadow root and uses an adopted constructable
  stylesheet. An inline `<style>` element would be refused by the paste site's
  Content-Security-Policy.
- There is no background context: extraction, storage, size scanning and stats
  all run inside the page.
- Delivery is an anchor click, matching the extension's native hand-off mode.
  There is no equivalent of the extension's `chrome.downloads` delivery mode.
- The page's own link list is left untouched; unlike the extension there is no
  "show original links" overlay to hide it.
- A temporary network failure during the size scan marks that file unknown
  rather than retrying automatically.

## Files

    tampermonkey-script/
      fitgirl_Tampermonkey_downloader.js   the userscript (single installable file)
      README.md                            this document
    scripts/
      build-userscript.mjs                 inlines the extension's CSS and icons

## Related

- Extension: [../browser-extension/](../browser-extension/)
- Suite overview: [../README.md](../README.md)