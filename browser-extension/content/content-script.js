console.log('FitGirl Downloader: Content script loaded on', window.location.href);

class FitGirlDownloader {
  constructor() {
    this.currentPage = window.location.href;
    this.pageHash = this.hashString(this.currentPage);
    this.isProcessing = false;
    this.shouldStop = false;
    this.initialized = false;
    this.fileItems = [];
    this.currentIndex = 0;

    console.log('FitGirl Downloader: Initializing on', this.currentPage);
    this.init();
  }

  async init() {

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start());
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
    const observer = new MutationObserver((mutations) => {
      if (!this.initialized) {
        this.tryInitialize();
      }

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (node.querySelector && (
              node.querySelector('a[href*="fuckingfast.co"]') ||
              node.textContent.includes('Download links') ||
              node.id === 'plaintext'
            )) {
              console.log('FitGirl Downloader: New download content detected');
              this.tryInitialize();
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
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
      console.log('FitGirl Downloader: Found download section');
      this.createDownloadUI(downloadSection);
      return true;
    }

    return false;
  }

  findDownloadSection() {

    let section = document.getElementById('plaintext');
    if (section) return section;


    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (const heading of headings) {
      if (heading.textContent.toLowerCase().includes('download link')) {
        let container = heading.parentElement;
        for (let i = 0; i < 3; i++) {
          const lists = container.querySelectorAll('ul, ol');
          if (lists.length > 0) {
            return container;
          }
          container = container.parentElement;
          if (!container) break;
        }
        return heading.parentElement;
      }
    }


    const links = document.querySelectorAll('a[href*="fuckingfast.co"]');
    if (links.length > 0) {
      return links[0].closest('div, section, article') || document.body;
    }

    return null;
  }

  async createDownloadUI(container) {

    if (document.querySelector('.fg-download-ui')) {
      console.log('FitGirl Downloader: UI already exists, skipping creation');
      return;
    }


    const uiContainer = document.createElement('div');
    uiContainer.className = 'fg-download-ui';
    uiContainer.innerHTML = `
      <div class="fg-header">
        <h3>🎮 FitGirl Downloader</h3>
        <div class="fg-progress-container">
          <div class="fg-progress-bar">
            <div class="fg-progress-fill" style="width: 0%"></div>
          </div>
          <div class="fg-progress-text">0 / 0 files</div>
        </div>
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


    await this.extractAndDisplayLinks();


    this.bindEventHandlers();
  }

  async extractAndDisplayLinks() {
    const links = this.getAllDownloadLinks();
    const fileListContainer = document.querySelector('.fg-file-list');

    if (!fileListContainer) return;


    const state = await this.loadPageState();
    const selections = state.selections || {};
    const skippedFiles = state.skipped || [];

    this.fileItems = [];

    links.forEach((link, index) => {
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
          <div class="fg-file-name">${link.text || this.getFilenameFromUrl(link.url)}</div>
          <div class="fg-file-url">${link.url}</div>
        </div>
        <div class="fg-file-status">
          ${isSkipped ? '<span class="fg-badge fg-badge-skipped">Skipped</span>' : ''}
        </div>
        <div class="fg-file-actions">
          ${isSkipped ?
          '<button class="fg-btn fg-btn-xs fg-undo-skip" data-url="' + link.url + '">↩️ Undo</button>' :
          '<button class="fg-btn fg-btn-xs fg-skip-file" data-url="' + link.url + '">⏭️ Skip</button>'
        }
        </div>
      `;

      fileListContainer.appendChild(fileItem);
      this.fileItems.push({
        element: fileItem,
        url: link.url,
        text: link.text,
        index: index,
        isSkipped: isSkipped
      });
    });


    this.updateCounter();
    this.updateToggleButton();


    document.querySelectorAll('.fg-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', () => this.saveSelections());
    });


    document.querySelectorAll('.fg-skip-file').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleSkipFile(e.target.dataset.url);
      });
    });

    document.querySelectorAll('.fg-undo-skip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleUndoSkip(e.target.dataset.url);
      });
    });


    document.querySelectorAll('.fg-file-item').forEach(fileItem => {
      fileItem.addEventListener('click', (e) => {

        if (e.target.tagName === 'BUTTON' ||
          e.target.tagName === 'A' ||
          e.target.classList.contains('fg-checkbox') ||
          e.target.closest('button')) {
          return;
        }


        const checkbox = fileItem.querySelector('.fg-checkbox');
        if (checkbox && !checkbox.disabled) {
          checkbox.checked = !checkbox.checked;
          this.saveSelections();
          this.updateCounter();
        }
      });


      if (!fileItem.classList.contains('fg-file-skipped')) {
        fileItem.style.cursor = 'pointer';
      }
    });
  }

  getAllDownloadLinks() {
    const links = [];
    const linkElements = document.querySelectorAll('a[href*="fuckingfast.co"]');

    for (const element of linkElements) {
      const url = element.href;

      if (url && !url.includes('optional') && !links.find(l => l.url === url)) {
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

    const startBtn = document.querySelector('.fg-start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startBulkDownload());
    }


    const stopBtn = document.querySelector('.fg-stop-btn');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stopDownload());
    }



    document.querySelector('.fg-toggle-select')?.addEventListener('click', () => this.toggleSelectAll());
    document.querySelector('.fg-reset-selection')?.addEventListener('click', () => this.resetSelection());
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


    document.querySelector('.fg-start-btn').style.display = 'none';
    document.querySelector('.fg-stop-btn').style.display = 'block';

    this.updateStatus(`📥 Starting download of ${selectedFiles.length} files...`);

    let success = 0;
    let failures = 0;
    let consecutiveFailures = 0;
    
    // Get completed files to skip on resume
    const completedResponse = await browserAPI.runtime.sendMessage({
      action: 'getStorage',
      keys: [CONFIG.STORAGE_KEYS.COMPLETED_URLS]
    });
    const completedUrls = new Set(completedResponse.success ? completedResponse.data[CONFIG.STORAGE_KEYS.COMPLETED_URLS] || [] : []);

    for (let i = this.currentIndex; i < selectedFiles.length; i++) {
      if (this.shouldStop) {
        await this.savePauseState(i, selectedFiles);
        this.updateStatus('⏸️ Paused');
        this.showNotification('⏸️ Paused', 'Download paused. You can resume later.');
        break;
      }

      const file = selectedFiles[i];
      this.currentIndex = i;
      
      // Skip if already completed
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
          throw new Error('Could not extract download URL');
        }
      } catch (error) {
        console.error(`Failed to process ${file.url}:`, error);
        this.setFileStatus(file.url, CONFIG.STATUS.FAILED, error.message);
        await this.logFailure(file.url, error.message);
        failures++;
        consecutiveFailures++;
      }

      if (consecutiveFailures >= CONFIG.CONSECUTIVE_FAILURES_THRESHOLD) {
        this.showNotification('⚠️ Warning', 'Multiple consecutive failures detected. Pausing...');
        const shouldContinue = confirm(`Multiple failures detected. Continue with remaining ${selectedFiles.length - i - 1} files?`);
        if (!shouldContinue) {
          this.shouldStop = true;
          continue;
        }
        consecutiveFailures = 0;
      }

      if (i < selectedFiles.length - 1 && !this.shouldStop) {
        await this.delay(CONFIG.WAIT_BETWEEN);
      }
    }

    this.isProcessing = false;


    document.querySelector('.fg-start-btn').style.display = 'block';
    document.querySelector('.fg-stop-btn').style.display = 'none';

    if (!this.shouldStop) {

      await this.clearPauseState();
      this.updateStatus(`✅ Complete: ${success} successful, ${failures} failed`);
      this.showNotification('📊 Download Complete', `Processed ${selectedFiles.length} files: ${success} successful, ${failures} failed`);
    }
  }

  stopDownload() {
    if (!this.isProcessing) return;

    this.shouldStop = true;
    this.updateStatus('⏹️ Stopping after current file...');

    const stopBtn = document.querySelector('.fg-stop-btn');
    if (stopBtn) {
      stopBtn.disabled = true;
      stopBtn.textContent = '⏳ Stopping...';
    }
  }

  getSelectedFiles() {
    const selectedFiles = [];

    this.fileItems.forEach(item => {
      if (item.isSkipped) return;

      const checkbox = item.element.querySelector('.fg-checkbox');
      if (checkbox && checkbox.checked) {
        selectedFiles.push(item);
      }
    });

    return selectedFiles;
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


    statusContainer.innerHTML = '';


    const badge = document.createElement('span');
    badge.className = `fg-badge fg-badge-${status}`;

    const statusIcons = {
      [CONFIG.STATUS.PROCESSING]: '⏳',
      [CONFIG.STATUS.SUCCESS]: '✅',
      [CONFIG.STATUS.FAILED]: '❌',
      [CONFIG.STATUS.RETRYING]: '🔄',
      [CONFIG.STATUS.SKIPPED]: '⏭️'
    };

    const statusTexts = {
      [CONFIG.STATUS.PROCESSING]: 'Processing',
      [CONFIG.STATUS.SUCCESS]: 'Success',
      [CONFIG.STATUS.FAILED]: 'Failed',
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
      retryBtn.addEventListener('click', () => this.retryFile(url));
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

    actionsContainer.querySelector('.fg-undo-skip').addEventListener('click', () => this.handleUndoSkip(url));

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

    actionsContainer.querySelector('.fg-skip-file').addEventListener('click', () => this.handleSkipFile(url));

    await this.saveSkippedFiles();
    this.updateCounter();
    this.showNotification('↩️ Undo Skip', 'File restored to download list');
  }

  selectAll() {
    document.querySelectorAll('.fg-checkbox:not(:disabled)').forEach(cb => {
      cb.checked = true;
    });
    this.saveSelections();
    this.updateCounter();
  }

  deselectAll() {
    document.querySelectorAll('.fg-checkbox:not(:disabled)').forEach(cb => {
      cb.checked = false;
    });
    this.saveSelections();
    this.updateCounter();
  }

  toggleSelectAll() {
    const checkboxes = document.querySelectorAll('.fg-checkbox:not(:disabled)');
    const checkedCount = document.querySelectorAll('.fg-checkbox:not(:disabled):checked').length;
    const totalCount = checkboxes.length;
    
    // If more than half are checked, deselect all. Otherwise, select all.
    const shouldSelectAll = checkedCount < totalCount / 2;
    
    checkboxes.forEach(cb => {
      cb.checked = shouldSelectAll;
    });
    
    this.saveSelections();
    this.updateCounter();
    this.updateToggleButton();
  }

  updateToggleButton() {
    const toggleBtn = document.querySelector('.fg-toggle-select');
    if (!toggleBtn) return;
    
    const checkboxes = document.querySelectorAll('.fg-checkbox:not(:disabled)');
    const checkedCount = document.querySelectorAll('.fg-checkbox:not(:disabled):checked').length;
    const totalCount = checkboxes.length;
    
    if (checkedCount === 0) {
      // None selected - show "Select All"
      toggleBtn.innerHTML = '☑️ Select All';
      toggleBtn.classList.remove('fg-btn-secondary');
    } else if (checkedCount === totalCount) {
      // All selected - show "Deselect All"
      toggleBtn.innerHTML = '☐ Deselect All';
      toggleBtn.classList.add('fg-btn-secondary');
    } else {
      // Some selected - show "Select All"
      toggleBtn.innerHTML = `☑️ Select All (${checkedCount}/${totalCount})`;
      toggleBtn.classList.remove('fg-btn-secondary');
    }
  }

  async resetSelection() {

    const state = await this.loadPageState();
    state.selections = {};
    await this.savePageState(state);

    document.querySelectorAll('.fg-checkbox:not(:disabled)').forEach(cb => {
      cb.checked = true;
    });

    this.updateCounter();
    this.showNotification('🔄 Reset', 'Selections reset to default');
  }

  updateCounter() {
    const total = this.fileItems.length;
    const skipped = this.fileItems.filter(item => item.isSkipped).length;
    const selected = document.querySelectorAll('.fg-checkbox:checked').length;

    const counterText = document.querySelector('.fg-counter-text');
    if (counterText) {
      counterText.textContent = `${selected} of ${total} files selected (${skipped} skipped)`;
    }
  }

  updateProgress(current, total) {
    const percentage = Math.round((current / total) * 100);

    const progressFill = document.querySelector('.fg-progress-fill');
    const progressText = document.querySelector('.fg-progress-text');

    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }

    if (progressText) {
      progressText.textContent = `${current} / ${total} files (${percentage}%)`;
    }
  }

  updateStatus(message) {
    const statusText = document.querySelector('.fg-status-text');
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
    await this.savePageState(state);
    
    this.updateCounter();
    this.updateToggleButton(); // Update button text
  }

  async saveSkippedFiles() {
    const skipped = this.fileItems
      .filter(item => item.isSkipped)
      .map(item => item.url);

    const state = await this.loadPageState();
    state.skipped = skipped;
    await this.savePageState(state);
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
    const storageKey = `page_state_${this.pageHash}`;

    try {
      await browserAPI.runtime.sendMessage({
        action: 'setStorage',
        data: { [storageKey]: state }
      });
    } catch (error) {
      console.error('Error saving page state:', error);
    }
  }

  async savePauseState(currentIndex, files) {
    const pauseState = {
      isPaused: true,
      pausedAt: Date.now(),
      pageUrl: this.currentPage,
      pageHash: this.pageHash,
      currentIndex: currentIndex,
      totalFiles: files.length,
      files: files  // Save full file array for resume
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

      if (response.success) {
        const pauseState = response.data[CONFIG.STORAGE_KEYS.PAUSE_STATE];

        if (pauseState && pauseState.isPaused && pauseState.pageHash === this.pageHash) {

          if (this.isPauseExpired(pauseState.pausedAt)) {
            await this.clearPauseState();
            return;
          }


          this.showResumeOption(pauseState);
        }
      }
    } catch (error) {
      console.error('Error checking pause state:', error);
    }
  }

  showResumeOption(pauseState) {
    const resumeBanner = document.createElement('div');
    resumeBanner.className = 'fg-resume-banner';
    resumeBanner.innerHTML = `
      <div class="fg-resume-content">
        <div class="fg-resume-icon">⏸️</div>
        <div class="fg-resume-info">
          <strong>Download Paused</strong>
          <p>You have a paused download on this page (${this.formatTimestamp(pauseState.pausedAt)})</p>
        </div>
        <div class="fg-resume-actions">
          <button class="fg-btn fg-btn-success fg-resume-btn">▶️ Resume</button>
          <button class="fg-btn fg-btn-secondary fg-start-fresh-btn">🔄 Start Fresh</button>
        </div>
      </div>
    `;

    document.body.insertBefore(resumeBanner, document.body.firstChild);

    resumeBanner.querySelector('.fg-resume-btn').addEventListener('click', async () => {
      resumeBanner.remove();
      await this.clearPauseState();
      this.showNotification('▶️ Resuming', `Continuing from file ${pauseState.currentIndex + 1} of ${pauseState.totalFiles}`);
      
      // Resume download from saved position with saved files
      await this.startBulkDownload(pauseState.currentIndex, pauseState.files);
    });

    resumeBanner.querySelector('.fg-start-fresh-btn').addEventListener('click', async () => {
      resumeBanner.remove();
      await this.clearPauseState();
      this.showNotification('🔄 Fresh Start', 'Pause state cleared');
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

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}


let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('FitGirl Downloader: URL changed to', url);
    setTimeout(() => new FitGirlDownloader(), 1000);
  }
}).observe(document, { subtree: true, childList: true });


new FitGirlDownloader();
