/* shared/theme.js
   Light/dark theme manager shared by the popup and the in-page UI.

   The chosen mode ('auto' | 'light' | 'dark') is stored in
   chrome.storage.local under `theme_mode` and applied to the document by
   setting `data-fg-theme` on <html>. A custom attribute name keeps us from
   clashing with host pages that use `data-theme` for their own theme. */

(function () {
  'use strict';

  var browserAPI = typeof browser !== 'undefined' ? browser : chrome;
  var KEY = 'theme_mode';
  var ATTR = 'data-fg-theme';

  function systemMode() {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (e) {
      return 'light';
    }
  }

  function effective() {
    return document.documentElement.getAttribute(ATTR) === 'dark' ? 'dark' : 'light';
  }

  function applyAttr(mode) {
    document.documentElement.setAttribute(ATTR, mode === 'dark' ? 'dark' : 'light');
    try {
      document.dispatchEvent(new CustomEvent('fg-theme-change', { detail: { mode: mode } }));
    } catch (e) {}
  }

  // Apply the OS preference immediately so the first paint is already correct
  // while we wait for the async storage read.
  applyAttr(systemMode());

  var currentPreference = 'auto';

  try {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', function () {
      if (currentPreference === 'auto') {
        applyAttr(systemMode());
      }
    });
  } catch (e) {}

  function readPreference() {
    return new Promise(function (resolve) {
      try {
        browserAPI.storage.local.get([KEY], function (result) {
          var v = result && result[KEY];
          resolve(v === 'light' || v === 'dark' ? v : 'auto');
        });
      } catch (e) {
        resolve('auto');
      }
    });
  }

  function writePreference(mode) {
    try {
      var data = {};
      data[KEY] = mode;
      var p = browserAPI.storage.local.set(data);
      if (p && typeof p.catch === 'function') {
        p.catch(function () {});
      }
    } catch (e) {}
  }

  function applyPreference(mode) {
    currentPreference = mode;
    applyAttr(mode === 'auto' ? systemMode() : mode);
  }

  async function init() {
    var mode = await readPreference();
    applyPreference(mode);

    try {
      browserAPI.storage.onChanged.addListener(function (changes, area) {
        if (area === 'local' && changes[KEY]) {
          var v = changes[KEY].newValue;
          applyPreference(v === 'light' || v === 'dark' ? v : 'auto');
        }
      });
    } catch (e) {}
  }

  /** Toggle light/dark and persist the explicit choice. */
  function toggle() {
    var next = effective() === 'dark' ? 'light' : 'dark';
    applyPreference(next);
    writePreference(next);
    return next;
  }

  function renderIcon(name) {
    if (typeof FitGirlIcons !== 'undefined' && typeof FitGirlIcons.icon === 'function') {
      return FitGirlIcons.icon(name, 'fg-icon-sm');
    }
    return '';
  }

  function renderToggle(button) {
    if (!button) return;
    var next = effective() === 'dark' ? 'light' : 'dark';
    var label = 'Switch to ' + next + ' theme';
    button.innerHTML = renderIcon(next === 'dark' ? 'moon' : 'sun');
    button.setAttribute('aria-label', label);
    button.title = label;
  }

  function bindToggle(button) {
    if (!button || button.dataset.fgThemeBound === 'true') {
      return;
    }
    button.dataset.fgThemeBound = 'true';
    renderToggle(button);
    button.addEventListener('click', function () {
      toggle();
      renderToggle(button);
    });
    document.addEventListener('fg-theme-change', function () {
      renderToggle(button);
    });
  }

  var api = {
    init: init,
    toggle: toggle,
    effective: effective,
    bindToggle: bindToggle
  };

  if (typeof self !== 'undefined') {
    self.FitGirlTheme = api;
  }
  if (typeof window !== 'undefined') {
    window.FitGirlTheme = api;
  }

  init();
})();