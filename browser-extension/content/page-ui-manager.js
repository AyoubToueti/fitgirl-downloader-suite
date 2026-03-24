(function() {
'use strict';

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

class FitGirlPageUIManager {
  constructor(downloader) {
    this.downloader = downloader;
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
    uiContainer.innerHTML = `
      <div class="fg-header">
        <h3 class="fg-title">🎮 FitGirl Downloader</h3>
        <button class="fg-btn fg-btn-secondary fg-toggle-links">
          ${isModalMode ? '✖ Close Downloader' : '👁️ Show Original Links'}
        </button>
      </div>

      <div class="fg-controls">
        <div class="fg-control-group">
          <button class="fg-btn fg-btn-primary fg-start-btn">
            🚀 Start Download
          </button>
          <button class="fg-btn fg-btn-danger fg-stop-btn" style="display: none;">
            ⏹️ Stop
          </button>
          <button class="fg-btn fg-btn-sm fg-toggle-select">
            ☑️ Select All
          </button>
          <button class="fg-btn fg-btn-sm fg-reset-selection">Reset</button>
        </div>

        <div class="fg-counter">
          <span class="fg-counter-text">0 of 0 files selected (0 skipped)</span>
        </div>
      </div>

      <div class="fg-file-list"></div>

      <div class="fg-status-panel">
        <div class="fg-status-text">Ready to download</div>
      </div>
    `;

    if (container.classList && container.classList.contains('fg-ui-modal')) {
      container.appendChild(uiContainer);
    } else {
      container.insertBefore(uiContainer, container.firstChild);
    }

    this.downloader.cacheElements();
    this.downloader.refreshCheckboxCache();

    await this.downloader.extractAndDisplayLinks();
    this.downloader.bindEventHandlers();
    this.setupLinkToggle();
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
    button.innerHTML = '🚀 Send to Downloader';
    button.addEventListener('click', () => {
      this.downloader.initiateDownload(window.location.href, window.location.href);
    });
    document.body.appendChild(button);
  }

  addExtractButton() {
    const button = document.createElement('button');
    button.className = 'fg-float-btn';
    button.innerHTML = '🔍 Extract & Download';
    button.addEventListener('click', async () => {
      try {
        const downloadUrl = await this.downloader.extractRealDownloadUrl(window.location.href);
        if (downloadUrl) {
          await this.downloader.initiateDownload(downloadUrl, window.location.href);
        }
      } catch (error) {
        this.downloader.showNotification('❌ Error', error.message);
      }
    });
    document.body.appendChild(button);
  }
}

if (typeof self !== 'undefined') {
  self.FitGirlPageUIManager = FitGirlPageUIManager;
}

if (typeof window !== 'undefined') {
  window.FitGirlPageUIManager = FitGirlPageUIManager;
}

})();
