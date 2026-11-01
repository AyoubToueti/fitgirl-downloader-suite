/* shared/icons.js
   Inline SVG icon sprite shared by the popup and the in-page UI.
   Icons are stroke-only and inherit currentColor, so they follow the
   surrounding text colour and the light/dark token set. */

(function () {
  'use strict';

  var SYMBOLS = {
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

  function buildSprite() {
    var markup = '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" ' +
      'style="position:absolute;width:0;height:0;overflow:hidden">';

    Object.keys(SYMBOLS).forEach(function (name) {
      markup += '<symbol id="fg-i-' + name + '" viewBox="0 0 24 24">' + SYMBOLS[name] + '</symbol>';
    });

    markup += '</svg>';
    return markup;
  }

  function mountIconSprite() {
    if (typeof document === 'undefined' || !document.body) {
      return;
    }

    if (document.getElementById('fg-icon-sprite')) {
      return;
    }

    var host = document.createElement('div');
    host.id = 'fg-icon-sprite';
    host.setAttribute('aria-hidden', 'true');
    host.innerHTML = buildSprite();
    document.body.appendChild(host);
  }

  /**
   * Return the markup for an icon.
   * @param {string} name key from SYMBOLS
   * @param {string} [sizeClass] optional extra class, e.g. 'fg-icon-sm'
   */
  function icon(name, sizeClass) {
    var key = SYMBOLS[name] ? name : 'info';
    var cls = 'fg-icon' + (sizeClass ? ' ' + sizeClass : '');
    return '<svg class="' + cls + '" aria-hidden="true" focusable="false">' +
      '<use href="#fg-i-' + key + '"></use></svg>';
  }

  var api = {
    SYMBOLS: Object.freeze(Object.keys(SYMBOLS)),
    mountIconSprite: mountIconSprite,
    icon: icon
  };

  if (typeof self !== 'undefined') {
    self.FitGirlIcons = api;
  }

  if (typeof window !== 'undefined') {
    window.FitGirlIcons = api;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountIconSprite, { once: true });
    } else {
      mountIconSprite();
    }
  }
})();