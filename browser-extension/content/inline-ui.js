(function() {
'use strict';

class FitGirlInlineUI {
  constructor(downloader) {
    this.downloader = downloader;
  }

  ensureInlineUI(downloadSection) {
    if (!downloadSection) {
      return;
    }

    const existingUI = this.downloader.getMainUIElement();

    if (existingUI) {
      if (existingUI.parentElement !== downloadSection) {
        downloadSection.insertBefore(existingUI, downloadSection.firstChild);
      }

      this.downloader.cacheElements();
      this.downloader.refreshCheckboxCache();
      this.downloader.updateCounter();
      this.downloader.updateToggleButton();
      this.downloader.setupLinkToggle();
      return;
    }

    this.downloader.createDownloadUI(downloadSection);
  }

  teardown() {
    // Inline mode does not require teardown beyond shared downloader cleanup.
  }

  destroy() {
    // No inline-owned global listeners or nodes.
  }
}

if (typeof self !== 'undefined') {
  self.FitGirlInlineUI = FitGirlInlineUI;
}

if (typeof window !== 'undefined') {
  window.FitGirlInlineUI = FitGirlInlineUI;
}

})();
