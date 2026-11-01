#!/usr/bin/env node
/**
 * Inlines the extension's design system into the Tampermonkey userscript.
 *
 * The userscript must stay a single installable file, but hand-copying
 * tokens.css / styles.css / icons.js guarantees drift. This script reads the
 * three sources and rewrites the marked regions in
 * tampermonkey-script/fitgirl_Tampermonkey_downloader.js in place.
 *
 * Run after any change to the extension styles or icons:
 *
 *   node scripts/build-userscript.mjs
 *
 * Transformations applied to the CSS:
 *   - :root:not([data-fg-theme])   -> :host(:not([data-fg-theme]))
 *   - :root[data-fg-theme="dark"]  -> :host([data-fg-theme="dark"])
 *   - :root[data-fg-theme="light"] -> :host([data-fg-theme="light"])
 *   - remaining :root              -> :host
 *   - body.fg-ui-modal-open / body.fg-links-modal-open rules are dropped:
 *     they cannot affect the document from inside a shadow root, and the
 *     script handles scroll locking directly on documentElement.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const TOKENS_CSS = resolve(root, 'browser-extension/shared/tokens.css');
const PANEL_CSS = resolve(root, 'browser-extension/content/styles.css');
const ICONS_JS = resolve(root, 'browser-extension/shared/icons.js');
const USCRIPT = resolve(root, 'tampermonkey-script/fitgirl_Tampermonkey_downloader.js');

function read(path) {
  return readFileSync(path, 'utf8');
}

/** Escape a string for embedding inside a JS template literal. */
function toTemplateLiteral(text) {
  return text
    .replaceAll("\\", '\\\\')
    .replaceAll("`", '\\`')
    .replaceAll("${", '\\${');
}

function transformCss(css) {
  return css
    .replaceAll(":root:not([data-fg-theme])", ':host(:not([data-fg-theme]))')
    .replaceAll(":root[data-fg-theme=\"dark\"]", ':host([data-fg-theme="dark"])')
    .replaceAll(":root[data-fg-theme=\"light\"]", ':host([data-fg-theme="light"])')
    .replaceAll(":root", ':host');
}

function stripShadowHostileRules(css) {
  // body.* selectors cannot match from inside a shadow root.
  return css
    .replace(/^body\.fg-ui-modal-open\s*\{[^}]*\}\s*$/gm, '')
    .replace(/^body\.fg-links-modal-open\s*\{[^}]*\}\s*$/gm, '');
}

/**
 * Pull the SYMBOLS object literal out of shared/icons.js so the userscript
 * gets the exact same glyphs without hand maintenance.
 */
function extractSymbols(iconsSource) {
  const start = iconsSource.indexOf('var SYMBOLS = {');
  if (start === -1) {
    throw new Error('Could not find "var SYMBOLS = {" in shared/icons.js');
  }
  const end = iconsSource.indexOf('\n  };', start);
  if (end === -1) {
    throw new Error('Could not find the end of the SYMBOLS object literal');
  }
  const literal = iconsSource.slice(start, end + '\n  }'.length);
  // "var SYMBOLS = {...}" -> "const ICONS_SYMBOLS = {...}"
  return literal.replace('var SYMBOLS =', 'const ICONS_SYMBOLS =') + ';';
}

function replaceRegion(source, name, body) {
  const startMarker = `// <<<GENERATED:${name}>>>`;
  const endMarker = `// <<<END:${name}>>>`;
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);

  if (start === -1 || end === -1) {
    throw new Error(`Missing markers for region ${name}`);
  }
  if (end < start) {
    throw new Error(`End marker precedes start marker for region ${name}`);
  }

  const head = source.slice(0, start + startMarker.length);
  const tail = source.slice(end);
  return `${head}\n${body}\n${tail}`;
}

function main() {
  let script = read(USCRIPT);

  const tokensCss = transformCss(read(TOKENS_CSS));
  const panelCss = stripShadowHostileRules(transformCss(read(PANEL_CSS)));
  const symbolsJs = extractSymbols(read(ICONS_JS));

  script = replaceRegion(
    script,
    'TOKENS_CSS',
    `const TOKENS_CSS = String.raw\`\n${toTemplateLiteral(tokensCss)}\`;`
  );

  script = replaceRegion(
    script,
    'PANEL_CSS',
    `const PANEL_CSS = String.raw\`\n${toTemplateLiteral(panelCss)}\`;`
  );

  script = replaceRegion(script, 'ICONS_JS', symbolsJs);

  writeFileSync(USCRIPT, script, 'utf8');

  const bytes = Buffer.byteLength(script, 'utf8');
  console.log('Inlined design system into the userscript.');
  console.log(`  tokens.css : ${tokensCss.length} chars`);
  console.log(`  styles.css : ${panelCss.length} chars`);
  console.log(`  icons.js   : ${symbolsJs.length} chars`);
  console.log(`  output     : ${bytes} bytes`);
}

main();