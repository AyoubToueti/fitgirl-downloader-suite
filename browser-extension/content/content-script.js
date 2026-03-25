// Guard against multiple script injections
if (window.fitGirlDownloaderInitialized) {
  console.log('FitGirl Downloader: Already initialized, skipping...');
} else {
  window.fitGirlDownloaderInitialized = true;
  console.log('FitGirl Downloader: Content script loaded on', window.location.href);

// Wrap in IIFE to prevent re-declaration issues
(function() {
'use strict';

// Optimized FitGirlDownloader class with performance improvements

const HelpersClass = typeof FitGirlDomHelpers === 'function' ? FitGirlDomHelpers : null;
const MutationHandlerClass = typeof FitGirlMutationHandler === 'function' ? FitGirlMutationHandler : null;
const OriginalLinksModalClass = typeof FitGirlOriginalLinksModal === 'function' ? FitGirlOriginalLinksModal : null;
const StorageManagerClass = typeof FitGirlStorageManager === 'function' ? FitGirlStorageManager : null;
const SelectionManagerClass = typeof FitGirlSelectionManager === 'function' ? FitGirlSelectionManager : null;
const DownloadManagerClass = typeof FitGirlDownloadManager === 'function' ? FitGirlDownloadManager : null;
const PageUIManagerClass = typeof FitGirlPageUIManager === 'function' ? FitGirlPageUIManager : null;
const LinkListManagerClass = typeof FitGirlLinkListManager === 'function' ? FitGirlLinkListManager : null;
const FeedbackManagerClass = typeof FitGirlFeedbackManager === 'function' ? FitGirlFeedbackManager : null;
const SizeComputeManagerClass = typeof FitGirlSizeComputeManager === 'function' ? FitGirlSizeComputeManager : null;

class FitGirlDownloader {
  constructor() {
    this.helpers = HelpersClass ? new HelpersClass() : null;
    this.currentPage = window.location.href;
    this.pageHash = this.hashString(this.currentPage);
    this.isProcessing = false;
    this.shouldStop = false;
    this.initialized = false;
    this.fileItems = [];
    this.currentIndex = 0;
    
    // Cache DOM elements
    this.cachedElements = {};
    
    // Debounced functions
    this.debouncedSaveSelections = this.debounce(() => this.saveSelections(), 500);
    this.debouncedUpdateCounter = this.debounce(() => this.updateCounter(), 100);
    
    this.storageManager = StorageManagerClass ? new StorageManagerClass(this) : null;
    this.selectionManager = SelectionManagerClass ? new SelectionManagerClass(this) : null;
    this.downloadManager = DownloadManagerClass ? new DownloadManagerClass(this) : null;
    this.pageUIManager = PageUIManagerClass ? new PageUIManagerClass(this) : null;
    this.linkListManager = LinkListManagerClass ? new LinkListManagerClass(this) : null;
    this.feedbackManager = FeedbackManagerClass ? new FeedbackManagerClass(this) : null;
    this.sizeComputeManager = SizeComputeManagerClass ? new SizeComputeManagerClass(this) : null;
    
    // Mutation handler extracted into dedicated module
    this.mutationHandler = MutationHandlerClass ? new MutationHandlerClass(this) : null;
    this.initRetryTimeout = null;

    // Cache checkbox references to avoid repeated global DOM queries
    this.checkboxElements = [];

    // Original links modal manager
    this.originalLinksModal = OriginalLinksModalClass ? new OriginalLinksModalClass(this) : null;

    // Modal-first UI state for FitGirl pages
    this.uiMode = CONFIG.DEFAULT_UI_MODE || 'modal';
    this.modalUI = typeof FitGirlModalUI === 'function' ? new FitGirlModalUI(this) : null;
    this.inlineUI = typeof FitGirlInlineUI === 'function' ? new FitGirlInlineUI(this) : null;

    // Lifecycle handlers for flushing pending writes
    this.handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        this.flushPendingStorageWrites(true);
      }
    };
    this.handlePageHide = () => {
      this.flushPendingStorageWrites(true);
    };
    
    console.log('FitGirl Downloader: Initializing on', this.currentPage);
    this.init();
  }

  hasMainUI() {
    return !!this.getMainUIElement();
  }

  getMainUIElement() {
    const uiInstances = Array.from(document.querySelectorAll('.fg-download-ui'));

    if (uiInstances.length > 1) {
      // Keep the first rendered instance and prune extras to enforce singleton UI.
      uiInstances.slice(1).forEach((node) => node.remove());
    }

    return uiInstances[0] || null;
  }

  async init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start(), { once: true });
    } else {
      this.start();
    }
  }

  async start() {
    console.log('FitGirl Downloader: Starting initialization');
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('pagehide', this.handlePageHide);
    await this.loadUIModePreference();
    await this.checkPauseState();
    this.tryInitialize();
    this.setupMutationObserver();
  }

  normalizeUIMode(mode) {
    return this.pageUIManager?.normalizeUIMode(mode) ?? CONFIG.UI_MODES.MODAL;
  }

  isModalMode() {
    return this.pageUIManager?.isModalMode() ?? (this.uiMode === CONFIG.UI_MODES.MODAL);
  }

  async loadUIModePreference() {
    if (!this.pageUIManager) return;
    await this.pageUIManager.loadUIModePreference();
  }

  tryInitialize(attempt = 1) {
    this.pageUIManager?.tryInitialize(attempt);
  }

  setupMutationObserver() {
    this.mutationHandler?.setupMutationObserver();
  }

  queueMutationProcessing(mutations) {
    this.mutationHandler?.queueMutationProcessing(mutations);
  }

  handleMutations(mutations) {
    this.mutationHandler?.handleMutations(mutations);
  }

  isFitGirlPage() {
    return this.pageUIManager?.isFitGirlPage() ?? window.location.hostname.includes('fitgirl-repacks.site');
  }

  isFuckingFastPage() {
    return this.pageUIManager?.isFuckingFastPage() ?? window.location.hostname.includes('fuckingfast.co');
  }

  processFitGirlPage() {
    return this.pageUIManager?.processFitGirlPage() ?? false;
  }

  teardownModalPresentation() {
    this.pageUIManager?.teardownModalPresentation();
  }

  ensureInlineUI(downloadSection) {
    this.pageUIManager?.ensureInlineUI(downloadSection);
  }

  findDownloadSection() {
    return this.pageUIManager?.findDownloadSection() ?? null;
  }

  async createDownloadUI(container) {
    if (!this.pageUIManager) return;
    await this.pageUIManager.createDownloadUI(container);
  }

  ensureFitGirlTriggerButton() {
    this.pageUIManager?.ensureFitGirlTriggerButton();
  }

  closeExtensionUIModal() {
    this.pageUIManager?.closeExtensionUIModal();
  }

  cacheElements() {
    this.cachedElements = {
      fileList: document.querySelector('.fg-file-list'),
      startBtn: document.querySelector('.fg-start-btn'),
      stopBtn: document.querySelector('.fg-stop-btn'),
      toggleSelectCheckbox: document.querySelector('.fg-toggle-select-checkbox'),
      toggleSelectText: document.querySelector('.fg-toggle-select-text'),
      resetBtn: document.querySelector('.fg-reset-selection'),
      toggleLinksBtn: document.querySelector('.fg-toggle-links'),
      counterText: document.querySelector('.fg-counter-text'),
      statusText: document.querySelector('.fg-status-text'),
      progressFill: document.querySelector('.fg-progress-fill'),
      progressText: document.querySelector('.fg-progress-text'),
      calcSizesBtn: document.querySelector('.fg-calc-sizes-btn'),
      cancelSizesBtn: document.querySelector('.fg-cancel-sizes-btn'),
      sizeUnknownOnlyCheckbox: document.querySelector('.fg-size-unknown-checkbox'),
      sizeProgressText: document.querySelector('.fg-size-progress-text'),
      packageSummary: document.querySelector('.fg-package-summary')
    };
  }

  async extractAndDisplayLinks() {
    if (!this.linkListManager) return;
    await this.linkListManager.extractAndDisplayLinks();
  }

  refreshCheckboxCache() {
    const fileList = this.cachedElements.fileList;
    if (!fileList) {
      this.checkboxElements = [];
      return;
    }

    this.checkboxElements = Array.from(fileList.querySelectorAll('.fg-checkbox'));
  }

  getCheckboxStats() {
    let enabled = 0;
    let checkedEnabled = 0;
    let checkedTotal = 0;

    for (const checkbox of this.checkboxElements) {
      if (checkbox.checked) {
        checkedTotal++;
      }
      if (!checkbox.disabled) {
        enabled++;
        if (checkbox.checked) {
          checkedEnabled++;
        }
      }
    }

    return { enabled, checkedEnabled, checkedTotal };
  }

  bindEventHandlers() {
    const { startBtn, stopBtn, toggleSelectCheckbox, resetBtn, toggleLinksBtn } = this.cachedElements;

    if (startBtn && startBtn.dataset.fgBoundStart !== 'true') {
      startBtn.addEventListener('click', () => this.startBulkDownload());
      startBtn.dataset.fgBoundStart = 'true';
    }

    if (stopBtn && stopBtn.dataset.fgBoundStop !== 'true') {
      stopBtn.addEventListener('click', () => this.stopDownload());
      stopBtn.dataset.fgBoundStop = 'true';
    }

    if (toggleSelectCheckbox && toggleSelectCheckbox.dataset.fgBoundToggleSelect !== 'true') {
      toggleSelectCheckbox.addEventListener('change', () => this.toggleSelectAll(toggleSelectCheckbox.checked));
      toggleSelectCheckbox.dataset.fgBoundToggleSelect = 'true';
    }

    if (resetBtn && resetBtn.dataset.fgBoundReset !== 'true') {
      resetBtn.addEventListener('click', () => this.resetSelection());
      resetBtn.dataset.fgBoundReset = 'true';
    }

    if (toggleLinksBtn && toggleLinksBtn.dataset.fgBoundLinks !== 'true') {
      toggleLinksBtn.addEventListener('click', () => {
        if (this.isModalMode()) {
          this.closeExtensionUIModal();
          return;
        }

        this.toggleOriginalLinks();
      });
      toggleLinksBtn.dataset.fgBoundLinks = 'true';
    }

    if (this.cachedElements.calcSizesBtn && this.cachedElements.calcSizesBtn.dataset.fgBoundCalcSizes !== 'true') {
      this.cachedElements.calcSizesBtn.addEventListener('click', () => this.startManualSizeCalculation());
      this.cachedElements.calcSizesBtn.dataset.fgBoundCalcSizes = 'true';
    }

    if (this.cachedElements.cancelSizesBtn && this.cachedElements.cancelSizesBtn.dataset.fgBoundCancelSizes !== 'true') {
      this.cachedElements.cancelSizesBtn.addEventListener('click', () => this.cancelManualSizeCalculation());
      this.cachedElements.cancelSizesBtn.dataset.fgBoundCancelSizes = 'true';
    }
  }

  setupLinkToggle() {
    this.pageUIManager?.setupLinkToggle();
  }

  toggleOriginalLinks() {
    this.originalLinksModal?.toggleOriginalLinks();
  }

  updateOriginalLinksButtonText() {
    this.originalLinksModal?.updateOriginalLinksButtonText();
  }

  hideOriginalLinks() {
    this.originalLinksModal?.hideOriginalLinks();
  }

  showOriginalLinks() {
    this.originalLinksModal?.showOriginalLinks();
  }

  getOriginalDownloadLinks() {
    return this.originalLinksModal?.getOriginalDownloadLinks() ?? [];
  }

  openOriginalLinksModal() {
    this.originalLinksModal?.openOriginalLinksModal();
  }

  closeOriginalLinksModal() {
    this.originalLinksModal?.closeOriginalLinksModal();
  }

  async downloadSingleFile(url) {
    if (!this.downloadManager) return;
    await this.downloadManager.downloadSingleFile(url);
  }

  async startBulkDownload(resumeFromIndex = null, resumeFiles = null) {
    if (!this.downloadManager) return;
    await this.downloadManager.startBulkDownload(resumeFromIndex, resumeFiles);
  }

  stopDownload() {
    this.downloadManager?.stopDownload();
  }

  getSelectedFiles() {
    return this.selectionManager?.getSelectedFiles() ?? [];
  }

  async extractRealDownloadUrl(pageUrl) {
    if (this.downloadManager) {
      return this.downloadManager.extractRealDownloadUrl(pageUrl);
    }

    throw new Error('Download manager unavailable');
  }

  async initiateDownload(downloadUrl, originalUrl) {
    if (this.downloadManager) {
      return this.downloadManager.initiateDownload(downloadUrl, originalUrl);
    }

    throw new Error('Download manager unavailable');
  }

  setFileStatus(url, status, errorMessage = '') {
    this.downloadManager?.setFileStatus(url, status, errorMessage);
  }

  async startManualSizeCalculation() {
    if (!this.sizeComputeManager) return;
    const onlyUnknown = Boolean(this.cachedElements.sizeUnknownOnlyCheckbox?.checked);
    await this.sizeComputeManager.startManualCalculation({ onlyUnknown });
  }

  async cancelManualSizeCalculation() {
    if (!this.sizeComputeManager) return;
    await this.sizeComputeManager.cancelCalculation();
  }

  applySizeResults(sizeResults, progressMeta = null) {
    this.linkListManager?.applySizeResults(sizeResults, progressMeta);
  }

  async retryFile(url) {
    if (!this.downloadManager) return;
    await this.downloadManager.retryFile(url);
  }

  async handleSkipFile(url) {
    if (!this.selectionManager) return;
    await this.selectionManager.handleSkipFile(url);
  }

  async handleUndoSkip(url) {
    if (!this.selectionManager) return;
    await this.selectionManager.handleUndoSkip(url);
  }

  selectAll() {
    this.selectionManager?.selectAll();
  }

  deselectAll() {
    this.selectionManager?.deselectAll();
  }

  toggleSelectAll() {
    this.selectionManager?.toggleSelectAll();
  }

  updateToggleButton() {
    this.selectionManager?.updateToggleButton();
  }

  async resetSelection() {
    if (!this.selectionManager) return;
    await this.selectionManager.resetSelection();
  }

  updateCounter() {
    this.feedbackManager?.updateCounter();
  }

  updateProgress(current, total) {
    this.feedbackManager?.updateProgress(current, total);
  }

  updateStatus(message) {
    this.feedbackManager?.updateStatus(message);
  }

  async saveSelections() {
    if (!this.storageManager) return;
    await this.storageManager.saveSelections();
  }

  async saveSkippedFiles() {
    if (!this.storageManager) return;
    await this.storageManager.saveSkippedFiles();
  }

  async flushPendingStorageWrites(force = false) {
    if (!this.storageManager) return;
    await this.storageManager.flushPendingStorageWrites(force);
  }

  async loadPageState() {
    return this.storageManager?.loadPageState() ?? { selections: {}, skipped: [], sizeResults: {}, version: 1 };
  }

  async savePageState(state) {
    if (!this.storageManager) return;
    await this.storageManager.savePageState(state);
  }

  async saveSizeResults(sizeResults) {
    if (!this.storageManager) return;
    await this.storageManager.saveSizeResults(sizeResults);
  }

  async savePauseState(currentIndex, files) {
    if (!this.storageManager) return;
    await this.storageManager.savePauseState(currentIndex, files);
  }

  async clearPauseState() {
    if (!this.storageManager) return;
    await this.storageManager.clearPauseState();
  }

  async checkPauseState() {
    if (!this.storageManager) return;
    await this.storageManager.checkPauseState();
  }

  async logSuccess(url) {
    if (!this.feedbackManager) return;
    await this.feedbackManager.logSuccess(url);
  }

  async logFailure(url, error) {
    if (!this.feedbackManager) return;
    await this.feedbackManager.logFailure(url, error);
  }

  async showNotification(title, message) {
    if (!this.feedbackManager) return;
    await this.feedbackManager.showNotification(title, message);
  }

  // Utility functions
  hashString(str) {
    if (this.helpers) {
      return this.helpers.hashString(str);
    }

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  getFilenameFromUrl(url) {
    if (this.helpers) {
      return this.helpers.getFilenameFromUrl(url);
    }

    try {
      const urlObj = new URL(url);
      
      const hashName = decodeURIComponent((urlObj.hash || '').replace(/^#/, '')).trim();
      if (hashName) {
        return hashName;
      }

      const pathname = decodeURIComponent(urlObj.pathname || '');
      const segments = pathname.split('/').filter(s => s);
      return segments[segments.length - 1] || 'unknown';
    } catch (error) {
      const hashMatch = url.match(/#([^#]+)$/);
      if (hashMatch && hashMatch[1]) {
        return decodeURIComponent(hashMatch[1]).trim();
      }

      const match = url.match(/([^\/#?]+)(?:\?|$)/);
      return match ? match[1] : 'unknown';
    }
  }

  generateFilename(url) {
    if (this.helpers) {
      return this.helpers.generateFilename(url);
    }

    const timestamp = Date.now();
    const baseName = this.getFilenameFromUrl(url);
    return `fitgirl_${baseName}_${timestamp}`;
  }

  formatTimestamp(timestamp) {
    if (this.helpers) {
      return this.helpers.formatTimestamp(timestamp);
    }

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  isPauseExpired(pausedAt) {
    if (this.storageManager) {
      return this.storageManager.isPauseExpired(pausedAt);
    }

    const now = Date.now();
    return (now - pausedAt) > CONFIG.PAUSE_EXPIRATION_TIME;
  }

  escapeHtml(text) {
    if (this.helpers) {
      return this.helpers.escapeHtml(text);
    }

    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  debounce(func, wait) {
    if (this.helpers) {
      return this.helpers.debounce(func, wait);
    }

    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  delay(ms) {
    if (this.helpers) {
      return this.helpers.delay(ms);
    }

    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup method to prevent memory leaks
  destroy() {
    if (this.feedbackManager) {
      this.feedbackManager = null;
    }

    if (this.linkListManager) {
      this.linkListManager = null;
    }

    if (this.pageUIManager) {
      this.pageUIManager = null;
    }

    if (this.downloadManager) {
      this.downloadManager = null;
    }

    if (this.selectionManager) {
      this.selectionManager = null;
    }

    if (this.storageManager) {
      this.storageManager.destroy();
      this.storageManager = null;
    }

    if (this.sizeComputeManager) {
      this.sizeComputeManager.destroy();
      this.sizeComputeManager = null;
    }

    if (this.originalLinksModal) {
      this.originalLinksModal.destroy();
      this.originalLinksModal = null;
    }

    if (this.mutationHandler) {
      this.mutationHandler.destroy();
      this.mutationHandler = null;
    }

    if (this.initRetryTimeout) {
      clearTimeout(this.initRetryTimeout);
      this.initRetryTimeout = null;
    }

    if (this.modalUI) {
      this.modalUI.destroy();
      this.modalUI = null;
    }

    if (this.inlineUI) {
      this.inlineUI.destroy();
      this.inlineUI = null;
    }

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('pagehide', this.handlePageHide);

    // Clear cached elements
    this.cachedElements = {};
    this.fileItems = [];
    this.checkboxElements = [];
    this.helpers = null;

    console.log('FitGirl Downloader: Cleaned up');
  }
}

// Initialize only if not already initialized
if (!window.fitGirlDownloaderInstance) {
  window.fitGirlDownloaderInstance = new FitGirlDownloader();
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (window.fitGirlDownloaderInstance) {
      window.fitGirlDownloaderInstance.destroy();
      window.fitGirlDownloaderInstance = null;
      window.fitGirlDownloaderInitialized = false;
    }
  });
}

})(); // End IIFE
} // End guard
