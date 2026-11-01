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

  icon(name, sizeClass) {
    if (typeof FitGirlIcons !== 'undefined' && typeof FitGirlIcons.icon === 'function') {
      return FitGirlIcons.icon(name, sizeClass);
    }
    return '';
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
        this.pageStateCache = response.data[storageKey] || { selections: {}, skipped: [], sizeResults: {}, version: 1 };
        if (Array.isArray(this.pageStateCache.skipped)) {
          // Preserve backward compatibility with previous schema.
        } else {
          this.pageStateCache.skipped = [];
        }
        this.pageStateCache.selections = this.pageStateCache.selections || {};
        this.pageStateCache.sizeResults = this.pageStateCache.sizeResults || {};
        this.pageStateCache.version = this.pageStateCache.version || 1;
        this.pageStateLoaded = true;
        return this.pageStateCache;
      }
    } catch (error) {
      console.error('Error loading page state:', error);
    }

    this.pageStateCache = { selections: {}, skipped: [], sizeResults: {}, version: 1 };
    this.pageStateLoaded = true;
    return this.pageStateCache;
  }

  async savePageState(state) {
    state.version = state.version || 1;
    state.selections = state.selections || {};
    state.skipped = Array.isArray(state.skipped) ? state.skipped : [];
    state.sizeResults = state.sizeResults || {};
    this.pageStateCache = state;
    this.pageStateLoaded = true;
    this.queueStorageWrite(this.downloader.pageHash, state);
  }

  async saveSizeResults(sizeResults) {
    const state = await this.loadPageState();
    state.sizeResults = {
      ...(state.sizeResults || {}),
      ...(sizeResults || {})
    };
    await this.savePageState(state);
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

  /**
   * Delete every piece of state this extension keeps for the current page:
   * per-page selections, skips, size results, pause state, and the page's
   * URLs in the global completed/failed lists. Without dropping those global
   * entries a later bulk run would skip every file as "already downloaded"
   * and the page would look frozen in its previous state.
   */
  async clearPageState() {
    const storageKey = `page_state_${this.downloader.pageHash}`;
    const pageUrls = new Set(
      this.downloader.fileItems.map((item) => item.url).filter(Boolean)
    );

    delete this.pendingStorageWrites[`page_state_${this.downloader.pageHash}`];
    this.pageStateCache = { selections: {}, skipped: [], sizeResults: {}, version: 1 };
    this.pageStateLoaded = true;

    try {
      const response = await browserAPI.runtime.sendMessage({
        action: 'getStorage',
        keys: [
          CONFIG.STORAGE_KEYS.COMPLETED_URLS,
          CONFIG.STORAGE_KEYS.FAILED_URLS,
          CONFIG.STORAGE_KEYS.DOWNLOAD_STATS
        ]
      });

      const data = response?.success ? (response.data || {}) : {};
      const completedUrls = data[CONFIG.STORAGE_KEYS.COMPLETED_URLS] || [];
      const failedUrls = data[CONFIG.STORAGE_KEYS.FAILED_URLS] || [];
      const stats = data[CONFIG.STORAGE_KEYS.DOWNLOAD_STATS] || null;

      const remainingCompleted = completedUrls.filter((url) => !pageUrls.has(url));
      const remainingFailed = failedUrls.filter((entry) => {
        const url = typeof entry === 'string' ? entry : entry?.url;
        return !pageUrls.has(url);
      });

      const removedSuccesses = completedUrls.length - remainingCompleted.length;
      const removedFailures = failedUrls.length - remainingFailed.length;

      const writes = {
        [storageKey]: null,
        [CONFIG.STORAGE_KEYS.PAUSE_STATE]: null,
        [CONFIG.STORAGE_KEYS.COMPLETED_URLS]: remainingCompleted,
        [CONFIG.STORAGE_KEYS.FAILED_URLS]: remainingFailed
      };

      if (stats) {
        writes[CONFIG.STORAGE_KEYS.DOWNLOAD_STATS] = {
          ...stats,
          successfulDownloads: Math.max(0, (stats.successfulDownloads || 0) - removedSuccesses),
          failedDownloads: Math.max(0, (stats.failedDownloads || 0) - removedFailures),
          totalDownloads: Math.max(0, (stats.totalDownloads || 0) - removedSuccesses - removedFailures),
          lastUpdated: Date.now()
        };
      }

      await browserAPI.runtime.sendMessage({
        action: 'setStorage',
        data: writes
      });
    } catch (error) {
      console.error('Error clearing page state:', error);
      throw error;
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
    const ico = this.icon.bind(this);

    banner.innerHTML = `
      <div class="fg-resume-content">
        <div class="fg-resume-icon">${ico('pause')}</div>
        <div class="fg-resume-info">
          <strong>Download paused</strong>
          <p>Resume from file ${pauseState.currentIndex + 1} of ${pauseState.totalFiles}
             (${this.downloader.formatTimestamp(pauseState.pausedAt)})</p>
        </div>
        <div class="fg-resume-actions">
          <button class="fg-btn fg-btn-primary fg-resume-btn">${ico('play', 'fg-icon-sm')} Resume</button>
          <button class="fg-btn fg-btn-secondary fg-discard-btn">${ico('trash', 'fg-icon-sm')} Discard</button>
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
