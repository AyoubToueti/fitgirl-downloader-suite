/* shared/dialog.js
   Extension-styled replacement for window.confirm().

   The browser's built-in confirm renders outside the page/extension chrome,
   ignores the theme and looks nothing like the rest of the UI. This helper
   draws a dialog inside the calling document using the shared token classes
   from tokens.css.

   Usage:
     const ok = await FitGirlDialog.confirm({
       title: 'Clear download logs',
       message: 'This cannot be undone.',
       confirmLabel: 'Clear',
       cancelLabel: 'Cancel',
       danger: true
     });
   Resolves true when confirmed, false on cancel, Escape, backdrop or close. */

(function () {
  'use strict';

  var OVERLAY_CLASS = 'fg-dialog-overlay';

  function removeOverlay(overlay) {
    if (overlay && overlay.parentElement) {
      overlay.parentElement.removeChild(overlay);
    }
  }

  /**
   * @param {Object} options
   * @param {string} options.title - dialog heading
   * @param {string} options.message - body text
   * @param {string} [options.confirmLabel='Confirm']
   * @param {string} [options.cancelLabel='Cancel']
   * @param {boolean} [options.danger=false] - style the confirm button red
   * @returns {Promise<boolean>}
   */
  function confirm(options) {
    var opts = options || {};

    return new Promise(function (resolve) {
      if (typeof document === 'undefined' || !document.body) {
        resolve(false);
        return;
      }

      var settled = false;

      var overlay = document.createElement('div');
      overlay.className = OVERLAY_CLASS;

      var dialog = document.createElement('div');
      dialog.className = 'fg-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      if (opts.title) {
        dialog.setAttribute('aria-label', opts.title);
      }

      var header = document.createElement('div');
      header.className = 'fg-dialog-header';
      header.textContent = opts.title || 'Confirm';

      var body = document.createElement('div');
      body.className = 'fg-dialog-body';
      body.textContent = opts.message || '';

      var actions = document.createElement('div');
      actions.className = 'fg-dialog-actions';

      var confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = 'fg-dialog-btn ' + (opts.danger ? 'fg-dialog-btn-danger' : 'fg-dialog-btn-primary');
      confirmBtn.textContent = opts.confirmLabel || 'Confirm';

      // cancelLabel === null explicitly asks for a single-button dialog.
      var cancelBtn = null;
      if (opts.cancelLabel !== null) {
        cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'fg-dialog-btn';
        cancelBtn.textContent = opts.cancelLabel || 'Cancel';
        actions.appendChild(cancelBtn);
      }

      actions.appendChild(confirmBtn);

      dialog.appendChild(header);
      if (opts.message) {
        dialog.appendChild(body);
      }
      dialog.appendChild(actions);
      overlay.appendChild(dialog);

      function cleanup(result) {
        if (settled) return;
        settled = true;
        document.removeEventListener('keydown', onKeydown, true);
        removeOverlay(overlay);
        resolve(result);
      }

      function onKeydown(event) {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          cleanup(false);
        } else if (event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          cleanup(true);
        }
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', function (event) {
          event.stopPropagation();
          cleanup(false);
        });
      }

      confirmBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        cleanup(true);
      });

      overlay.addEventListener('click', function (event) {
        if (event.target === overlay) {
          cleanup(false);
        }
      });

      document.addEventListener('keydown', onKeydown, true);
      document.body.appendChild(overlay);

      //(cancelBtn || confirmBtn)e safer action first; Enter still confirms.
      try {
        cancelBtn.focus();
      } catch (e) {
        // Focus can fail if the document is not active; ignore.
      }
    });
  }

  /**
   * Acknowledge-only dialog for messages that need no decision.
   * @returns {Promise<void>}
   */
  function alert(options) {
    var opts = options || {};
    return confirm({
      title: opts.title || 'Notice',
      message: opts.message,
      confirmLabel: opts.confirmLabel || 'OK',
      cancelLabel: null,
      danger: false
    }).then(function () {});
  }

  var api = { confirm: confirm, alert: alert };

  if (typeof self !== 'undefined') {
    self.FitGirlDialog = api;
  }
  if (typeof window !== 'undefined') {
    window.FitGirlDialog = api;
  }
})();