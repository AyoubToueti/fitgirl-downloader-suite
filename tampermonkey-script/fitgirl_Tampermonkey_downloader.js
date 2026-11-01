// ==UserScript==
// @name         FitGirl FDM Downloader
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  Select files, scan sizes and hand FitGirl fuckingfast.co downloads to your download manager
// @author       Your Name
// @match        https://fitgirl-repacks.site/*
// @match        https://*.fitgirl-repacks.site/*
// @match        http://fitgirl-repacks.site/*
// @match        http://*.fitgirl-repacks.site/*
// @match        https://fuckingfast.co/*
// @match        https://*.fuckingfast.co/*
// @match        http://fuckingfast.co/*
// @match        http://*.fuckingfast.co/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @grant        GM_log
// @connect      fuckingfast.co
// @connect      fitgirl-repacks.site
// @run-at       document-idle
// @noframes
// ==/UserScript==

/*
 * The CSS and icon sprite below are generated from the browser extension by
 * scripts/build-userscript.mjs. Do not edit inside the GENERATED markers:
 * change browser-extension/shared/tokens.css, content/styles.css or
 * shared/icons.js and re-run the script instead.
 */

(function () {
  'use strict';

  // <<<GENERATED:TOKENS_CSS>>>
const TOKENS_CSS = String.raw`
/* shared/tokens.css
   Design tokens and primitives shared by the popup and the in-page UI.
   Loaded before popup.css and content/styles.css. */

/* Normalise box sizing for every extension surface. Chrome's UA stylesheet
   already sets border-box on form controls, Firefox does not, so without this
   the same \`height: 27px\` on a bordered button renders 2px taller in Firefox. */
.fg-download-ui,
.fg-download-ui *,
.fg-download-ui *::before,
.fg-download-ui *::after,
.fg-ui-modal,
.fg-ui-modal *,
.fg-links-modal,
.fg-links-modal *,
.fg-dialog,
.fg-dialog *,
.fg-resume-banner,
.fg-resume-banner *,
.fg-float-btn {
  box-sizing: border-box;
}

:host {
  /* surfaces */
  --surface: #ffffff;
  --surface-2: #fafbfb;
  --surface-3: #f4f6f7;
  --page: #e9ebed;

  /* lines */
  --border: #d7dbe0;
  --border-strong: #c3c9d0;

  /* text */
  --text: #1b1f24;
  --dim: #5c646e;
  --faint: #8a919b;

  /* accent */
  --accent: #2f6fb5;
  --accent-hi: #285f9c;
  --accent-soft: #e9f1fa;
  --accent-line: #a8c2de;

  /* status */
  --ok: #2e7d4f;
  --ok-soft: #e7f2eb;
  --ok-line: #b9d8c6;
  --err: #b0403a;
  --err-soft: #fbeceb;
  --err-line: #e0bdb9;
  --warn: #8f6412;
  --warn-soft: #fbf4e4;
  --warn-line: #e3d2ab;

  /* geometry */
  --r: 4px;
  --r-lg: 6px;
  --row-h: 44px;

  /* type */
  --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --mono: ui-monospace, 'SF Mono', 'Cascadia Mono', Menlo, Consolas, monospace;
  --fs-micro: 10px;
  --fs-sm: 11px;
  --fs-base: 12px;
  --fs-md: 13px;
  --fs-lg: 17px;

  /* elevation, overlays only */
  --shadow-overlay: 0 12px 32px rgba(16, 24, 40, 0.16);
  --shadow-float: 0 2px 8px rgba(16, 24, 40, 0.12);

  /* Tell the UA which scheme the widgets are drawn in. Without this, native
     controls (checkbox, search field, scrollbars) stay light while the panel
     is dark, most visibly in Firefox. */
  color-scheme: light;
}

:host([data-fg-theme="dark"]) {
  color-scheme: dark;
}

/* Explicit dark: the user picked it, so it overrides the OS preference. */
:host([data-fg-theme="dark"]) {
  --surface: #16191d;
  --surface-2: #1b1f24;
  --surface-3: #22262c;
  --page: #101215;

  --border: #2b3037;
  --border-strong: #3a4048;

  --text: #e6e9ec;
  --dim: #a4abb4;
  --faint: #7b828b;

  --accent: #5b9bd5;
  --accent-hi: #74ade0;
  --accent-soft: #1d2a38;
  --accent-line: #37516b;

  --ok: #5cb87f;
  --ok-soft: #17281e;
  --ok-line: #2f5140;
  --err: #e07b73;
  --err-soft: #2c1b1a;
  --err-line: #573230;
  --warn: #d5a63f;
  --warn-soft: #2b2314;
  --warn-line: #574525;

  --shadow-overlay: 0 12px 32px rgba(0, 0, 0, 0.55);
  --shadow-float: 0 2px 8px rgba(0, 0, 0, 0.45);
}

/* Fallback for when the theme script has not set the attribute yet (or
   failed to load): follow the OS preference. An explicit light choice on a
   dark OS is honoured by excluding [data-fg-theme="light"]. */
@media (prefers-color-scheme: dark) {
  :host(:not([data-fg-theme])) {
    --surface: #16191d;
    --surface-2: #1b1f24;
    --surface-3: #22262c;
    --page: #101215;

    --border: #2b3037;
    --border-strong: #3a4048;

    --text: #e6e9ec;
    --dim: #a4abb4;
    --faint: #7b828b;

    --accent: #5b9bd5;
    --accent-hi: #74ade0;
    --accent-soft: #1d2a38;
    --accent-line: #37516b;

    --ok: #5cb87f;
    --ok-soft: #17281e;
    --ok-line: #2f5140;
    --err: #e07b73;
    --err-soft: #2c1b1a;
    --err-line: #573230;
    --warn: #d5a63f;
    --warn-soft: #2b2314;
    --warn-line: #574525;

    --shadow-overlay: 0 12px 32px rgba(0, 0, 0, 0.55);
    --shadow-float: 0 2px 8px rgba(0, 0, 0, 0.45);
  }
}

/* Inline SVG icons from shared/icons.js */
.fg-icon {
  width: 14px;
  height: 14px;
  flex: none;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
  vertical-align: -2px;
  pointer-events: none;
}

.fg-icon-sm {
  width: 11px;
  height: 11px;
}

/* Status tag, shared by popup and in-page list */
.fg-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid transparent;
  font: 500 10px/1.5 var(--font);
  white-space: nowrap;
}

.fg-tag::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  flex: none;
}

.fg-tag-proc {
  color: var(--warn);
  background: var(--warn-soft);
  border-color: var(--warn-line);
}

.fg-tag-ok {
  color: var(--ok);
  background: var(--ok-soft);
  border-color: var(--ok-line);
}

.fg-tag-err {
  color: var(--err);
  background: var(--err-soft);
  border-color: var(--err-line);
}

.fg-tag-skip {
  color: var(--faint);
  background: var(--surface-3);
  border-color: var(--border);
}

.fg-tag-pending {
  color: var(--dim);
  background: transparent;
  border-color: var(--border-strong);
}

@keyframes fg-spin {
  to {
    transform: rotate(360deg);
  }
}

.fg-spinner {
  display: inline-block;
  width: 9px;
  height: 9px;
  flex: none;
  border: 1.5px solid var(--warn-line);
  border-top-color: var(--warn);
  border-radius: 50%;
  animation: fg-spin 0.7s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .fg-spinner {
    animation: none;
  }
}

/* ---------------------------------------------------------------
   Confirmation dialog
   Shared by the popup and the in-page UI so both replace the
   browser's built-in confirm() with the extension's own styling.
   --------------------------------------------------------------- */

.fg-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 13000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(16, 24, 40, 0.62);
  animation: fg-dialog-fade 0.15s ease;
}

.fg-dialog {
  width: min(360px, 100%);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-overlay);
  overflow: hidden;
}

.fg-dialog-header {
  padding: 10px 12px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--text);
}

.fg-dialog-body {
  padding: 12px;
  font-size: var(--fs-base);
  line-height: 1.5;
  color: var(--dim);
}

.fg-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 12px;
  background: var(--surface-2);
  border-top: 1px solid var(--border);
}

.fg-dialog-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 27px;
  padding: 0 10px;
  font-family: var(--font);
  font-size: var(--fs-base);
  font-weight: 500;
  line-height: 1;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--r);
  cursor: pointer;
  white-space: nowrap;
  -moz-appearance: none;
  appearance: none;
}

.fg-dialog-btn:hover {
  background: var(--surface-3);
  border-color: var(--faint);
}

.fg-dialog-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.fg-dialog-btn-primary {
  color: #fff;
  background: var(--accent);
  border-color: var(--accent);
}

.fg-dialog-btn-primary:hover {
  background: var(--accent-hi);
  border-color: var(--accent-hi);
}

.fg-dialog-btn-danger {
  color: #fff;
  background: var(--err);
  border-color: var(--err);
}

.fg-dialog-btn-danger:hover {
  background: var(--err);
  border-color: var(--err);
  filter: brightness(1.08);
}

@keyframes fg-dialog-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .fg-dialog-overlay {
    animation: none;
  }
}`;
// <<<END:TOKENS_CSS>>>

  // <<<GENERATED:PANEL_CSS>>>
const PANEL_CSS = String.raw`
/* content/styles.css
   In-page UI for FitGirl / fuckingfast pages.
   Design tokens live in shared/tokens.css. Every selector name is kept
   from the previous stylesheet so the JS bindings continue to work. */

/* Keep viewport positioning reliable for fixed overlays */
html,
body,
.fg-ui-modal-overlay,
.fg-ui-modal,
.fg-links-modal-overlay,
.fg-links-modal {
  contain: none !important;
}

/* ---------- Main shell ---------- */

.fg-download-ui {
  margin: 24px 0;
  padding: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  font-family: var(--font);
  font-size: var(--fs-base);
  color: var(--text);
  display: grid;
  grid-template-columns: 264px minmax(0, 1fr);
  grid-template-areas:
    'header header'
    'controls list'
    'status status';
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ---------- Header ---------- */

.fg-header {
  grid-area: header;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 9px 12px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
}

.fg-header h3 {
  margin: 0;
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.fg-header .fg-toggle-links {
  white-space: nowrap;
  margin-left: auto;
}

.fg-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}

.fg-theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  flex: none;
  color: var(--dim);
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--r);
  cursor: pointer;
  line-height: 1;
}

.fg-theme-toggle:hover {
  color: var(--text);
  background: var(--surface-3);
}

.fg-theme-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.fg-downloadlinks-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* ---------- Progress ---------- */

.fg-progress-container {
  margin-top: 10px;
}

.fg-progress-bar {
  position: relative;
  height: 6px;
  border-radius: 2px;
  background: var(--surface-3);
  overflow: hidden;
  box-shadow: inset 0 1px 1px rgba(16, 24, 40, 0.06);
}

.fg-progress-fill {
  display: block;
  height: 100%;
  width: 0;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.25s ease;
}

.fg-progress-text {
  margin-top: 6px;
  font-size: var(--fs-sm);
  color: var(--faint);
  font-variant-numeric: tabular-nums;
  text-align: left;
}

/* ---------- Controls (side panel) ---------- */

.fg-controls {
  grid-area: controls;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  background: var(--surface-2);
  border-right: 1px solid var(--border);
  height: min(56vh, 600px);
  overflow-y: auto;
  scrollbar-width: thin;
}

.fg-search-row {
  display: flex;
}

.fg-file-search-input {
  width: 100%;
  min-width: 0;
  height: 27px;
  padding: 0 7px;
  font-family: var(--font);
  font-size: var(--fs-base);
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--r);
  -moz-appearance: none;
  appearance: none;
}

.fg-file-search-input::placeholder {
  color: var(--faint);
}

.fg-file-search-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(47, 111, 181, 0.15);
}

.fg-control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fg-control-group .fg-btn {
  width: 100%;
  justify-content: flex-start;
}

/* Hidden-state helper for controls that exist in the markup but should only
   be visible while their action is available. The !important guarantees the
   hidden state wins over host-page rules and any leftover inline display. */
.fg-download-ui .fg-hidden {
  display: none !important;
}

.fg-toggle-select-control {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 25px;
  padding: 0 7px;
  margin: 0;
  font-size: var(--fs-base);
  font-weight: 400;
  color: var(--dim);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--r);
  cursor: pointer;
}

.fg-toggle-select-control:hover {
  background: var(--surface-3);
  border-color: var(--border);
}

.fg-toggle-select-checkbox {
  width: 13px;
  height: 13px;
  margin: 0;
  accent-color: var(--accent);
  cursor: pointer;
}

.fg-toggle-select-text {
  font-size: var(--fs-base);
  color: var(--dim);
  user-select: none;
}

.fg-toggle-select-checkbox:disabled {
  cursor: not-allowed;
}

.fg-toggle-select-control:has(.fg-toggle-select-checkbox:disabled) {
  opacity: 0.55;
  cursor: not-allowed;
}



.fg-control-group .fg-reset-selection,
.fg-control-group .fg-toggle-links {
  margin-left: 0;
}

.fg-selection-controls {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* ---------- Counters and progress text ---------- */

.fg-counter {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0;
  background: transparent;
  font-size: var(--fs-base);
  color: var(--dim);
}

.fg-counter-text {
  font-size: var(--fs-base);
  font-weight: 400;
  color: var(--dim);
  font-variant-numeric: tabular-nums;
}

.fg-size-progress {
  padding: 8px;
  margin: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
}

.fg-size-progress-text {
  font-size: var(--fs-sm);
  font-weight: 400;
  color: var(--faint);
  font-variant-numeric: tabular-nums;
}

/* ---------- Package summary ---------- */

.fg-package-summary {
  border: 1px solid var(--border);
  border-radius: var(--r);
  background: var(--surface);
  overflow: hidden;
}

.fg-package-summary:empty {
  display: none;
}

.fg-package-summary-title {
  display: flex;
  justify-content: space-between;
  padding: 6px 8px;
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--dim);
  background: var(--surface-3);
  border-bottom: 1px solid var(--border);
}

.fg-package-summary-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.fg-package-summary-list li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 2px 8px;
  padding: 6px 8px;
  border-top: 1px solid var(--border);
  font-size: var(--fs-sm);
}

.fg-package-summary-list li:first-child {
  border-top: 0;
}

.fg-package-name {
  grid-column: 1 / 2;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fg-package-size {
  grid-column: 2 / 3;
  color: var(--ok);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.fg-package-meta {
  grid-column: 1 / 3;
  color: var(--faint);
  font-size: var(--fs-micro);
}

/* ---------- Buttons ---------- */

.fg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 27px;
  padding: 0 9px;
  font-family: var(--font);
  font-size: var(--fs-base);
  font-weight: 500;
  line-height: 1;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--r);
  cursor: pointer;
  white-space: nowrap;
  /* Firefox paints form controls with the native widget unless told otherwise,
     which changes padding, text rendering and the border. */
  -moz-appearance: none;
  appearance: none;
}

.fg-btn:hover:not(:disabled) {
  background: var(--surface-3);
  border-color: var(--faint);
}

.fg-btn:active:not(:disabled) {
  background: var(--border);
}

.fg-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.fg-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fg-btn-primary {
  color: #fff;
  background: var(--accent);
  border-color: var(--accent);
}

.fg-btn-primary:hover:not(:disabled) {
  background: var(--accent-hi);
  border-color: var(--accent-hi);
}

.fg-btn-success {
  color: #fff;
  background: var(--ok);
  border-color: var(--ok);
}

.fg-btn-success:hover:not(:disabled) {
  background: var(--ok);
  filter: brightness(1.08);
}

.fg-btn-danger {
  color: var(--err);
  background: var(--surface);
  border-color: var(--err-line);
}

.fg-btn-danger:hover:not(:disabled) {
  color: var(--err);
  background: var(--err-soft);
  border-color: var(--err);
}

.fg-btn-secondary {
  color: var(--dim);
}

.fg-btn-secondary:hover:not(:disabled) {
  color: var(--text);
}

.fg-btn-sm {
  height: 25px;
  padding: 0 7px;
  font-size: var(--fs-sm);
}

.fg-btn-xs {
  height: 22px;
  padding: 0 7px;
  font-size: var(--fs-sm);
  color: var(--dim);
}

.fg-btn-xs:hover:not(:disabled) {
  color: var(--text);
}

.fg-calc-sizes-btn {
  color: var(--accent);
  border-color: var(--accent-line);
}

.fg-calc-sizes-btn:hover:not(:disabled) {
  background: var(--accent-soft);
  border-color: var(--accent);
}

/* ---------- File list ---------- */

.fg-file-list {
  grid-area: list;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: min(56vh, 600px);
  max-height: min(56vh, 600px);
  overflow-y: auto;
  background: var(--surface);
  scrollbar-width: thin;
  scrollbar-color: var(--border-strong) transparent;
}

.fg-file-list::-webkit-scrollbar {
  width: 8px;
}

.fg-file-list::-webkit-scrollbar-track {
  background: transparent;
}

.fg-file-list::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: 4px;
}

/* Column header row */
.fg-file-list-head {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) 92px 88px 168px;
  align-items: center;
  gap: 10px;
  height: 26px;
  padding: 0 12px;
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--surface-3);
  border-bottom: 1px solid var(--border);
  font-size: var(--fs-micro);
  letter-spacing: 0.07em;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--faint);
}

/* File row */
.fg-file-item {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) 92px 88px 168px;
  align-items: center;
  gap: 10px;
  min-height: var(--row-h);
  padding: 0 12px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  border-radius: 0;
}

.fg-file-item:hover {
  background: var(--surface-2);
}

.fg-file-item:last-child {
  border-bottom: 0;
}

.fg-file-item:not(.fg-file-skipped) {
  cursor: pointer;
  -webkit-user-select: none;
  user-select: none;
}

.fg-file-skipped {
  background: var(--surface-2);
}

.fg-file-skipped .fg-file-name {
  color: var(--faint);
  text-decoration: line-through;
}

.fg-file-checkbox {
  display: flex;
  align-items: center;
}

.fg-checkbox {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: var(--accent);
  cursor: pointer;
}

.fg-checkbox:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.fg-file-info {
  min-width: 0;
}

.fg-file-name {
  font-size: var(--fs-base);
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fg-file-url {
  margin-top: 2px;
  font-family: var(--mono);
  font-size: var(--fs-micro);
  color: var(--faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fg-file-size {
  font-size: var(--fs-sm);
  color: var(--dim);
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

.fg-file-size.is-known {
  color: var(--ok);
  font-weight: 600;
}

.fg-file-size.is-unknown {
  color: var(--warn);
}

.fg-file-status {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
}

.fg-file-status .fg-tag {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fg-file-actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
  flex-wrap: nowrap;
  min-width: 0;
  opacity: 0;
  transition: opacity 0.12s ease;
}

.fg-file-actions .fg-btn-xs {
  flex: none;
  padding: 0 6px;
}

.fg-file-item:hover .fg-file-actions,
.fg-file-item .fg-file-actions:focus-within,
.fg-file-item .fg-file-actions.always,
.fg-file-item.fg-file-skipped .fg-file-actions {
  opacity: 1;
}

/* ---------- Status bar ---------- */

.fg-status-panel {
  grid-area: status;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 12px;
  background: var(--surface-2);
  border-top: 1px solid var(--border);
}

.fg-status-text {
  font-size: var(--fs-sm);
  font-weight: 400;
  color: var(--dim);
  text-align: left;
}

/* ---------- Resume banner ---------- */

.fg-resume-banner {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  width: min(560px, calc(100% - 32px));
  padding: 12px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-overlay);
  animation: fg-slide-down 0.2s ease;
}

@keyframes fg-slide-down {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .fg-resume-banner {
    animation: none;
  }
}

.fg-resume-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.fg-resume-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: var(--r);
  background: var(--accent-soft);
  color: var(--accent);
}

.fg-resume-info {
  flex: 1;
  min-width: 0;
}

.fg-resume-info strong {
  display: block;
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--text);
}

.fg-resume-info p {
  margin: 3px 0 0;
  font-size: var(--fs-sm);
  color: var(--dim);
}

.fg-resume-actions {
  display: flex;
  gap: 6px;
  flex: none;
}

/* ---------- Trigger buttons ---------- */

.fg-ui-trigger-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 9px;
  font-family: inherit;
  font-size: var(--fs-base);
  font-weight: 500;
  line-height: 1;
  color: var(--accent);
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--r);
  cursor: pointer;
  vertical-align: middle;
}

.fg-ui-trigger-btn:hover {
  background: var(--accent-soft);
  border-color: var(--accent-line);
}

.fg-ui-trigger-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.fg-ui-trigger-inline {
  position: static;
  z-index: auto;
  vertical-align: middle;
}

.fg-ui-trigger-floating {
  position: fixed;
  bottom: 20px;
  right: 16px;
  z-index: 10000;
}

/* ---------- Extension modal ---------- */


.fg-ui-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: none;
  align-items: center;
  justify-content: center;
  padding: clamp(8px, 2vw, 20px);
  background: rgba(16, 24, 40, 0.62);
}

.fg-ui-modal-overlay.is-open {
  display: flex;
}

.fg-ui-modal {
  display: flex;
  flex-direction: column;
  width: min(96vw, 1120px);
  height: min(92dvh, 900px);
  max-height: 92dvh;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-overlay);
}

.fg-ui-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
}

.fg-ui-modal-header h4 {
  margin: 0;
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--text);
}

.fg-ui-modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  font-family: inherit;
  font-size: 15px;
  line-height: 1;
  color: var(--dim);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--r);
  cursor: pointer;
}

.fg-ui-modal-close:hover {
  color: var(--text);
  background: var(--surface-3);
  border-color: var(--border);
}

.fg-ui-modal > .fg-download-ui {
  flex: 1;
  min-height: 0;
  margin: 0;
  border: 0;
  border-radius: 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.fg-ui-modal > .fg-download-ui .fg-controls,
.fg-ui-modal > .fg-download-ui .fg-file-list {
  height: 100%;
  max-height: none;
  min-height: 0;
}

.fg-ui-modal > .fg-download-ui .fg-file-list {
  overflow-y: auto;
}

/* ---------- Original links modal ---------- */


.fg-links-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(16, 24, 40, 0.62);
}

.fg-links-modal {
  display: flex;
  flex-direction: column;
  width: min(92vw, 900px);
  max-height: 80vh;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-overlay);
}

.fg-links-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
}

.fg-links-modal-header h4 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--text);
}

.fg-links-modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  color: var(--dim);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--r);
  cursor: pointer;
}

.fg-links-modal-close:hover {
  color: var(--text);
  background: var(--surface-3);
  border-color: var(--border);
}

.fg-links-modal-body {
  overflow-y: auto;
  padding: 0;
}

.fg-links-modal-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.fg-links-modal-item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 12px;
  border-bottom: 1px solid var(--border);
}

.fg-links-modal-item:last-child {
  border-bottom: 0;
}

.fg-links-modal-item:hover {
  background: var(--surface-2);
}

.fg-links-modal-index {
  font-family: var(--mono);
  font-size: var(--fs-sm);
  color: var(--faint);
  text-align: right;
}

.fg-links-modal-link {
  font-family: var(--mono);
  font-size: var(--fs-sm);
  color: var(--accent);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fg-links-modal-link:hover {
  text-decoration: underline;
}

.fg-links-modal-empty {
  margin: 0;
  padding: 24px 16px;
  font-size: var(--fs-base);
  color: var(--faint);
  text-align: center;
}

/* ---------- Floating (fuckingfast) button ---------- */

.fg-float-btn {
  position: fixed;
  top: 50%;
  right: 16px;
  transform: translateY(-50%);
  z-index: 9999;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 32px;
  padding: 0 12px;
  font-family: var(--font);
  font-size: var(--fs-base);
  font-weight: 500;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--r);
  box-shadow: var(--shadow-float);
  cursor: pointer;
}

.fg-float-btn:hover {
  background: var(--accent-soft);
  border-color: var(--accent-line);
  box-shadow: var(--shadow-overlay);
}

.fg-float-btn:active {
  background: var(--surface-3);
}

.fg-float-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

/* ---------- Responsive ---------- */

@media (max-width: 768px) {
  .fg-download-ui {
    margin: 14px 0;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'header'
      'controls'
      'list'
      'status';
  }

  .fg-controls {
    height: auto;
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }

  .fg-file-list {
    height: auto;
    max-height: 60vh;
  }

  .fg-file-list-head {
    display: none;
  }

  .fg-file-item {
    grid-template-columns: 18px minmax(0, 1fr);
    grid-template-areas:
      'check info'
      '.     size'
      '.     status'
      '.     actions';
    gap: 4px 10px;
    padding: 8px 12px;
  }

  .fg-file-checkbox { grid-area: check; }
  .fg-file-info     { grid-area: info; }
  .fg-file-size     { grid-area: size; text-align: left; }
  .fg-file-status   { grid-area: status; }
  .fg-file-actions  { grid-area: actions; justify-content: flex-start; opacity: 1; }

  .fg-resume-content {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }

  .fg-resume-actions {
    width: 100%;
  }

  .fg-resume-actions .fg-btn {
    flex: 1;
  }

  .fg-ui-modal {
    width: 100%;
    height: 100dvh;
    max-height: 100dvh;
    border: 0;
    border-radius: 0;
  }

  .fg-ui-modal-overlay {
    padding: 0;
  }

  .fg-ui-trigger-floating {
    bottom: 12px;
    right: 12px;
  }

  .fg-links-modal {
    width: 100%;
    max-height: 86vh;
  }
}`;
// <<<END:PANEL_CSS>>>

  // <<<GENERATED:ICONS_JS>>>
const ICONS_SYMBOLS = {
    download: '<path d="M12 4v11"/><path d="M7.5 10.5L12 15l4.5-4.5"/><path d="M5 20h14"/>',
    upload: '<path d="M12 20V9"/><path d="M7.5 13.5L12 9l4.5 4.5"/><path d="M5 4h14"/>',
    retry: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v4h-4"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M6 7l1 13h10l1-13"/>',
    play: '<path d="M7 4l12 8-12 8z"/>',
    pause: '<path d="M9 5v14M15 5v14"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>',
    scan: '<path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4M8 12h8"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 4v4h4"/>',
    skip: '<path d="M5 5l9 7-9 7z"/><path d="M18 5v14"/>',
    undo: '<path d="M9 14l-4-4 4-4"/><path d="M5 10h9a5 5 0 0 1 0 10h-3"/>',
    link: '<path d="M10 13a4 4 0 0 0 6 .5l2-2a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 11a4 4 0 0 0-6-.5l-2 2A4 4 0 0 0 11.7 18l1-1"/>',
    info: '<circle cx="12" cy="12" r="8"/><path d="M12 11v5M12 8h.01"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
    external: '<path d="M14 5h5v5"/><path d="M19 5l-8 8"/><path d="M18 14v5H5V6h5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    folder: '<path d="M4 7h6l2 2h8v10H4z"/>',
    package: '<path d="M12 3l8 4v10l-8 4-8-4V7z"/><path d="M4 7l8 4 8-4M12 11v10"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
    moon: '<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/>'
  };
// <<<END:ICONS_JS>>>

  /* ------------------------------------------------------------------ *
   * Configuration
   * ------------------------------------------------------------------ */

  const CONFIG = {
    WAIT_BETWEEN: 2000,
    SIZE_SCAN_GAP: 250,
    SIZE_TIMEOUT: 12000,
    THEME_KEY: 'fg_theme',
    COMPLETED_KEY: 'fg_completed',
    FAILED_KEY: 'fg_failed',
    PAGE_PREFIX: 'fg_page_',
    STATUS: {
      PENDING: 'pending',
      PROCESSING: 'processing',
      SUCCESS: 'success',
      FAILED: 'failed',
      RETRYING: 'retrying',
      SKIPPED: 'skipped'
    },
    PATTERNS: {
      WINDOW_OPEN: /window\.open\(["']([^"']+\/dl\/[^"']+)["']/,
      FILE_ID: /^[A-Za-z0-9_-]{6,}$/
    },
    SITE_ROUTES: new Set([
      'index', 'speedtest', 'help', 'privacy', 'terms', 'contact', 'login',
      'logout', 'register', 'account', 'upload', 'faq', 'about', 'api'
    ])
  };

  /* ------------------------------------------------------------------ *
   * Small utilities
   * ------------------------------------------------------------------ */

  function log(message) {
    try { GM_log('[FitGirl Downloader] ' + message); } catch (e) { /* GM_log optional */ }
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, exponent);
    return value.toFixed(value >= 10 || exponent === 0 ? 0 : 1) + ' ' + units[exponent];
  }

  function getFilenameFromUrl(url) {
    try {
      const parsed = new URL(url);
      const hash = decodeURIComponent((parsed.hash || '').replace(/^#/, '')).trim();
      if (hash) return hash;
      const segments = parsed.pathname.split('/').filter(Boolean);
      return segments[segments.length - 1] || 'unknown';
    } catch (e) {
      const match = url.match(/([^\/#?]+)(?:\?|$)/);
      return match ? match[1] : 'unknown';
    }
  }

  /* ------------------------------------------------------------------ *
   * Icons (ICONS_SYMBOLS is inlined by the build script)
   * ------------------------------------------------------------------ */

  function icon(name, sizeClass) {
    const key = Object.prototype.hasOwnProperty.call(ICONS_SYMBOLS, name) ? name : 'info';
    const cls = 'fg-icon' + (sizeClass ? ' ' + sizeClass : '');
    return '<svg class="' + cls + '" aria-hidden="true" focusable="false">' +
      '<use href="#fg-i-' + key + '"></use></svg>';
  }

  function buildSprite() {
    let markup = '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" ' +
      'focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">';
    Object.keys(ICONS_SYMBOLS).forEach(function (name) {
      markup += '<symbol id="fg-i-' + name + '" viewBox="0 0 24 24">' +
        ICONS_SYMBOLS[name] + '</symbol>';
    });
    return markup + '</svg>';
  }

  /* ------------------------------------------------------------------ *
   * Storage
   * ------------------------------------------------------------------ */

  const Storage = {
    get(key, fallback) {
      try {
        const raw = GM_getValue(key, null);
        if (raw == null) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try { GM_setValue(key, JSON.stringify(value)); }
      catch (e) { log('Could not persist ' + key + ': ' + e.message); }
    },
    pageKey() {
      return CONFIG.PAGE_PREFIX + hashString(location.href);
    },
    loadPageState() {
      const saved = this.get(this.pageKey(), null) || {};
      return {
        selections: saved.selections || {},
        skipped: saved.skipped || [],
        sizeResults: saved.sizeResults || {}
      };
    },
    savePageState(s) { this.set(this.pageKey(), s); },
    addCompleted(url) {
      const list = this.get(CONFIG.COMPLETED_KEY, []);
      if (list.indexOf(url) === -1) { list.push(url); this.set(CONFIG.COMPLETED_KEY, list); }
    },
    addFailed(url, error) {
      const list = this.get(CONFIG.FAILED_KEY, []);
      const idx = list.findIndex(function (entry) { return entry.url === url; });
      const record = { url: url, error: error, timestamp: Date.now() };
      if (idx === -1) list.push(record); else list[idx] = record;
      this.set(CONFIG.FAILED_KEY, list);
    },
    removeFailed(url) {
      const list = this.get(CONFIG.FAILED_KEY, []);
      this.set(CONFIG.FAILED_KEY, list.filter(function (entry) { return entry.url !== url; }));
    }
  };

  /* ------------------------------------------------------------------ *
   * fuckingfast.co resolution
   * ------------------------------------------------------------------ */

  const FuckingFast = {
    deriveFileId(url) {
      try {
        const parsed = new URL(url);
        const host = parsed.hostname;
        if (host !== 'fuckingfast.co' && !host.endsWith('.fuckingfast.co')) return null;
        if (host.startsWith('dl.')) return null;
        const segments = parsed.pathname.split('/').filter(Boolean);
        if (segments.length !== 1) return null;
        const id = segments[0];
        if (CONFIG.SITE_ROUTES.has(id.toLowerCase())) return null;
        return CONFIG.PATTERNS.FILE_ID.test(id) ? id : null;
      } catch (e) { return null; }
    },

    urlPatternFallback(url) {
      const id = this.deriveFileId(url);
      return id ? 'https://fuckingfast.co/f/' + id + '/dl' : null;
    },

    postGo(url) {
      const self = this;
      const fileId = this.deriveFileId(url);
      if (!fileId) return Promise.resolve(null);

      return new Promise(function (resolve) {
        GM_xmlhttpRequest({
          method: 'POST',
          url: 'https://fuckingfast.co/f/' + fileId + '/go',
          data: '',
          timeout: CONFIG.SIZE_TIMEOUT,
          headers: {
            'Accept': '*/*',
            'Content-Type': 'application/x-www-form-urlencoded',
            'HX-Request': 'true',
            'HX-Current-URL': url,
            'HX-Target': 'body'
          },
          onload: function (response) {
            const headers = self.parseHeaders(response.responseHeaders);
            const redirect = headers['hx-redirect'] || headers['location'];
            resolve(redirect ? redirect.trim() : null);
          },
          onerror: function () { resolve(null); },
          ontimeout: function () { resolve(null); }
        });
      });
    },

    parseHeaders(raw) {
      const headers = {};
      if (!raw) return headers;
      raw.trim().split(/[\r\n]+/).forEach(function (line) {
        const idx = line.indexOf(':');
        if (idx === -1) return;
        headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
      });
      return headers;
    },

    fetchPageHtml(url) {
      return new Promise(function (resolve) {
        GM_xmlhttpRequest({
          method: 'GET',
          url: url,
          timeout: CONFIG.SIZE_TIMEOUT,
          onload: function (response) {
            resolve(response.status >= 200 && response.status < 300 ? response.responseText : null);
          },
          onerror: function () { resolve(null); },
          ontimeout: function () { resolve(null); }
        });
      });
    },

    async parseSize(url) {
      const html = await this.fetchPageHtml(url);
      if (!html) return null;
      const match = html.match(/Size\s*:\s*([0-9]+(?:[\.,][0-9]+)?)\s*([KMGT]?B)/i);
      if (!match) return null;
      const numeric = parseFloat(String(match[1]).replace(',', '.'));
      const multipliers = { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 };
      const unit = String(match[2]).toUpperCase();
      if (!multipliers[unit] || !Number.isFinite(numeric)) return null;
      return { status: 'known', bytes: Math.floor(numeric * multipliers[unit]) };
    },

    async resolveDownloadUrl(url) {
      const fromGo = await this.postGo(url);
      if (fromGo) return fromGo;

      const html = await this.fetchPageHtml(url);
      if (html) {
        const legacy = html.match(CONFIG.PATTERNS.WINDOW_OPEN);
        if (legacy && legacy[1]) return legacy[1];
      }

      return this.urlPatternFallback(url);
    }
  };

  /* ------------------------------------------------------------------ *
   * Delivery, theme
   * ------------------------------------------------------------------ */

  const Delivery = {
    handOff(url) {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
  };

  const Theme = {
    hosts: [],
    preference: 'auto',
    attach(host) { this.hosts.push(host); this.apply(this.preference); },
    system() {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },
    effective() { return this.preference === 'auto' ? this.system() : this.preference; },
    apply(mode) {
      const resolved = mode === 'auto' ? this.system() : mode;
      this.hosts.forEach(function (host) { host.setAttribute('data-fg-theme', resolved); });
    },
    set(mode) { this.preference = mode; Storage.set(CONFIG.THEME_KEY, mode); this.apply(mode); },
    toggle() { this.set(this.effective() === 'dark' ? 'light' : 'dark'); },
    init() {
      const saved = Storage.get(CONFIG.THEME_KEY, 'auto');
      this.preference = saved === 'light' || saved === 'dark' ? saved : 'auto';
      const self = this;
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
        if (self.preference === 'auto') self.apply('auto');
      });
    }
  };

  /* ------------------------------------------------------------------ *
   * State
   * ------------------------------------------------------------------ */

  const state = {
    files: [],
    page: { selections: {}, skipped: [], sizeResults: {} },
    isDownloading: false,
    shouldStop: false,
    scanHandle: null,
    elements: {}
  };

  function currentUrl() { return location.href; }
  function isFitGirlPage() { return location.hostname.indexOf('fitgirl-repacks.site') !== -1; }
  function isFuckingFastPage() { return location.hostname.indexOf('fuckingfast.co') !== -1; }

  /* ------------------------------------------------------------------ *
   * Rendering helpers
   * ------------------------------------------------------------------ */

  const TAG_CLASS = {
    pending: 'fg-tag-pending',
    processing: 'fg-tag-proc',
    retrying: 'fg-tag-proc',
    success: 'fg-tag-ok',
    failed: 'fg-tag-err',
    skipped: 'fg-tag-skip'
  };

  const STATUS_LABEL = {
    pending: 'Pending',
    processing: 'Processing',
    retrying: 'Retrying',
    success: 'Success',
    failed: 'Failed',
    skipped: 'Skipped'
  };

  function statusTag(status, errorMessage) {
    const cls = TAG_CLASS[status] || 'fg-tag-skip';
    const spinner = (status === 'processing' || status === 'retrying') ? '<i class="fg-spinner"></i>' : '';
    const title = errorMessage ? ' title="' + escapeHtml(errorMessage) + '"' : '';
    return '<span class="fg-tag ' + cls + '"' + title + '>' + spinner +
      (STATUS_LABEL[status] || 'Unknown') + '</span>';
  }

  function sizeLabel(result) {
    if (!result) return 'Not calculated';
    if (result.status === 'known' && Number.isFinite(result.bytes)) return formatBytes(result.bytes);
    if (result.status === 'unknown') return 'Unknown';
    return 'Calculating...';
  }

  function sizeClass(result) {
    if (!result) return '';
    if (result.status === 'known' && Number.isFinite(result.bytes)) return ' is-known';
    return ' is-unknown';
  }

  function rowActions(skipped) {
    if (skipped) {
      return '<button class="fg-btn fg-btn-xs fg-undo-skip">' +
        icon('undo', 'fg-icon-sm') + ' Undo</button>';
    }
    return '<button class="fg-btn fg-btn-xs fg-download-file">' +
        icon('download', 'fg-icon-sm') + ' Download</button>' +
      '<button class="fg-btn fg-btn-xs fg-skip-file">' +
        icon('skip', 'fg-icon-sm') + ' Skip</button>';
  }

  /* ------------------------------------------------------------------ *
   * Dialog
   * ------------------------------------------------------------------ */

  function confirmDialog(options) {
    const root = state.elements.panelRoot;
    if (!root) return Promise.resolve(window.confirm(options.message || 'Are you sure?'));

    return new Promise(function (resolve) {
      let settled = false;
      const overlay = document.createElement('div');
      overlay.className = 'fg-dialog-overlay';

      const dialog = document.createElement('div');
      dialog.className = 'fg-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');

      const header = document.createElement('div');
      header.className = 'fg-dialog-header';
      header.textContent = options.title || 'Confirm';

      const body = document.createElement('div');
      body.className = 'fg-dialog-body';
      body.textContent = options.message || '';

      const actions = document.createElement('div');
      actions.className = 'fg-dialog-actions';

      const confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = 'fg-dialog-btn ' +
        (options.danger ? 'fg-dialog-btn-danger' : 'fg-dialog-btn-primary');
      confirmBtn.textContent = options.confirmLabel || 'Confirm';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'fg-dialog-btn';
      cancelBtn.textContent = options.cancelLabel || 'Cancel';

      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);
      dialog.appendChild(header);
      if (options.message) dialog.appendChild(body);
      dialog.appendChild(actions);
      overlay.appendChild(dialog);

      function cleanup(result) {
        if (settled) return;
        settled = true;
        overlay.remove();
        resolve(result);
      }

      cancelBtn.addEventListener('click', function () { cleanup(false); });
      confirmBtn.addEventListener('click', function () { cleanup(true); });
      overlay.addEventListener('click', function (event) {
        if (event.target === overlay) cleanup(false);
      });

      root.appendChild(overlay);
      cancelBtn.focus();
    });
  }

  /* ------------------------------------------------------------------ *
   * File list
   * ------------------------------------------------------------------ */

  /**
   * Collect download links from the page. FitGirl paste pages render the URL
   * list as plain text inside a <pre> or <textarea>, not as anchors, so an
   * anchor-only scan finds nothing there. Try anchors first, then the text
   * bodies, then the whole document as a last resort.
   */
  function getAllDownloadLinks() {
    const seen = new Set();
    const links = [];
    const urlPattern = /https?:\/\/(?:[a-z0-9]+\.)?fuckingfast\.co\/[A-Za-z0-9_-]+(?:#[^\s"'<>]+)?/gi;

    function addUrl(url, text) {
      if (!url) return;
      const clean = url.replace(/["'<>]+$/, '');
      if (clean.indexOf('optional') !== -1 || seen.has(clean)) return;
      seen.add(clean);
      links.push({ url: clean, text: text || getFilenameFromUrl(clean) });
    }

    document.querySelectorAll('a[href*="fuckingfast.co"]').forEach(function (anchor) {
      addUrl(anchor.href, (anchor.textContent || '').trim());
    });

    document.querySelectorAll('pre, textarea, code').forEach(function (node) {
      const text = node.value || node.textContent || '';
      let match;
      urlPattern.lastIndex = 0;
      while ((match = urlPattern.exec(text)) !== null) {
        addUrl(match[0]);
      }
    });

    if (links.length === 0) {
      const text = document.body ? (document.body.textContent || '') : '';
      let match;
      urlPattern.lastIndex = 0;
      while ((match = urlPattern.exec(text)) !== null) {
        addUrl(match[0]);
      }
    }

    return links;
  }

  function findFile(url) {
    return state.files.find(function (item) { return item.url === url; });
  }

  function renderFileList() {
    const list = state.elements.fileList;
    if (!list) return;

    const links = getAllDownloadLinks();
    state.files = [];
    list.innerHTML = '';

    const head = document.createElement('div');
    head.className = 'fg-file-list-head';
    head.innerHTML = '<span></span><span>Name</span>' +
      '<span style="text-align:right">Size</span><span>Status</span><span></span>';
    list.appendChild(head);

    links.forEach(function (link, index) {
      const skipped = state.page.skipped.indexOf(link.url) !== -1;
      const selected = state.page.selections[link.url] !== false;
      const sizeResult = state.page.sizeResults[link.url] || null;
      const status = skipped ? CONFIG.STATUS.SKIPPED : CONFIG.STATUS.PENDING;

      const item = document.createElement('div');
      item.className = 'fg-file-item' + (skipped ? ' fg-file-skipped' : '');
      item.dataset.url = link.url;
      item.dataset.index = String(index);

      item.innerHTML =
        '<div class="fg-file-checkbox">' +
          '<input type="checkbox" class="fg-checkbox"' +
            (selected ? ' checked' : '') + (skipped ? ' disabled' : '') + '>' +
        '</div>' +
        '<div class="fg-file-info">' +
          '<div class="fg-file-name">' + escapeHtml(getFilenameFromUrl(link.url)) + '</div>' +
          '<div class="fg-file-url">' + escapeHtml(link.url) + '</div>' +
        '</div>' +
        '<div class="fg-file-size' + sizeClass(sizeResult) + '" data-size-url="' +
          escapeHtml(link.url) + '">' + sizeLabel(sizeResult) + '</div>' +
        '<div class="fg-file-status">' + statusTag(status) + '</div>' +
        '<div class="fg-file-actions">' + rowActions(skipped) + '</div>';

      list.appendChild(item);
      state.files.push({
        url: link.url,
        text: link.text,
        element: item,
        isSkipped: skipped,
        status: status
      });
    });

    bindListEvents();
    updateCounter();
    updateToggleButton();
    renderPackageSummary();
    filterFiles(state.elements.searchInput ? state.elements.searchInput.value : '');
  }

  function bindListEvents() {
    const list = state.elements.fileList;
    if (!list || list.dataset.bound === 'true') return;
    list.dataset.bound = 'true';

    list.addEventListener('change', function (event) {
      if (!event.target.classList.contains('fg-checkbox')) return;
      persistSelections();
      updateCounter();
      updateToggleButton();
    });

    list.addEventListener('click', function (event) {
      const button = event.target.closest('button');
      const item = event.target.closest('.fg-file-item');
      if (!item) return;
      const url = item.dataset.url;

      if (button) {
        event.stopPropagation();
        if (button.classList.contains('fg-download-file')) downloadSingle(url);
        else if (button.classList.contains('fg-skip-file')) skipFile(url);
        else if (button.classList.contains('fg-undo-skip')) undoSkip(url);
        else if (button.classList.contains('fg-retry-file')) downloadSingle(url);
        return;
      }

      if (event.target.classList.contains('fg-checkbox')) return;

      const checkbox = item.querySelector('.fg-checkbox');
      if (checkbox && !checkbox.disabled) {
        checkbox.checked = !checkbox.checked;
        persistSelections();
        updateCounter();
        updateToggleButton();
      }
    });
  }

  function persistSelections() {
    const selections = {};
    state.files.forEach(function (file) {
      const cb = file.element.querySelector('.fg-checkbox');
      if (cb) selections[file.url] = cb.checked;
    });
    state.page.selections = selections;
    Storage.savePageState(state.page);
  }

  function persistSkipped() {
    state.page.skipped = state.files
      .filter(function (file) { return file.isSkipped; })
      .map(function (file) { return file.url; });
    Storage.savePageState(state.page);
  }

  function updateCounter() {
    const text = state.elements.counterText;
    if (!text) return;
    const selected = state.files.filter(function (file) {
      const cb = file.element.querySelector('.fg-checkbox');
      return !file.isSkipped && cb && cb.checked;
    }).length;
    const skipped = state.files.filter(function (file) { return file.isSkipped; }).length;
    text.textContent = selected + ' of ' + state.files.length +
      ' files selected (' + skipped + ' skipped)';
  }

  function updateToggleButton() {
    const checkbox = state.elements.toggleSelectCheckbox;
    const label = state.elements.toggleSelectText;
    if (!checkbox) return;

    const enabled = state.files.filter(function (file) {
      const cb = file.element.querySelector('.fg-checkbox');
      return cb && !cb.disabled;
    });
    const checked = enabled.filter(function (file) {
      return file.element.querySelector('.fg-checkbox').checked;
    });

    checkbox.disabled = enabled.length === 0;
    checkbox.checked = enabled.length > 0 && checked.length === enabled.length;
    checkbox.indeterminate = checked.length > 0 && checked.length < enabled.length;
    if (label) label.textContent = checked.length > 0 ? 'Deselect all' : 'Select all';
  }

  function filterFiles(rawQuery) {
    const query = (rawQuery || '').trim().toLowerCase();
    state.files.forEach(function (file) {
      const haystack = (getFilenameFromUrl(file.url) + ' ' + file.url).toLowerCase();
      file.element.style.display = !query || haystack.indexOf(query) !== -1 ? '' : 'none';
    });
  }

  function derivePackageName(url) {
    const filename = decodeURIComponent(getFilenameFromUrl(url)).trim();
    const noExt = filename.replace(/\.[a-z0-9]{2,5}$/i, '');
    const compact = noExt
      .replace(/[_.\-]+/g, ' ')
      .replace(/\b(part|pt|disk|disc|cd|dvd)\s*0*\d+\b/gi, '')
      .replace(/\b0*\d{1,3}\b$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return compact || noExt || filename;
  }

  function renderPackageSummary() {
    const container = state.elements.packageSummary;
    if (!container) return;

    const groups = new Map();
    state.files.forEach(function (file) {
      const name = derivePackageName(file.url);
      if (!groups.has(name)) {
        groups.set(name, { name: name, totalBytes: 0, fileCount: 0, knownCount: 0 });
      }
      const group = groups.get(name);
      const result = state.page.sizeResults[file.url];
      group.fileCount += 1;
      if (result && result.status === 'known' && Number.isFinite(result.bytes)) {
        group.knownCount += 1;
        group.totalBytes += result.bytes;
      }
    });

    if (groups.size === 0) { container.innerHTML = ''; return; }

    const rows = Array.from(groups.values())
      .sort(function (a, b) { return b.totalBytes - a.totalBytes; })
      .slice(0, 10)
      .map(function (group) {
        const total = group.knownCount > 0 ? formatBytes(group.totalBytes) : 'Unknown';
        return '<li><span class="fg-package-name">' + escapeHtml(group.name) + '</span>' +
          '<span class="fg-package-size">' + total + '</span>' +
          '<span class="fg-package-meta">' + group.knownCount + '/' + group.fileCount +
          ' known</span></li>';
      })
      .join('');

    container.innerHTML = '<div class="fg-package-summary-title">Package totals</div>' +
      '<ul class="fg-package-summary-list">' + rows + '</ul>';
  }

  /* ------------------------------------------------------------------ *
   * Status + row updates
   * ------------------------------------------------------------------ */

  function setFileStatus(url, status, errorMessage) {
    const file = findFile(url);
    if (!file) return;

    file.status = status;
    file.element.dataset.status = status;

    const statusCell = file.element.querySelector('.fg-file-status');
    const actionsCell = file.element.querySelector('.fg-file-actions');
    if (!statusCell || !actionsCell) return;

    statusCell.innerHTML = statusTag(status, errorMessage);
    actionsCell.innerHTML = '';
    actionsCell.classList.remove('always');

    if (status === CONFIG.STATUS.FAILED || status === CONFIG.STATUS.SUCCESS) {
      const retry = document.createElement('button');
      retry.className = 'fg-btn fg-btn-xs fg-retry-file';
      retry.innerHTML = icon('retry', 'fg-icon-sm') + ' Retry';
      actionsCell.appendChild(retry);
      actionsCell.classList.add('always');
    }
  }

  /* ------------------------------------------------------------------ *
   * Selection
   * ------------------------------------------------------------------ */

  function skipFile(url) {
    const file = findFile(url);
    if (!file) return;
    file.isSkipped = true;
    file.element.classList.add('fg-file-skipped');

    const cb = file.element.querySelector('.fg-checkbox');
    if (cb) { cb.disabled = true; cb.checked = false; }

    file.element.querySelector('.fg-file-status').innerHTML = statusTag('skipped');
    file.element.querySelector('.fg-file-actions').innerHTML = rowActions(true);

    persistSkipped();
    updateCounter();
    updateToggleButton();
  }

  function undoSkip(url) {
    const file = findFile(url);
    if (!file) return;
    file.isSkipped = false;
    file.element.classList.remove('fg-file-skipped');

    const cb = file.element.querySelector('.fg-checkbox');
    if (cb) { cb.disabled = false; cb.checked = true; }

    file.element.querySelector('.fg-file-status').innerHTML = statusTag('pending');
    file.element.querySelector('.fg-file-actions').innerHTML = rowActions(false);

    persistSkipped();
    persistSelections();
    updateCounter();
    updateToggleButton();
  }

  function selectAll(checked) {
    state.files.forEach(function (file) {
      const cb = file.element.querySelector('.fg-checkbox');
      if (cb && !cb.disabled) cb.checked = checked;
    });
    persistSelections();
    updateCounter();
    updateToggleButton();
  }

  function resetSelection() {
    state.page.selections = {};
    Storage.savePageState(state.page);
    state.files.forEach(function (file) {
      const cb = file.element.querySelector('.fg-checkbox');
      if (cb && !cb.disabled) cb.checked = true;
    });
    updateCounter();
    updateToggleButton();
    setStatus('Selections reset');
  }

  /* ------------------------------------------------------------------ *
   * Downloads
   * ------------------------------------------------------------------ */

  function selectedFiles() {
    return state.files.filter(function (file) {
      const cb = file.element.querySelector('.fg-checkbox');
      return !file.isSkipped && cb && cb.checked;
    });
  }

  async function downloadSingle(url) {
    const file = findFile(url);
    if (!file || state.isDownloading) return;

    state.isDownloading = true;
    setFileStatus(url, CONFIG.STATUS.PROCESSING);
    setStatus('Resolving ' + getFilenameFromUrl(url) + '...');

    try {
      const resolved = url.indexOf('/dl/') !== -1 ? url : await FuckingFast.resolveDownloadUrl(url);
      if (!resolved) throw new Error('Could not resolve a download URL');
      Delivery.handOff(resolved);
      setFileStatus(url, CONFIG.STATUS.SUCCESS);
      Storage.addCompleted(url);
      Storage.removeFailed(url);
      setStatus('Handed off ' + getFilenameFromUrl(url));
    } catch (error) {
      setFileStatus(url, CONFIG.STATUS.FAILED, error.message);
      Storage.addFailed(url, error.message);
      setStatus('Failed: ' + error.message);
    } finally {
      state.isDownloading = false;
    }
  }

  async function startDownload() {
    if (state.isDownloading) return;
    const files = selectedFiles();
    if (files.length === 0) {
      setStatus('No files selected');
      notify('FitGirl Downloader', 'No files selected');
      return;
    }

    state.isDownloading = true;
    state.shouldStop = false;
    toggleRunControls(true);

    let success = 0;
    let failures = 0;

    for (let i = 0; i < files.length; i++) {
      if (state.shouldStop) { setStatus('Stopped after ' + i + ' of ' + files.length + ' files'); break; }
      const file = files[i];
      setFileStatus(file.url, CONFIG.STATUS.PROCESSING);
      setStatus('[' + (i + 1) + '/' + files.length + '] ' + getFilenameFromUrl(file.url));

      try {
        const resolved = file.url.indexOf('/dl/') !== -1
          ? file.url
          : await FuckingFast.resolveDownloadUrl(file.url);
        if (!resolved) throw new Error('Could not resolve a download URL');
        Delivery.handOff(resolved);
        setFileStatus(file.url, CONFIG.STATUS.SUCCESS);
        Storage.addCompleted(file.url);
        Storage.removeFailed(file.url);
        success++;
      } catch (error) {
        setFileStatus(file.url, CONFIG.STATUS.FAILED, error.message);
        Storage.addFailed(file.url, error.message);
        failures++;
      }

      if (i < files.length - 1 && !state.shouldStop) await delay(CONFIG.WAIT_BETWEEN);
    }

    state.isDownloading = false;
    toggleRunControls(false);

    const stopped = state.shouldStop;
    state.shouldStop = false;

    if (stopped) setStatus('Stopped: ' + success + ' handed off, ' + failures + ' failed');
    else {
      setStatus('Complete: ' + success + ' handed off, ' + failures + ' failed');
      notify('Download complete', success + ' handed off, ' + failures + ' failed');
    }
  }

  function stopDownload() {
    if (!state.isDownloading) return;
    state.shouldStop = true;
    setStatus('Stopping after the current file...');
  }

  function toggleRunControls(running) {
    const start = state.elements.startBtn;
    const stop = state.elements.stopBtn;
    if (start) {
      start.classList.toggle('fg-hidden', running);
      start.disabled = running;
    }
    if (stop) {
      stop.classList.toggle('fg-hidden', !running);
      stop.disabled = false;
      stop.innerHTML = icon('stop', 'fg-icon-sm') + ' Stop';
    }
  }

  /* ------------------------------------------------------------------ *
   * Size scan
   * ------------------------------------------------------------------ */

  async function calculateSizes() {
    if (state.scanHandle) return;

    const targets = state.files.filter(function (file) {
      const result = state.page.sizeResults[file.url];
      return !(result && result.status === 'known' && Number.isFinite(result.bytes));
    });

    if (targets.length === 0) {
      setSizeProgress('All files already have known sizes');
      setStatus('All files already have known sizes');
      return;
    }

    state.scanHandle = { cancelled: false };
    setScanControls(true);
    setSizeProgress('Calculating size for ' + targets.length + ' file(s)...');

    let processed = 0;
    for (let i = 0; i < targets.length; i++) {
      if (state.scanHandle.cancelled) break;
      const file = targets[i];
      try {
        const result = await FuckingFast.parseSize(file.url);
        state.page.sizeResults[file.url] = result || { status: 'unknown' };
      } catch (e) {
        state.page.sizeResults[file.url] = { status: 'unknown' };
      }
      processed++;
      applySizeResult(file.url);
      setSizeProgress('Size scan: ' + processed + '/' + targets.length +
        ' (' + Math.round((processed / targets.length) * 100) + '%)');
      if (i < targets.length - 1) await delay(CONFIG.SIZE_SCAN_GAP);
    }

    const cancelled = state.scanHandle.cancelled;
    state.scanHandle = null;
    setScanControls(false);
    Storage.savePageState(state.page);
    renderPackageSummary();

    setSizeProgress(cancelled ? 'Size scan cancelled' : 'Size scan completed');
    setStatus(cancelled ? 'Size scan cancelled' : 'Size scan completed');
  }

  function cancelSizeScan() {
    if (!state.scanHandle) return;
    state.scanHandle.cancelled = true;
    setSizeProgress('Cancelling...');
  }

  function applySizeResult(url) {
    const result = state.page.sizeResults[url] || null;
    const node = state.elements.fileList.querySelector(
      '.fg-file-size[data-size-url="' + CSS.escape(url) + '"]'
    );
    if (!node) return;
    node.textContent = sizeLabel(result);
    node.classList.toggle('is-known', !!(result && result.status === 'known'));
    node.classList.toggle('is-unknown', !(result && result.status === 'known'));
  }

  function setScanControls(scanning) {
    const calc = state.elements.calcSizesBtn;
    const cancel = state.elements.cancelSizesBtn;
    if (calc) {
      calc.disabled = scanning;
      calc.innerHTML = icon('scan', 'fg-icon-sm') +
        (scanning ? ' Calculating...' : ' Calculate sizes');
    }
    if (cancel) {
      cancel.classList.toggle('fg-hidden', !scanning);
      cancel.disabled = false;
    }
  }

  function setSizeProgress(message) {
    if (state.elements.sizeProgressText) state.elements.sizeProgressText.textContent = message;
  }

  /* ------------------------------------------------------------------ *
   * Clear
   * ------------------------------------------------------------------ */

  async function clearPageState() {
    const confirmed = await confirmDialog({
      title: 'Clear page state',
      message: 'This removes the saved selections, skips, size results and this page\u2019s download history entries. This cannot be undone.',
      confirmLabel: 'Clear',
      cancelLabel: 'Cancel',
      danger: true
    });
    if (!confirmed) return;

    const pageUrls = new Set(state.files.map(function (file) { return file.url; }));
    Storage.set(Storage.pageKey(), null);
    Storage.set(CONFIG.COMPLETED_KEY,
      Storage.get(CONFIG.COMPLETED_KEY, []).filter(function (url) { return !pageUrls.has(url); }));
    Storage.set(CONFIG.FAILED_KEY,
      Storage.get(CONFIG.FAILED_KEY, []).filter(function (entry) { return !pageUrls.has(entry.url); }));

    state.page = { selections: {}, skipped: [], sizeResults: {} };
    renderFileList();
    setSizeProgress('Size scan idle');
    setStatus('Page state cleared');
  }

  /* ------------------------------------------------------------------ *
   * Panel markup + wiring
   * ------------------------------------------------------------------ */

  function setStatus(message) {
    if (state.elements.statusText) state.elements.statusText.textContent = message;
  }

  function notify(title, message) {
    try { GM_notification({ title: title, text: message, timeout: 4000 }); }
    catch (e) { log(title + ': ' + message); }
  }

  function panelMarkup() {
    return '' +
      '<div class="fg-header">' +
        '<h3 class="fg-title">FitGirl Downloader</h3>' +
        '<div class="fg-header-actions">' +
          '<button class="fg-theme-toggle" type="button" aria-label="Toggle theme"></button>' +
          '<button class="fg-btn fg-btn-secondary fg-toggle-links">' +
            icon('close', 'fg-icon-sm') + ' Close downloader</button>' +
        '</div>' +
      '</div>' +
      '<div class="fg-controls">' +
        '<div class="fg-search-row">' +
          '<input type="search" class="fg-file-search-input" placeholder="Search files...">' +
        '</div>' +
        '<div class="fg-control-group">' +
          '<button class="fg-btn fg-btn-primary fg-start-btn">' +
            icon('download', 'fg-icon-sm') + ' Start download</button>' +
          '<button class="fg-btn fg-btn-danger fg-stop-btn fg-hidden">' +
            icon('stop', 'fg-icon-sm') + ' Stop</button>' +
          '<label class="fg-btn fg-btn-sm fg-toggle-select-control">' +
            '<input type="checkbox" class="fg-toggle-select-checkbox">' +
            '<span class="fg-toggle-select-text">Select all</span></label>' +
          '<button class="fg-btn fg-btn-sm fg-btn-secondary fg-calc-sizes-btn">' +
            icon('scan', 'fg-icon-sm') + ' Calculate sizes</button>' +
          '<button class="fg-btn fg-btn-sm fg-btn-danger fg-cancel-sizes-btn fg-hidden">' +
            icon('close', 'fg-icon-sm') + ' Cancel scan</button>' +
          '<button class="fg-btn fg-btn-sm fg-reset-selection">' +
            icon('reset', 'fg-icon-sm') + ' Reset</button>' +
          '<button class="fg-btn fg-btn-sm fg-btn-danger fg-clear-page">' +
            icon('trash', 'fg-icon-sm') + ' Clear</button>' +
        '</div>' +
        '<div class="fg-counter"><span class="fg-counter-text"></span></div>' +
        '<div class="fg-size-progress"><span class="fg-size-progress-text">Size scan idle</span></div>' +
        '<div class="fg-package-summary"></div>' +
      '</div>' +
      '<div class="fg-file-list"></div>' +
      '<div class="fg-status-panel"><div class="fg-status-text">Ready to download</div></div>';
  }

  // Build the stylesheet once and share it across every shadow root.
  //
  // An inline <style> element is refused by pages whose Content-Security-Policy
  // sets style-src without 'unsafe-inline' - which is exactly what FitGirl and
  // the paste site do. A constructable stylesheet is created through the CSS
  // Object Model instead of being parsed as an inline resource, so it is not
  // blocked. The <style> fallback keeps older browsers working.
  const SHARED_SHEETS = (function () {
    const css = TOKENS_CSS + '\n' + PANEL_CSS;
    try {
      if (typeof CSSStyleSheet === 'function' && 'replaceSync' in CSSStyleSheet.prototype) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        return [sheet];
      }
    } catch (e) {
      log('Constructable stylesheet unavailable: ' + e.message);
    }
    return null;
  })();

  function attachStyles(shadowRoot) {
    const sprite = document.createElement('div');
    sprite.innerHTML = buildSprite();
    shadowRoot.appendChild(sprite);

    if (SHARED_SHEETS) {
      try {
        shadowRoot.adoptedStyleSheets = SHARED_SHEETS;
        return;
      } catch (e) {
        log('adoptedStyleSheets assignment failed: ' + e.message);
      }
    }

    const style = document.createElement('style');
    style.textContent = TOKENS_CSS + '\n' + PANEL_CSS;
    shadowRoot.appendChild(style);
  }

  function renderThemeToggle() {
    const button = state.elements.themeToggle;
    if (!button) return;
    const next = Theme.effective() === 'dark' ? 'light' : 'dark';
    button.innerHTML = icon(next === 'dark' ? 'moon' : 'sun');
    button.setAttribute('aria-label', 'Switch to ' + next + ' theme');
    button.title = 'Switch to ' + next + ' theme';
  }

  function wirePanel() {
    const el = state.elements;
    el.startBtn.addEventListener('click', startDownload);
    el.stopBtn.addEventListener('click', stopDownload);
    el.calcSizesBtn.addEventListener('click', calculateSizes);
    el.cancelSizesBtn.addEventListener('click', cancelSizeScan);
    el.resetBtn.addEventListener('click', resetSelection);
    el.clearBtn.addEventListener('click', clearPageState);
    el.toggleSelectCheckbox.addEventListener('change', function (event) {
      selectAll(event.target.checked);
    });
    el.searchInput.addEventListener('input', function (event) { filterFiles(event.target.value); });
    el.toggleLinksBtn.addEventListener('click', closeModal);
    el.themeToggle.addEventListener('click', function () {
      Theme.toggle();
      renderThemeToggle();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && el.overlay.classList.contains('is-open')) closeModal();
    });
  }

  function mountPanel() {
    const host = document.createElement('div');
    host.id = 'fg-userscript-host';
    const root = host.attachShadow({ mode: 'open' });
    attachStyles(root);

    const overlay = document.createElement('div');
    overlay.className = 'fg-ui-modal-overlay';
    const modal = document.createElement('div');
    modal.className = 'fg-ui-modal';

    const panel = document.createElement('div');
    panel.className = 'fg-download-ui';
    panel.innerHTML = panelMarkup();

    modal.appendChild(panel);
    overlay.appendChild(modal);
    root.appendChild(overlay);
    document.body.appendChild(host);

    Theme.attach(host);

    state.elements.panelRoot = root;
    state.elements.overlay = overlay;
    state.elements.panel = panel;
    state.elements.fileList = panel.querySelector('.fg-file-list');
    state.elements.startBtn = panel.querySelector('.fg-start-btn');
    state.elements.stopBtn = panel.querySelector('.fg-stop-btn');
    state.elements.calcSizesBtn = panel.querySelector('.fg-calc-sizes-btn');
    state.elements.cancelSizesBtn = panel.querySelector('.fg-cancel-sizes-btn');
    state.elements.resetBtn = panel.querySelector('.fg-reset-selection');
    state.elements.clearBtn = panel.querySelector('.fg-clear-page');
    state.elements.toggleSelectCheckbox = panel.querySelector('.fg-toggle-select-checkbox');
    state.elements.toggleSelectText = panel.querySelector('.fg-toggle-select-text');
    state.elements.searchInput = panel.querySelector('.fg-file-search-input');
    state.elements.counterText = panel.querySelector('.fg-counter-text');
    state.elements.sizeProgressText = panel.querySelector('.fg-size-progress-text');
    state.elements.packageSummary = panel.querySelector('.fg-package-summary');
    state.elements.statusText = panel.querySelector('.fg-status-text');
    state.elements.toggleLinksBtn = panel.querySelector('.fg-toggle-links');
    state.elements.themeToggle = panel.querySelector('.fg-theme-toggle');

    wirePanel();
    renderThemeToggle();
  }

  function mountTrigger() {
    if (state.elements.triggerHost) {
      placeTrigger(state.elements.triggerHost);
      return;
    }

    const host = document.createElement('span');
    host.id = 'fg-userscript-trigger';
    host.style.display = 'inline-block';
    const root = host.attachShadow({ mode: 'open' });
    attachStyles(root);
    Theme.attach(host);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fg-ui-trigger-btn';
    button.innerHTML = icon('download', 'fg-icon-sm') + ' Open downloader';
    button.addEventListener('click', openModal);
    root.appendChild(button);

    state.elements.triggerHost = host;
    placeTrigger(host);
  }

  /**
   * Choose where the trigger lives. Called again whenever links are found so
   * a first pass that ran before the page finished rendering (and therefore
   * landed on the fixed fallback) gets upgraded to the inline position.
   */
  function placeTrigger(host) {
    // Reset anything a previous placement set.
    host.classList.remove('fg-ui-trigger-inline');
    host.style.position = '';
    host.style.top = '';
    host.style.left = '';
    host.style.bottom = '';
    host.style.right = '';
    host.style.transform = '';
    host.style.zIndex = '';

    if (host.parentElement) host.parentElement.removeChild(host);

    host.classList.add('fg-ui-trigger-inline');

    // 1. The id the game pages use.
    let heading = document.querySelector('h2#downloadlinks') ||
      document.querySelector('#downloadlinks');

    // 2. Paste pages use a plain "Download links" heading with no id, so fall
    //    back to a heading whose text contains "download" and "link".
    if (!heading) {
      const candidates = document.querySelectorAll('h1, h2, h3, h4');
      for (let i = 0; i < candidates.length; i++) {
        const text = (candidates[i].textContent || '').toLowerCase();
        if (text.indexOf('download') !== -1 && text.indexOf('link') !== -1) {
          heading = candidates[i];
          break;
        }
      }
    }

    if (heading) {
      heading.appendChild(host);
      return;
    }

    // 3. Any container that holds the link list.
    const firstLink = document.querySelector('a[href*="fuckingfast.co"]');
    const container = firstLink && firstLink.closest('article, section, div');
    if (container) {
      container.insertBefore(host, container.firstChild);
      return;
    }

    // 4. Last resort: centre a fixed button on screen so it is impossible to
    //    miss. The shadow host sits outside the shadow root, so this
    //    positioning must be inline - shadow CSS cannot style the host.
    host.classList.remove('fg-ui-trigger-inline');
    host.style.position = 'fixed';
    host.style.top = '50%';
    host.style.left = '50%';
    host.style.transform = 'translate(-50%, -50%)';
    host.style.zIndex = '2147483646';
    document.body.appendChild(host);
  }

  function openModal() {
    const overlay = state.elements.overlay;
    if (!overlay) return;
    renderFileList();
    overlay.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';

    // The trigger lives outside the overlay's stacking context, so without
    // this it would stay visible on top of the open modal.
    if (state.elements.triggerHost) {
      state.elements.triggerHost.style.display = 'none';
    }
  }

  function closeModal() {
    const overlay = state.elements.overlay;
    if (!overlay) return;
    overlay.classList.remove('is-open');
    document.documentElement.style.overflow = '';

    if (state.elements.triggerHost) {
      state.elements.triggerHost.style.display = '';
    }
  }

  /* ------------------------------------------------------------------ *
   * Floating button on fuckingfast.co /dl/ pages
   * ------------------------------------------------------------------ */

  function mountFloatingButton() {
    const host = document.createElement('div');
    host.id = 'fg-userscript-floating';
    const root = host.attachShadow({ mode: 'open' });
    attachStyles(root);
    Theme.attach(host);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fg-float-btn';
    button.innerHTML = icon('download', 'fg-icon-sm') + ' Send to downloader';
    button.addEventListener('click', async function () {
      button.disabled = true;
      button.innerHTML = icon('download', 'fg-icon-sm') + ' Resolving...';
      try {
        const resolved = await FuckingFast.resolveDownloadUrl(currentUrl());
        if (!resolved) throw new Error('No download URL found');
        Delivery.handOff(resolved);
        button.innerHTML = icon('check', 'fg-icon-sm') + ' Handed off';
      } catch (error) {
        button.innerHTML = icon('alert', 'fg-icon-sm') + ' ' + error.message;
        button.disabled = false;
      }
    });

    root.appendChild(button);
    document.body.appendChild(host);
  }

  /* ------------------------------------------------------------------ *
   * Bootstrap
   * ------------------------------------------------------------------ */

  function startOnFitGirl(attempt) {
    const links = getAllDownloadLinks();

    // First pass: build the shell. The trigger must appear even before links
    // are known, otherwise a page that renders slowly leaves nothing to click.
    if (!state.elements.overlay) {
      state.page = Storage.loadPageState();
      mountPanel();
      mountTrigger();
    }

    if (links.length > 0) {
      // Re-place the trigger now that the heading and list exist. An earlier
      // pass may have fallen back to the fixed centre position because the
      // page had not rendered its heading yet.
      if (state.elements.triggerHost) {
        placeTrigger(state.elements.triggerHost);
      }
      renderFileList();
      setStatus('Ready to download');
      return;
    }

    setStatus('Waiting for download links...');

    if (attempt < 10) {
      setTimeout(function () { startOnFitGirl(attempt + 1); }, 1000);
    } else {
      setStatus('No fuckingfast.co links found on this page');
    }
  }

  function boot() {
    Theme.init();

    if (isFuckingFastPage()) { mountFloatingButton(); return; }
    if (!isFitGirlPage()) return;

    startOnFitGirl(1);

    const observer = new MutationObserver(function () {
      if (!state.elements.overlay) startOnFitGirl(1);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();