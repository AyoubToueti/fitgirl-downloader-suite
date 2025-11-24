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

class FitGirlDownloader {
  constructor() {
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
    
    // Batch storage operations
    this.pendingStorageWrites = {};
    this.storageWriteTimeout = null;
    
    // MutationObserver reference for cleanup
    this.observer = null;
    
    console.log('FitGirl Downloader: Initializing on', this.currentPage);
    this.init();
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
    await this.checkPauseState();
    this.tryInitialize();
    this.setupMutationObserver();
  }

  tryInitialize(attempt = 1) {
    console.log(`FitGirl Downloader: Initialization attempt ${attempt}`);

    if (this.isFitGirlPage()) {
      if (this.processFitGirlPage()) {
        this.initialized = true;
        console.log('FitGirl Downloader: Successfully initialized on FitGirl page');
      } else if (attempt < 5) {
        setTimeout(() => this.tryInitialize(attempt + 1), 1000 * attempt);
      }
    } else if (this.isFuckingFastPage()) {
      this.processFuckingFastPage();
      this.initialized = true;
      console.log('FitGirl Downloader: Successfully initialized on fuckingfast page');
    }
  }

  setupMutationObserver() {
    // Disconnect existing observer to prevent duplicates
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      if (!this.initialized) {
        this.tryInitialize();
        return;
      }

      // Use requestIdleCallback for non-critical work
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => this.handleMutations(mutations));
      } else {
        setTimeout(() => this.handleMutations(mutations), 0);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  handleMutations(mutations) {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          if (node.querySelector && (
            node.querySelector('a[href*="fuckingfast.co"]') ||
            node.textContent.includes('Download links') ||
            node.id === 'plaintext'
          )) {
            console.log('FitGirl Downloader: New download content detected');
            this.tryInitialize();
            return; // Exit early
          }
        }
      }
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
    if (downloadSection) {
      this.createDownloadUI(downloadSection);
      return true;
    }
    return false;
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
    const uiContainer = document.createElement('div');
    uiContainer.className = 'fg-download-ui';
    uiContainer.innerHTML = `
      <div class="fg-header">
        <h3 class="fg-title">🎮 FitGirl Downloader</h3>
      </div>
      
      <div class="fg-controls">
        <div class="fg-control-group">
          <button class="fg-btn fg-btn-primary fg-start-btn">
            🚀 Start Download
          </button>
          <button class="fg-btn fg-btn-danger fg-stop-btn" style="display: none;">
            ⏹️ Stop
          </button>
        </div>
        
        <div class="fg-selection-controls">
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

    container.insertBefore(uiContainer, container.firstChild);

    // Cache elements after insertion
    this.cacheElements();

    await this.extractAndDisplayLinks();
    this.bindEventHandlers();
  }

  cacheElements() {
    this.cachedElements = {
      fileList: document.querySelector('.fg-file-list'),
      startBtn: document.querySelector('.fg-start-btn'),
      stopBtn: document.querySelector('.fg-stop-btn'),
      toggleSelectBtn: document.querySelector('.fg-toggle-select'),
      resetBtn: document.querySelector('.fg-reset-selection'),
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
        <div class="fg-file-name">${this.escapeHtml(link.text || this.getFilenameFromUrl(link.url))}</div>
        <div class="fg-file-url">${this.escapeHtml(link.url)}</div>
      </div>
      <div class="fg-file-status">
        ${isSkipped ? '<span class="fg-badge fg-badge-skipped">Skipped</span>' : ''}
      </div>
      <div class="fg-file-actions">
        ${isSkipped ?
        `<button class="fg-btn fg-btn-xs fg-undo-skip" data-url="${link.url}">↩️ Undo</button>` :
        `<button class="fg-btn fg-btn-xs fg-skip-file" data-url="${link.url}">⏭️ Skip</button>`
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

    // Single event listener for all checkboxes
    fileList.addEventListener('change', (e) => {
      if (e.target.classList.contains('fg-checkbox')) {
        this.debouncedSaveSelections();
        this.debouncedUpdateCounter();
      }
    });

    // Single event listener for all buttons
    fileList.addEventListener('click', (e) => {
      const target = e.target;
      
      if (target.classList.contains('fg-skip-file')) {
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
        this.debouncedSaveSelections();
        this.debouncedUpdateCounter();
      }
    });
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
    const { startBtn, stopBtn, toggleSelectBtn, resetBtn } = this.cachedElements;

    if (startBtn) {
      startBtn.addEventListener('click', () => this.startBulkDownload());
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stopDownload());
    }

    if (toggleSelectBtn) {
      toggleSelectBtn.addEventListener('click', () => this.toggleSelectAll());
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetSelection());
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
    return this.fileItems.filter(item => {
      if (item.isSkipped) return false;
      const checkbox = item.element.querySelector('.fg-checkbox');
      return checkbox && checkbox.checked;
    });
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
    const fileItem = this.fileItems.find(item => item.url === url);
    if (!fileItem) return;

    fileItem.isSkipped = true;
    fileItem.element.classList.add('fg-file-skipped');

    const checkbox = fileItem.element.querySelector('.fg-checkbox');
    if (checkbox) {
      checkbox.disabled = true;
      checkbox.checked = false;
    }

    const statusContainer = fileItem.element.querySelector('.fg-file-status');
    statusContainer.innerHTML = '<span class="fg-badge fg-badge-skipped">Skipped</span>';

    const actionsContainer = fileItem.element.querySelector('.fg-file-actions');
    actionsContainer.innerHTML = `<button class="fg-btn fg-btn-xs fg-undo-skip" data-url="${url}">↩️ Undo</button>`;

    await this.saveSkippedFiles();
    this.updateCounter();
    this.showNotification('⏭️ Skipped', 'File marked as skipped');
  }

  async handleUndoSkip(url) {
    const fileItem = this.fileItems.find(item => item.url === url);
    if (!fileItem) return;

    fileItem.isSkipped = false;
    fileItem.element.classList.remove('fg-file-skipped');

    const checkbox = fileItem.element.querySelector('.fg-checkbox');
    if (checkbox) {
      checkbox.disabled = false;
      checkbox.checked = true;
    }

    const statusContainer = fileItem.element.querySelector('.fg-file-status');
    statusContainer.innerHTML = '';

    const actionsContainer = fileItem.element.querySelector('.fg-file-actions');
    actionsContainer.innerHTML = `<button class="fg-btn fg-btn-xs fg-skip-file" data-url="${url}">⏭️ Skip</button>`;

    await this.saveSkippedFiles();
    this.debouncedSaveSelections();
    this.updateCounter();
    this.showNotification('↩️ Restored', 'File restored to selection');
  }

  selectAll() {
    const checkboxes = document.querySelectorAll('.fg-checkbox:not(:disabled)');
    checkboxes.forEach(cb => cb.checked = true);
    this.debouncedSaveSelections();
    this.updateCounter();
  }

  deselectAll() {
    const checkboxes = document.querySelectorAll('.fg-checkbox:not(:disabled)');
    checkboxes.forEach(cb => cb.checked = false);
    this.debouncedSaveSelections();
    this.updateCounter();
  }

  toggleSelectAll() {
    const checkboxes = document.querySelectorAll('.fg-checkbox:not(:disabled)');
    const checkedCount = document.querySelectorAll('.fg-checkbox:not(:disabled):checked').length;
    const shouldSelectAll = checkedCount < checkboxes.length / 2;

    checkboxes.forEach(cb => cb.checked = shouldSelectAll);

    this.debouncedSaveSelections();
    this.updateCounter();
    this.updateToggleButton();
  }

  updateToggleButton() {
    const toggleBtn = this.cachedElements.toggleSelectBtn;
    if (!toggleBtn) return;

    const checkboxes = document.querySelectorAll('.fg-checkbox:not(:disabled)');
    const checkedCount = document.querySelectorAll('.fg-checkbox:not(:disabled):checked').length;

    if (checkedCount === 0) {
      toggleBtn.textContent = '☑️ Select All';
    } else if (checkedCount === checkboxes.length) {
      toggleBtn.textContent = '☐ Deselect All';
    } else {
      toggleBtn.textContent = '☑️ Select All';
    }
  }

  async resetSelection() {
    const state = await this.loadPageState();
    state.selections = {};
    await this.savePageState(state);

    const checkboxes = document.querySelectorAll('.fg-checkbox:not(:disabled)');
    checkboxes.forEach(cb => cb.checked = true);

    this.updateCounter();
    this.showNotification('🔄 Reset', 'Selections reset to default');
  }

  updateCounter() {
    const counterText = this.cachedElements.counterText;
    if (!counterText) return;

    const total = this.fileItems.length;
    const skipped = this.fileItems.filter(item => item.isSkipped).length;
    const selected = document.querySelectorAll('.fg-checkbox:checked').length;

    counterText.textContent = `${selected} of ${total} files selected (${skipped} skipped)`;
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
    const selections = {};

    document.querySelectorAll('.fg-checkbox').forEach(checkbox => {
      selections[checkbox.dataset.url] = checkbox.checked;
    });

    const state = await this.loadPageState();
    state.selections = selections;
    
    // Batch write
    this.queueStorageWrite(this.pageHash, state);

    this.updateCounter();
    this.updateToggleButton();
  }

  async saveSkippedFiles() {
    const skipped = this.fileItems
      .filter(item => item.isSkipped)
      .map(item => item.url);

    const state = await this.loadPageState();
    state.skipped = skipped;
    
    // Batch write
    this.queueStorageWrite(this.pageHash, state);
  }

  queueStorageWrite(key, value) {
    // Queue the write
    this.pendingStorageWrites[`page_state_${key}`] = value;

    // Clear existing timeout
    if (this.storageWriteTimeout) {
      clearTimeout(this.storageWriteTimeout);
    }

    // Batch writes after 1 second of inactivity
    this.storageWriteTimeout = setTimeout(async () => {
      const writes = { ...this.pendingStorageWrites };
      this.pendingStorageWrites = {};

      try {
        await browserAPI.runtime.sendMessage({
          action: 'setStorage',
          data: writes
        });
      } catch (error) {
        console.error('Error in batch storage write:', error);
      }
    }, 1000);
  }

  async loadPageState() {
    const storageKey = `page_state_${this.pageHash}`;

    try {
      const response = await browserAPI.runtime.sendMessage({
        action: 'getStorage',
        keys: [storageKey]
      });

      if (response.success) {
        return response.data[storageKey] || { selections: {}, skipped: [] };
      }
    } catch (error) {
      console.error('Error loading page state:', error);
    }

    return { selections: {}, skipped: [] };
  }

  async savePageState(state) {
    this.queueStorageWrite(this.pageHash, state);
  }

  async savePauseState(currentIndex, files) {
    // Store minimal data - only URLs, not full file objects
    const fileUrls = files.map(f => f.url);
    
    const pauseState = {
      isPaused: true,
      pausedAt: Date.now(),
      pageUrl: this.currentPage,
      pageHash: this.pageHash,
      currentIndex: currentIndex,
      totalFiles: files.length,
      fileUrls: fileUrls  // Store only URLs
    };

    try {
      await browserAPI.runtime.sendMessage({
        action: 'setStorage',
        data: { [CONFIG.STORAGE_KEYS.PAUSE_STATE]: pauseState }
      });
    } catch (error) {
      console.error('Error saving pause state:', error);
    }
  }

  async clearPauseState() {
    try {
      await browserAPI.runtime.sendMessage({
        action: 'setStorage',
        data: { [CONFIG.STORAGE_KEYS.PAUSE_STATE]: null }
      });
    } catch (error) {
      console.error('Error clearing pause state:', error);
    }
  }

  async checkPauseState() {
    try {
      const response = await browserAPI.runtime.sendMessage({
        action: 'getStorage',
        keys: [CONFIG.STORAGE_KEYS.PAUSE_STATE]
      });

      if (!response.success) return;

      const pauseState = response.data[CONFIG.STORAGE_KEYS.PAUSE_STATE];

      if (pauseState && pauseState.isPaused) {
        if (this.isPauseExpired(pauseState.pausedAt)) {
          await this.clearPauseState();
          return;
        }

        if (pauseState.pageHash === this.pageHash) {
          this.showResumeOption(pauseState);
        }
      }
    } catch (error) {
      console.error('Error checking pause state:', error);
    }
  }

  showResumeOption(pauseState) {
    const banner = document.createElement('div');
    banner.className = 'fg-resume-banner';
    banner.innerHTML = `
      <div class="fg-resume-content">
        <div class="fg-resume-icon">⏸️</div>
        <div class="fg-resume-info">
          <strong>Download Paused</strong>
          <p>Resume from file ${pauseState.currentIndex + 1} of ${pauseState.totalFiles} 
             (${this.formatTimestamp(pauseState.pausedAt)})</p>
        </div>
        <div class="fg-resume-actions">
          <button class="fg-btn fg-btn-primary fg-resume-btn">▶️ Resume</button>
          <button class="fg-btn fg-btn-secondary fg-discard-btn">❌ Discard</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    banner.querySelector('.fg-resume-btn').addEventListener('click', async () => {
      banner.remove();
      
      // Reconstruct file objects from URLs
      const resumeFiles = pauseState.fileUrls.map(url => {
        const item = this.fileItems.find(f => f.url === url);
        return item || { url: url, text: this.getFilenameFromUrl(url) };
      });
      
      await this.startBulkDownload(pauseState.currentIndex, resumeFiles);
    });

    banner.querySelector('.fg-discard-btn').addEventListener('click', async () => {
      banner.remove();
      await this.clearPauseState();
    });
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
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  getFilenameFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const segments = pathname.split('/').filter(s => s);
      return segments[segments.length - 1] || 'unknown';
    } catch (error) {
      const match = url.match(/([^\/#]+)(?=#|$)/);
      return match ? match[1] : 'unknown';
    }
  }

  generateFilename(url) {
    const timestamp = Date.now();
    const baseName = this.getFilenameFromUrl(url);
    return `fitgirl_${baseName}_${timestamp}`;
  }

  formatTimestamp(timestamp) {
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
    const now = Date.now();
    return (now - pausedAt) > CONFIG.PAUSE_EXPIRATION_TIME;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  debounce(func, wait) {
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
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup method to prevent memory leaks
  destroy() {
    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Clear timeouts
    if (this.storageWriteTimeout) {
      clearTimeout(this.storageWriteTimeout);
    }

    // Clear cached elements
    this.cachedElements = {};
    this.fileItems = [];

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
