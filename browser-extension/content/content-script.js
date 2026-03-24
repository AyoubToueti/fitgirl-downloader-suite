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

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
const HelpersClass = typeof FitGirlDomHelpers === 'function' ? FitGirlDomHelpers : null;
const MutationHandlerClass = typeof FitGirlMutationHandler === 'function' ? FitGirlMutationHandler : null;
const OriginalLinksModalClass = typeof FitGirlOriginalLinksModal === 'function' ? FitGirlOriginalLinksModal : null;
const StorageManagerClass = typeof FitGirlStorageManager === 'function' ? FitGirlStorageManager : null;
const SelectionManagerClass = typeof FitGirlSelectionManager === 'function' ? FitGirlSelectionManager : null;

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
    if (mode === CONFIG.UI_MODES.INLINE) {
      return CONFIG.UI_MODES.INLINE;
    }
    return CONFIG.UI_MODES.MODAL;
  }

  isModalMode() {
    return this.uiMode === CONFIG.UI_MODES.MODAL;
  }

  async loadUIModePreference() {
    this.uiMode = this.normalizeUIMode(CONFIG.DEFAULT_UI_MODE);

    try {
      const response = await browserAPI.runtime.sendMessage({
        action: 'getStorage',
        keys: [CONFIG.STORAGE_KEYS.USER_PREFERENCES]
      });

      if (!response || !response.success) {
        return;
      }

      const prefs = response.data[CONFIG.STORAGE_KEYS.USER_PREFERENCES] || {};
      this.uiMode = this.normalizeUIMode(prefs.uiMode);
    } catch (error) {
      console.error('FitGirl Downloader: Failed to load ui mode preference', error);
      this.uiMode = this.normalizeUIMode(CONFIG.DEFAULT_UI_MODE);
    }
  }

  tryInitialize(attempt = 1) {
    console.log(`FitGirl Downloader: Initialization attempt ${attempt}`);

    if (this.initialized) {
      return;
    }

    if (this.isFitGirlPage()) {
      if (this.hasMainUI()) {
        this.initialized = true;
        return;
      }

      if (this.processFitGirlPage()) {
        this.initialized = true;
        if (this.initRetryTimeout) {
          clearTimeout(this.initRetryTimeout);
          this.initRetryTimeout = null;
        }
        console.log('FitGirl Downloader: Successfully initialized on FitGirl page');
      } else if (attempt < 5) {
        if (this.initRetryTimeout) {
          clearTimeout(this.initRetryTimeout);
        }
        this.initRetryTimeout = setTimeout(() => {
          this.initRetryTimeout = null;
          this.tryInitialize(attempt + 1);
        }, 1000 * attempt);
      }
    } else if (this.isFuckingFastPage()) {
      this.processFuckingFastPage();
      this.initialized = true;
      console.log('FitGirl Downloader: Successfully initialized on fuckingfast page');
    }
  }

  setupMutationObserver() {
    if (this.mutationHandler) {
      this.mutationHandler.setupMutationObserver();
      return;
    }
  }

  queueMutationProcessing(mutations) {
    if (this.mutationHandler) {
      this.mutationHandler.queueMutationProcessing(mutations);
    }
  }

  handleMutations(mutations) {
    if (this.mutationHandler) {
      this.mutationHandler.handleMutations(mutations);
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

      return this.hasMainUI();
    }

    if (this.inlineUI) {
      this.inlineUI.teardown();
    }

    if (downloadSection) {
      this.ensureFitGirlTriggerButton();
      return true;
    }

    if (this.modalUI && this.modalUI.hasTriggerButton()) {
      return true;
    }

    return false;
  }

  teardownModalPresentation() {
    if (this.modalUI) {
      this.modalUI.teardown();
    }
  }

  ensureInlineUI(downloadSection) {
    if (this.inlineUI) {
      this.inlineUI.ensureInlineUI(downloadSection);
      return;
    }

    const existingUI = this.getMainUIElement();
    if (existingUI) {
      if (existingUI.parentElement !== downloadSection) {
        downloadSection.insertBefore(existingUI, downloadSection.firstChild);
      }
      this.cacheElements();
      this.refreshCheckboxCache();
      this.updateCounter();
      this.updateToggleButton();
      this.setupLinkToggle();
      return;
    }

    this.createDownloadUI(downloadSection);
  }

  findDownloadSection() {
    // Try multiple selectors efficiently
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
        // Skip invalid selectors
        continue;
      }
    }
    return null;
  }

  async createDownloadUI(container) {
    if (!container) return;

    if (container.querySelector('.fg-download-ui') || this.hasMainUI()) {
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

    // Cache elements after insertion
    this.cacheElements();
    this.refreshCheckboxCache();

    await this.extractAndDisplayLinks();
    this.bindEventHandlers();
    this.setupLinkToggle();
  }

  ensureFitGirlTriggerButton() {
    if (this.modalUI) {
      this.modalUI.ensureTriggerButton();
    }
  }

  ensureExtensionModal() {
    if (this.modalUI) {
      this.modalUI.ensureModalContainer();
    }
  }

  async openExtensionUIModal() {
    if (this.modalUI) {
      await this.modalUI.open();
    }
  }

  closeExtensionUIModal() {
    if (this.modalUI) {
      this.modalUI.close();
      return;
    }

    document.body.classList.remove('fg-ui-modal-open');
  }

  cacheElements() {
    this.cachedElements = {
      fileList: document.querySelector('.fg-file-list'),
      startBtn: document.querySelector('.fg-start-btn'),
      stopBtn: document.querySelector('.fg-stop-btn'),
      toggleSelectBtn: document.querySelector('.fg-toggle-select'),
      resetBtn: document.querySelector('.fg-reset-selection'),
      toggleLinksBtn: document.querySelector('.fg-toggle-links'),
      counterText: document.querySelector('.fg-counter-text'),
      statusText: document.querySelector('.fg-status-text'),
      progressFill: document.querySelector('.fg-progress-fill'),
      progressText: document.querySelector('.fg-progress-text')
    };
  }

  async extractAndDisplayLinks() {
    const links = this.getAllDownloadLinks();
    const fileListContainer = this.cachedElements.fileList;

    if (!fileListContainer) return;

    const state = await this.loadPageState();
    const selections = state.selections || {};
    const skippedFiles = state.skipped || [];

    this.fileItems = [];

    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();

    links.forEach((link, index) => {
      const fileItem = this.createFileItem(link, index, selections, skippedFiles);
      fragment.appendChild(fileItem.element);
      this.fileItems.push(fileItem);
    });

    fileListContainer.appendChild(fragment);

    this.refreshCheckboxCache();

    this.updateCounter();
    this.updateToggleButton();

    // Delegate events instead of individual listeners
    this.delegateFileItemEvents();
  }

  createFileItem(link, index, selections, skippedFiles) {
    const fileItem = document.createElement('div');
    fileItem.className = 'fg-file-item';
    fileItem.dataset.url = link.url;
    fileItem.dataset.index = index;

    const isSkipped = skippedFiles.includes(link.url);
    const isSelected = selections[link.url] !== false;

    if (isSkipped) {
      fileItem.classList.add('fg-file-skipped');
    }

    fileItem.innerHTML = `
      <div class="fg-file-checkbox">
        <input type="checkbox" 
               class="fg-checkbox" 
               data-url="${link.url}" 
               ${isSelected ? 'checked' : ''}
               ${isSkipped ? 'disabled' : ''}>
      </div>
      <div class="fg-file-info">
        <div class="fg-file-name">${this.escapeHtml(this.getFilenameFromUrl(link.url))}</div>
        <div class="fg-file-url">${this.escapeHtml(link.url)}</div>
      </div>
      <div class="fg-file-status">
        ${isSkipped ? '<span class="fg-badge fg-badge-skipped">Skipped</span>' : ''}
      </div>
      <div class="fg-file-actions">
        ${isSkipped ?
        `<button class="fg-btn fg-btn-xs fg-undo-skip" data-url="${link.url}">↩️ Undo</button>` :
        `<button class="fg-btn fg-btn-xs fg-download-file" data-url="${link.url}">⬇️ Download</button>
         <button class="fg-btn fg-btn-xs fg-skip-file" data-url="${link.url}">⏭️ Skip</button>`
      }
      </div>
    `;

    return {
      element: fileItem,
      url: link.url,
      text: link.text,
      index: index,
      isSkipped: isSkipped
    };
  }

  delegateFileItemEvents() {
    const fileList = this.cachedElements.fileList;
    if (!fileList || fileList.dataset.fgDelegated === 'true') {
      return;
    }

    fileList.dataset.fgDelegated = 'true';

    // Single event listener for all checkboxes
    fileList.addEventListener('change', (e) => {
      if (e.target.classList.contains('fg-checkbox')) {
        this.refreshCheckboxCache();
        this.debouncedSaveSelections();
        this.debouncedUpdateCounter();
      }
    });

    // Single event listener for all buttons
    fileList.addEventListener('click', (e) => {
      const target = e.target;
      
      if (target.classList.contains('fg-download-file')) {
        e.stopPropagation();
        this.downloadSingleFile(target.dataset.url);
      } else if (target.classList.contains('fg-skip-file')) {
        e.stopPropagation();
        this.handleSkipFile(target.dataset.url);
      } else if (target.classList.contains('fg-undo-skip')) {
        e.stopPropagation();
        this.handleUndoSkip(target.dataset.url);
      } else if (target.classList.contains('fg-retry-file')) {
        e.stopPropagation();
        this.retryFile(target.dataset.url);
      }
    });

    // Single click handler for file items
    fileList.addEventListener('click', (e) => {
      const fileItem = e.target.closest('.fg-file-item');
      if (!fileItem) return;

      // Don't toggle if clicking buttons or checkboxes
      if (e.target.tagName === 'BUTTON' ||
          e.target.tagName === 'A' ||
          e.target.classList.contains('fg-checkbox') ||
          e.target.closest('button')) {
        return;
      }

      const checkbox = fileItem.querySelector('.fg-checkbox');
      if (checkbox && !checkbox.disabled) {
        checkbox.checked = !checkbox.checked;
        this.refreshCheckboxCache();
        this.debouncedSaveSelections();
        this.debouncedUpdateCounter();
      }
    });
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

  getAllDownloadLinks() {
    // Use Set for automatic deduplication
    const uniqueUrls = new Set();
    const links = [];

    // Single query, cached result
    const linkElements = document.querySelectorAll('a[href*="fuckingfast.co"]');

    for (const element of linkElements) {
      const url = element.href;
      if (url && !url.includes('optional') && !uniqueUrls.has(url)) {
        uniqueUrls.add(url);
        links.push({
          url: url,
          element: element,
          text: element.textContent.trim()
        });
      }
    }

    console.log(`FitGirl Downloader: Found ${links.length} download links`);
    return links;
  }

  bindEventHandlers() {
    const { startBtn, stopBtn, toggleSelectBtn, resetBtn, toggleLinksBtn } = this.cachedElements;

    if (startBtn && startBtn.dataset.fgBoundStart !== 'true') {
      startBtn.addEventListener('click', () => this.startBulkDownload());
      startBtn.dataset.fgBoundStart = 'true';
    }

    if (stopBtn && stopBtn.dataset.fgBoundStop !== 'true') {
      stopBtn.addEventListener('click', () => this.stopDownload());
      stopBtn.dataset.fgBoundStop = 'true';
    }

    if (toggleSelectBtn && toggleSelectBtn.dataset.fgBoundToggleSelect !== 'true') {
      toggleSelectBtn.addEventListener('click', () => this.toggleSelectAll());
      toggleSelectBtn.dataset.fgBoundToggleSelect = 'true';
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
  }

  setupLinkToggle() {
    if (!this.isModalMode()) {
      this.hideOriginalLinks();
    }
  }

  toggleOriginalLinks() {
    if (this.originalLinksModal) {
      this.originalLinksModal.toggleOriginalLinks();
    }
  }

  updateOriginalLinksButtonText() {
    if (this.originalLinksModal) {
      this.originalLinksModal.updateOriginalLinksButtonText();
    }
  }

  hideOriginalLinks() {
    if (this.originalLinksModal) {
      this.originalLinksModal.hideOriginalLinks();
    }
  }

  showOriginalLinks() {
    if (this.originalLinksModal) {
      this.originalLinksModal.showOriginalLinks();
    }
  }

  getOriginalDownloadLinks() {
    if (this.originalLinksModal) {
      return this.originalLinksModal.getOriginalDownloadLinks();
    }

    return [];
  }

  openOriginalLinksModal() {
    if (this.originalLinksModal) {
      this.originalLinksModal.openOriginalLinksModal();
    }
  }

  closeOriginalLinksModal() {
    if (this.originalLinksModal) {
      this.originalLinksModal.closeOriginalLinksModal();
    }
  }

  async downloadSingleFile(url) {
    if (this.isProcessing) {
      this.showNotification('⚠️ Busy', 'A download is already in progress');
      return;
    }

    this.isProcessing = true;

    const filename = this.getFilenameFromUrl(url);
    this.updateStatus(`📥 Downloading: ${filename}...`);
    this.setFileStatus(url, CONFIG.STATUS.PROCESSING);

    try {
      let downloadUrl = url;

      if (!downloadUrl.includes('/dl/')) {
        downloadUrl = await this.extractRealDownloadUrl(url);
      }

      if (downloadUrl) {
        await this.initiateDownload(downloadUrl, url);
        this.setFileStatus(url, CONFIG.STATUS.SUCCESS);
        this.updateStatus(`✅ Downloaded: ${filename}`);
        this.showNotification('✅ Success', `${filename} downloaded`);
      } else {
        throw new Error('Failed to extract download URL');
      }
    } catch (error) {
      console.error(`Download failed for ${url}:`, error);
      this.setFileStatus(url, CONFIG.STATUS.FAILED, error.message);
      this.updateStatus(`❌ Failed: ${filename}`);
      this.showNotification('❌ Error', error.message);
    } finally {
      this.isProcessing = false;
    }
  }

  async startBulkDownload(resumeFromIndex = null, resumeFiles = null) {
    if (this.isProcessing) {
      this.showNotification('⚠️ Busy', 'Download process already running');
      return;
    }

    const selectedFiles = resumeFiles || this.getSelectedFiles();

    if (selectedFiles.length === 0) {
      this.showNotification('❌ No Files', 'No files selected for download');
      return;
    }

    this.isProcessing = true;
    this.shouldStop = false;
    this.currentIndex = resumeFromIndex !== null ? resumeFromIndex : 0;

    const { startBtn, stopBtn } = this.cachedElements;
    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';

    this.updateStatus(`📥 Starting download of ${selectedFiles.length} files...`);

    let success = 0;
    let failures = 0;
    let consecutiveFailures = 0;

    // Get completed files once
    const completedResponse = await browserAPI.runtime.sendMessage({
      action: 'getStorage',
      keys: [CONFIG.STORAGE_KEYS.COMPLETED_URLS]
    });
    const completedUrls = new Set(completedResponse.success ? 
      completedResponse.data[CONFIG.STORAGE_KEYS.COMPLETED_URLS] || [] : []);

    for (let i = this.currentIndex; i < selectedFiles.length; i++) {
      if (this.shouldStop) {
        await this.savePauseState(i, selectedFiles);
        this.updateStatus('⏸️ Paused');
        this.showNotification('⏸️ Paused', 'Download paused. You can resume later.');
        break;
      }

      const file = selectedFiles[i];
      this.currentIndex = i;

      if (completedUrls.has(file.url)) {
        this.updateStatus(`[✓] Skipping already downloaded: ${this.getFilenameFromUrl(file.url)}`);
        this.setFileStatus(file.url, CONFIG.STATUS.COMPLETED);
        continue;
      }

      this.updateProgress(i + 1, selectedFiles.length);
      this.updateStatus(`[${i + 1}/${selectedFiles.length}] Processing: ${this.getFilenameFromUrl(file.url)}`);
      this.setFileStatus(file.url, CONFIG.STATUS.PROCESSING);

      try {
        let downloadUrl = file.url;

        if (!downloadUrl.includes('/dl/')) {
          downloadUrl = await this.extractRealDownloadUrl(file.url);
        }

        if (downloadUrl) {
          await this.initiateDownload(downloadUrl, file.url);
          this.setFileStatus(file.url, CONFIG.STATUS.SUCCESS);
          success++;
          consecutiveFailures = 0;
        } else {
          throw new Error('Failed to extract download URL');
        }
      } catch (error) {
        console.error(`Download failed for ${file.url}:`, error);
        this.setFileStatus(file.url, CONFIG.STATUS.FAILED, error.message);
        await this.logFailure(file.url, error.message);
        failures++;
        consecutiveFailures++;

        if (consecutiveFailures >= CONFIG.CONSECUTIVE_FAILURES_THRESHOLD) {
          this.updateStatus('⚠️ Too many consecutive failures. Pausing...');
          await this.savePauseState(i + 1, selectedFiles);
          this.showNotification('⚠️ Paused', `${consecutiveFailures} consecutive failures. Please check your connection.`);
          break;
        }
      }

      if (i < selectedFiles.length - 1) {
        await this.delay(CONFIG.WAIT_BETWEEN);
      }
    }

    this.isProcessing = false;

    const { startBtn: sb, stopBtn: stb } = this.cachedElements;
    sb.style.display = 'block';
    stb.style.display = 'none';

    if (!this.shouldStop) {
      await this.clearPauseState();
      this.updateStatus(`✅ Complete: ${success} successful, ${failures} failed`);
      this.showNotification('📊 Download Complete', 
        `Processed ${selectedFiles.length} files: ${success} successful, ${failures} failed`);
    }
  }

  stopDownload() {
    if (!this.isProcessing) return;
    
    this.shouldStop = true;
    this.updateStatus('⏹️ Stopping after current file...');
    
    const { stopBtn } = this.cachedElements;
    if (stopBtn) {
      stopBtn.disabled = true;
      stopBtn.textContent = '⏹️ Stopping...';
    }
  }

  getSelectedFiles() {
    if (this.selectionManager) {
      return this.selectionManager.getSelectedFiles();
    }

    return [];
  }

  async extractRealDownloadUrl(pageUrl) {
    try {
      const response = await browserAPI.runtime.sendMessage({
        action: 'extractDownloadUrl',
        url: pageUrl
      });

      if (response.success) {
        return response.downloadUrl;
      } else {
        throw new Error(response.error || 'Extraction failed');
      }
    } catch (error) {
      throw error;
    }
  }

  async initiateDownload(downloadUrl, originalUrl) {
    try {
      const filename = this.generateFilename(downloadUrl);

      const response = await browserAPI.runtime.sendMessage({
        action: 'download',
        url: downloadUrl,
        filename: filename
      });

      if (response.success) {
        await this.logSuccess(originalUrl);
      } else {
        throw new Error(response.error || 'Download failed');
      }
    } catch (error) {
      throw error;
    }
  }

  setFileStatus(url, status, errorMessage = '') {
    const fileItem = this.fileItems.find(item => item.url === url);
    if (!fileItem) return;

    const statusContainer = fileItem.element.querySelector('.fg-file-status');
    const actionsContainer = fileItem.element.querySelector('.fg-file-actions');

    if (!statusContainer || !actionsContainer) return;

    // Clear existing content
    statusContainer.innerHTML = '';
    actionsContainer.innerHTML = '';

    const badge = document.createElement('span');
    badge.className = `fg-badge fg-badge-${status}`;

    const statusIcons = {
      [CONFIG.STATUS.PROCESSING]: '⏳',
      [CONFIG.STATUS.SUCCESS]: '✅',
      [CONFIG.STATUS.FAILED]: '❌',
      [CONFIG.STATUS.COMPLETED]: '✓',
      [CONFIG.STATUS.RETRYING]: '🔄',
      [CONFIG.STATUS.SKIPPED]: '⏭️'
    };

    const statusTexts = {
      [CONFIG.STATUS.PROCESSING]: 'Processing',
      [CONFIG.STATUS.SUCCESS]: 'Success',
      [CONFIG.STATUS.FAILED]: 'Failed',
      [CONFIG.STATUS.COMPLETED]: 'Completed',
      [CONFIG.STATUS.RETRYING]: 'Retrying',
      [CONFIG.STATUS.SKIPPED]: 'Skipped'
    };

    badge.textContent = `${statusIcons[status]} ${statusTexts[status]}`;

    if (errorMessage) {
      badge.title = errorMessage;
    }

    statusContainer.appendChild(badge);

    if (status === CONFIG.STATUS.FAILED) {
      const retryBtn = document.createElement('button');
      retryBtn.className = 'fg-btn fg-btn-xs fg-retry-file';
      retryBtn.textContent = '🔄 Retry';
      retryBtn.dataset.url = url;
      actionsContainer.appendChild(retryBtn);
    }
  }

  async retryFile(url) {
    const fileItem = this.fileItems.find(item => item.url === url);
    if (!fileItem) return;

    this.setFileStatus(url, CONFIG.STATUS.RETRYING);
    this.updateStatus(`🔄 Retrying: ${this.getFilenameFromUrl(url)}`);

    try {
      let downloadUrl = url;

      if (!downloadUrl.includes('/dl/')) {
        downloadUrl = await this.extractRealDownloadUrl(url);
      }

      if (downloadUrl) {
        await this.initiateDownload(downloadUrl, url);
        this.setFileStatus(url, CONFIG.STATUS.SUCCESS);
        this.showNotification('✅ Retry Successful', 'File downloaded successfully');
      } else {
        throw new Error('Could not extract download URL');
      }
    } catch (error) {
      console.error(`Retry failed for ${url}:`, error);
      this.setFileStatus(url, CONFIG.STATUS.FAILED, error.message);
      this.showNotification('❌ Retry Failed', error.message);
    }
  }

  async handleSkipFile(url) {
    if (this.selectionManager) {
      await this.selectionManager.handleSkipFile(url);
    }
  }

  async handleUndoSkip(url) {
    if (this.selectionManager) {
      await this.selectionManager.handleUndoSkip(url);
    }
  }

  selectAll() {
    if (this.selectionManager) {
      this.selectionManager.selectAll();
    }
  }

  deselectAll() {
    if (this.selectionManager) {
      this.selectionManager.deselectAll();
    }
  }

  toggleSelectAll() {
    if (this.selectionManager) {
      this.selectionManager.toggleSelectAll();
    }
  }

  updateToggleButton() {
    if (this.selectionManager) {
      this.selectionManager.updateToggleButton();
    }
  }

  async resetSelection() {
    if (this.selectionManager) {
      await this.selectionManager.resetSelection();
    }
  }

  updateCounter() {
    const counterText = this.cachedElements.counterText;
    if (!counterText) return;

    this.refreshCheckboxCache();
    const total = this.fileItems.length;
    const skipped = this.fileItems.filter(item => item.isSkipped).length;
    const { checkedTotal } = this.getCheckboxStats();

    counterText.textContent = `${checkedTotal} of ${total} files selected (${skipped} skipped)`;
  }

  updateProgress(current, total) {
    const { progressFill, progressText } = this.cachedElements;
    const percentage = Math.round((current / total) * 100);

    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }

    if (progressText) {
      progressText.textContent = `${current} / ${total} files (${percentage}%)`;
    }
  }

  updateStatus(message) {
    const { statusText } = this.cachedElements;
    if (statusText) {
      statusText.textContent = message;
    }
  }

  async saveSelections() {
    if (this.storageManager) {
      await this.storageManager.saveSelections();
    }
  }

  async saveSkippedFiles() {
    if (this.storageManager) {
      await this.storageManager.saveSkippedFiles();
    }
  }

  queueStorageWrite(key, value) {
    if (this.storageManager) {
      this.storageManager.queueStorageWrite(key, value);
    }
  }

  async flushPendingStorageWrites(force = false) {
    if (this.storageManager) {
      await this.storageManager.flushPendingStorageWrites(force);
    }
  }

  async loadPageState() {
    if (this.storageManager) {
      return this.storageManager.loadPageState();
    }

    return { selections: {}, skipped: [] };
  }

  async savePageState(state) {
    if (this.storageManager) {
      await this.storageManager.savePageState(state);
    }
  }

  async savePauseState(currentIndex, files) {
    if (this.storageManager) {
      await this.storageManager.savePauseState(currentIndex, files);
    }
  }

  async clearPauseState() {
    if (this.storageManager) {
      await this.storageManager.clearPauseState();
    }
  }

  async checkPauseState() {
    if (this.storageManager) {
      await this.storageManager.checkPauseState();
    }
  }

  showResumeOption(pauseState) {
    if (this.storageManager) {
      this.storageManager.showResumeOption(pauseState);
    }
  }

  processFuckingFastPage() {
    console.log('FitGirl Downloader: Processing fuckingfast.co page');

    if (this.currentPage.includes('/dl/')) {
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
      this.initiateDownload(window.location.href, window.location.href);
    });
    document.body.appendChild(button);
  }

  addExtractButton() {
    const button = document.createElement('button');
    button.className = 'fg-float-btn';
    button.innerHTML = '🔍 Extract & Download';
    button.addEventListener('click', async () => {
      try {
        const downloadUrl = await this.extractRealDownloadUrl(window.location.href);
        if (downloadUrl) {
          await this.initiateDownload(downloadUrl, window.location.href);
        }
      } catch (error) {
        this.showNotification('❌ Error', error.message);
      }
    });
    document.body.appendChild(button);
  }

  async logSuccess(url) {
    try {
      await browserAPI.runtime.sendMessage({
        action: 'updateStats',
        type: 'success',
        url: url
      });
    } catch (error) {
      console.error('Error logging success:', error);
    }
  }

  async logFailure(url, error) {
    try {
      await browserAPI.runtime.sendMessage({
        action: 'updateStats',
        type: 'failure',
        url: url,
        error: error
      });
    } catch (error) {
      console.error('Error logging failure:', error);
    }
  }

  async showNotification(title, message) {
    try {
      await browserAPI.runtime.sendMessage({
        action: 'showNotification',
        title: title,
        message: message
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
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
    if (this.selectionManager) {
      this.selectionManager = null;
    }

    if (this.storageManager) {
      this.storageManager.destroy();
      this.storageManager = null;
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
