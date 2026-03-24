(function() {
'use strict';

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

class FitGirlStorageManager {
  constructor(downloader) {
    this.downloader = downloader;
    this.pendingStorageWrites = {};
    this.storageWriteTimeout = null;
    this.pageStateCache = null;
    this.pageStateLoaded = false;
  }

  async saveSelections() {
    const selections = {};

    this.downloader.refreshCheckboxCache();
    this.downloader.checkboxElements.forEach((checkbox) => {
      selections[checkbox.dataset.url] = checkbox.checked;
    });

    const state = await this.loadPageState();
    state.selections = selections;

    await this.savePageState(state);

    this.downloader.updateCounter();
    this.downloader.updateToggleButton();
  }

  async saveSkippedFiles() {
    const skipped = this.downloader.fileItems
      .filter((item) => item.isSkipped)
      .map((item) => item.url);

    const state = await this.loadPageState();
    state.skipped = skipped;

    await this.savePageState(state);
  }

  queueStorageWrite(key, value) {
    this.pendingStorageWrites[`page_state_${key}`] = value;

    if (this.storageWriteTimeout) {
      clearTimeout(this.storageWriteTimeout);
    }

    this.storageWriteTimeout = setTimeout(() => {
      this.flushPendingStorageWrites();
    }, 1000);
  }

  async flushPendingStorageWrites(force = false) {
    if (this.storageWriteTimeout) {
      clearTimeout(this.storageWriteTimeout);
      this.storageWriteTimeout = null;
    }

    const writeKeys = Object.keys(this.pendingStorageWrites);
    if (writeKeys.length === 0) {
      return;
    }

    const writes = { ...this.pendingStorageWrites };
    this.pendingStorageWrites = {};

    try {
      await browserAPI.runtime.sendMessage({
        action: 'setStorage',
        data: writes
      });
    } catch (error) {
      console.error(`Error in ${force ? 'forced ' : ''}batch storage write:`, error);
      Object.assign(this.pendingStorageWrites, writes);
    }
  }

  async loadPageState() {
    if (this.pageStateLoaded) {
      return this.pageStateCache;
    }

    const storageKey = `page_state_${this.downloader.pageHash}`;

    try {
      const response = await browserAPI.runtime.sendMessage({
        action: 'getStorage',
        keys: [storageKey]
      });

      if (response.success) {
        this.pageStateCache = response.data[storageKey] || { selections: {}, skipped: [] };
        this.pageStateLoaded = true;
        return this.pageStateCache;
      }
    } catch (error) {
      console.error('Error loading page state:', error);
    }

    this.pageStateCache = { selections: {}, skipped: [] };
    this.pageStateLoaded = true;
    return this.pageStateCache;
  }

  async savePageState(state) {
    this.pageStateCache = state;
    this.pageStateLoaded = true;
    this.queueStorageWrite(this.downloader.pageHash, state);
  }

  async savePauseState(currentIndex, files) {
    const fileUrls = files.map((f) => f.url);

    const pauseState = {
      isPaused: true,
      pausedAt: Date.now(),
      pageUrl: this.downloader.currentPage,
      pageHash: this.downloader.pageHash,
      currentIndex,
      totalFiles: files.length,
      fileUrls
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

        if (pauseState.pageHash === this.downloader.pageHash) {
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
             (${this.downloader.formatTimestamp(pauseState.pausedAt)})</p>
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

      const resumeFiles = pauseState.fileUrls.map((url) => {
        const item = this.downloader.fileItems.find((f) => f.url === url);
        return item || { url, text: this.downloader.getFilenameFromUrl(url) };
      });

      await this.downloader.startBulkDownload(pauseState.currentIndex, resumeFiles);
    });

    banner.querySelector('.fg-discard-btn').addEventListener('click', async () => {
      banner.remove();
      await this.clearPauseState();
    });
  }

  isPauseExpired(pausedAt) {
    const now = Date.now();
    return (now - pausedAt) > CONFIG.PAUSE_EXPIRATION_TIME;
  }

  destroy() {
    this.flushPendingStorageWrites(true);
    this.pageStateCache = null;
    this.pageStateLoaded = false;
  }
}

if (typeof self !== 'undefined') {
  self.FitGirlStorageManager = FitGirlStorageManager;
}

if (typeof window !== 'undefined') {
  window.FitGirlStorageManager = FitGirlStorageManager;
}

})();
