(function() {
'use strict';

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

class FitGirlPageUIManager {
  constructor(downloader) {
    this.downloader = downloader;
  }

  /**
   * Inline SVG icon markup. Falls back to an empty string when the shared
   * sprite script has not been injected.
   */
  icon(name, sizeClass) {
    if (typeof FitGirlIcons !== 'undefined' && typeof FitGirlIcons.icon === 'function') {
      return FitGirlIcons.icon(name, sizeClass);
    }
    return '';
  }

  bindThemeToggle(scope) {
    const button = scope?.querySelector('.fg-theme-toggle');
    if (button && typeof FitGirlTheme !== 'undefined' && typeof FitGirlTheme.bindToggle === 'function') {
      FitGirlTheme.bindToggle(button);
    }
  }

  normalizeUIMode(mode) {
    if (mode === CONFIG.UI_MODES.INLINE) {
      return CONFIG.UI_MODES.INLINE;
    }
    return CONFIG.UI_MODES.MODAL;
  }

  isModalMode() {
    return this.downloader.uiMode === CONFIG.UI_MODES.MODAL;
  }

  async loadUIModePreference() {
    this.downloader.uiMode = this.normalizeUIMode(CONFIG.DEFAULT_UI_MODE);

    try {
      const response = await browserAPI.runtime.sendMessage({
        action: 'getStorage',
        keys: [CONFIG.STORAGE_KEYS.USER_PREFERENCES]
      });

      if (!response || !response.success) {
        return;
      }

      const prefs = response.data[CONFIG.STORAGE_KEYS.USER_PREFERENCES] || {};
      this.downloader.uiMode = this.normalizeUIMode(prefs.uiMode);
    } catch (error) {
      console.error('FitGirl Downloader: Failed to load ui mode preference', error);
      this.downloader.uiMode = this.normalizeUIMode(CONFIG.DEFAULT_UI_MODE);
    }
  }

  normalizeDownloadMethod(method) {
    if (method === CONFIG.DOWNLOAD_METHODS.API) {
      return CONFIG.DOWNLOAD_METHODS.API;
    }
    return CONFIG.DOWNLOAD_METHODS.NATIVE;
  }

  async loadDownloadMethodPreference() {
    this.downloader.downloadMethod = this.normalizeDownloadMethod(CONFIG.DEFAULT_DOWNLOAD_METHOD);

    try {
      const response = await browserAPI.runtime.sendMessage({
        action: 'getStorage',
        keys: [CONFIG.STORAGE_KEYS.USER_PREFERENCES]
      });

      if (!response?.success) {
        return;
      }

      const prefs = response.data[CONFIG.STORAGE_KEYS.USER_PREFERENCES] || {};
      this.downloader.downloadMethod = this.normalizeDownloadMethod(prefs.downloadMethod);
    } catch (error) {
      console.error('FitGirl Downloader: Failed to load download method preference', error);
      this.downloader.downloadMethod = this.normalizeDownloadMethod(CONFIG.DEFAULT_DOWNLOAD_METHOD);
    }
  }

  tryInitialize(attempt = 1) {
    console.log(`FitGirl Downloader: Initialization attempt ${attempt}`);

    if (this.downloader.initialized) {
      return;
    }

    if (this.isFitGirlPage()) {
      if (this.downloader.hasMainUI()) {
        this.downloader.initialized = true;
        return;
      }

      if (this.processFitGirlPage()) {
        this.downloader.initialized = true;
        if (this.downloader.initRetryTimeout) {
          clearTimeout(this.downloader.initRetryTimeout);
          this.downloader.initRetryTimeout = null;
        }
        console.log('FitGirl Downloader: Successfully initialized on FitGirl page');
      } else if (attempt < 5) {
        if (this.downloader.initRetryTimeout) {
          clearTimeout(this.downloader.initRetryTimeout);
        }
        this.downloader.initRetryTimeout = setTimeout(() => {
          this.downloader.initRetryTimeout = null;
          this.tryInitialize(attempt + 1);
        }, 1000 * attempt);
      }
    } else if (this.isFuckingFastPage()) {
      this.processFuckingFastPage();
      this.downloader.initialized = true;
      console.log('FitGirl Downloader: Successfully initialized on fuckingfast page');
    }
  }

  isFitGirlPage() {
    return window.location.hostname.includes('fitgirl-repacks.site');
  }

  isFuckingFastPage() {
    return window.location.hostname.includes('fuckingfast.co');
  }

  processFitGirlPage() {
    const downloadSection = this.findDownloadSection();

    if (!this.isModalMode()) {
      this.teardownModalPresentation();

      if (downloadSection) {
        this.ensureInlineUI(downloadSection);
        return true;
      }

      return this.downloader.hasMainUI();
    }

    if (this.downloader.inlineUI) {
      this.downloader.inlineUI.teardown();
    }

    if (downloadSection) {
      this.ensureFitGirlTriggerButton();
      return true;
    }

    if (this.downloader.modalUI && this.downloader.modalUI.hasTriggerButton()) {
      return true;
    }

    return false;
  }

  teardownModalPresentation() {
    if (this.downloader.modalUI) {
      this.downloader.modalUI.teardown();
    }
  }

  ensureInlineUI(downloadSection) {
    if (this.downloader.inlineUI) {
      this.downloader.inlineUI.ensureInlineUI(downloadSection);
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
      this.setupLinkToggle();
      return;
    }

    this.createDownloadUI(downloadSection);
  }

  findDownloadSection() {
    const selectors = [
      'textarea[readonly]',
      'textarea#plaintext',
      'pre:has(a[href*="fuckingfast.co"])',
      'article:has(a[href*="fuckingfast.co"])'
    ];

    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element?.parentElement) {
          return element.parentElement;
        }
      } catch (e) {
        continue;
      }
    }
    return null;
  }

  async createDownloadUI(container) {
    if (!container) return;

    if (container.querySelector('.fg-download-ui') || this.downloader.hasMainUI()) {
      console.log('FitGirl Downloader: Main UI already exists, skipping render');
      return;
    }

    const uiContainer = document.createElement('div');
    uiContainer.className = 'fg-download-ui';
    const isModalMode = this.isModalMode();
    const ico = this.icon.bind(this);
    uiContainer.innerHTML = `
      <div class="fg-header">
        <h3 class="fg-title">FitGirl Downloader</h3>
        <div class="fg-header-actions">
          <button class="fg-theme-toggle" type="button" aria-label="Toggle theme" title="Toggle theme"></button>
          <button class="fg-btn fg-btn-secondary fg-toggle-links">
            ${isModalMode ? ico('close', 'fg-icon-sm') + ' Close downloader' : ico('link', 'fg-icon-sm') + ' Show original links'}
          </button>
        </div>
      </div>

      <div class="fg-controls">
        <div class="fg-search-row">
          <input type="search" class="fg-file-search-input" placeholder="Search files..." aria-label="Search files">
        </div>

        <div class="fg-control-group">
          <button class="fg-btn fg-btn-primary fg-start-btn">
            ${ico('download', 'fg-icon-sm')} Start download
          </button>
          <button class="fg-btn fg-btn-danger fg-stop-btn fg-hidden">
            ${ico('stop', 'fg-icon-sm')} Stop
          </button>
          <label class="fg-btn fg-btn-sm fg-toggle-select-control" title="Toggle all selectable files">
            <input type="checkbox" class="fg-toggle-select-checkbox" aria-label="Toggle all files">
            <span class="fg-toggle-select-text">Select all</span>
          </label>
          <button class="fg-btn fg-btn-sm fg-btn-secondary fg-calc-sizes-btn">${ico('scan', 'fg-icon-sm')} Calculate sizes</button>
          <button class="fg-btn fg-btn-sm fg-btn-danger fg-cancel-sizes-btn fg-hidden">${ico('close', 'fg-icon-sm')} Cancel scan</button>
          <button class="fg-btn fg-btn-sm fg-reset-selection">${ico('reset', 'fg-icon-sm')} Reset</button>
          <button class="fg-btn fg-btn-sm fg-btn-danger fg-clear-page">${ico('trash', 'fg-icon-sm')} Clear</button>
        </div>

        <div class="fg-counter">
          <span class="fg-counter-text">0 of 0 files selected (0 skipped)</span>
        </div>
        <div class="fg-size-progress">
          <span class="fg-size-progress-text">Size scan idle</span>
        </div>
        <div class="fg-package-summary"></div>
      </div>

      <div class="fg-file-list"></div>

      <div class="fg-status-panel">
        <div class="fg-status-text">Ready to download</div>
      </div>
    `;

    if (container.classList?.contains('fg-ui-modal')) {
      container.appendChild(uiContainer);
    } else {
      container.insertBefore(uiContainer, container.firstChild);
    }

    this.bindThemeToggle(uiContainer);

    this.downloader.cacheElements();
    this.downloader.refreshCheckboxCache();

    await this.downloader.extractAndDisplayLinks();
    this.downloader.bindEventHandlers();
    this.setupLinkToggle();
  }

  setSizeCalculationState(isRunning) {
    const { calcSizesBtn, cancelSizesBtn } = this.downloader.cachedElements;
    if (calcSizesBtn) {
      calcSizesBtn.disabled = isRunning;
      calcSizesBtn.innerHTML = isRunning
        ? this.icon('scan', 'fg-icon-sm') + ' Calculating...'
        : this.icon('scan', 'fg-icon-sm') + ' Calculate sizes';
    }

    if (cancelSizesBtn) {
      // Class + !important beats host-page CSS; the inline display value was
      // not reliably hiding this button in Firefox.
      cancelSizesBtn.classList.toggle('fg-hidden', !isRunning);
      cancelSizesBtn.disabled = false;
    }
  }

  setSizeProgressText(message) {
    const { sizeProgressText } = this.downloader.cachedElements;
    if (sizeProgressText) {
      sizeProgressText.textContent = message;
    }
  }

  ensureFitGirlTriggerButton() {
    if (this.downloader.modalUI) {
      this.downloader.modalUI.ensureTriggerButton();
    }
  }

  ensureExtensionModal() {
    if (this.downloader.modalUI) {
      this.downloader.modalUI.ensureModalContainer();
    }
  }

  async openExtensionUIModal() {
    if (this.downloader.modalUI) {
      await this.downloader.modalUI.open();
    }
  }

  closeExtensionUIModal() {
    if (this.downloader.modalUI) {
      this.downloader.modalUI.close();
      return;
    }

    document.body.classList.remove('fg-ui-modal-open');
  }

  setupLinkToggle() {
    if (!this.isModalMode()) {
      this.downloader.hideOriginalLinks();
    }
  }

  processFuckingFastPage() {
    console.log('FitGirl Downloader: Processing fuckingfast.co page');

    if (this.downloader.currentPage.includes('/dl/')) {
      this.addDirectDownloadButton();
    } else {
      this.addExtractButton();
    }
  }

  addDirectDownloadButton() {
    const button = document.createElement('button');
    button.className = 'fg-float-btn';
    button.innerHTML = this.icon('download', 'fg-icon-sm') + ' Send to downloader';
    button.addEventListener('click', () => {
      this.downloader.initiateDownload(window.location.href, window.location.href);
    });
    document.body.appendChild(button);
  }

  addExtractButton() {
    const button = document.createElement('button');
    button.className = 'fg-float-btn';
    button.innerHTML = this.icon('external', 'fg-icon-sm') + ' Extract &amp; download';
    button.addEventListener('click', () => {
      this.triggerPageDownload();
    });
    document.body.appendChild(button);
  }

  /**
   * Trigger a download for the file page we are currently on.
   *
   * Primary: background extraction (service worker POSTs /f/<id>/go and uses
   * the HX-Redirect URL, no page interaction needed).
   * Fallback: clicking the page's native DOWNLOAD button (`a.link-button`,
   * hx-post="/f/<id>/go"). The first click may be consumed by the site's ad
   * interceptor; the download manager auto-clicks again when no HTMX POST
   * fired. htmx follows the HX-Redirect, which starts the native download.
   */
  triggerPageDownload() {
    this.tryBackgroundExtraction();
  }

  async tryBackgroundExtraction() {
    try {
      const downloadUrl = await this.downloader.extractRealDownloadUrl(window.location.href);
      if (downloadUrl) {
        await this.downloader.initiateDownload(downloadUrl, window.location.href);
        return;
      }

      throw new Error('No download URL found');
    } catch (error) {
      // Fallback: use the page's own DOWNLOAD button flow
      if (this.triggerPageButtonFallback()) {
        return;
      }
      this.downloader.showNotification('Error', error.message);
    }
  }

  triggerPageButtonFallback() {
    if (this.downloader.downloadManager?.tryTriggerPageDownload()) {
      this.downloader.updateStatus('Download triggered via page button');
      return true;
    }
    return false;
  }
}

if (typeof self !== 'undefined') {
  self.FitGirlPageUIManager = FitGirlPageUIManager;
}

if (typeof window !== 'undefined') {
  window.FitGirlPageUIManager = FitGirlPageUIManager;
}

})();