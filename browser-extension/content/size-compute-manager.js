(function() {
'use strict';

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

class FitGirlSizeComputeManager {
  constructor(downloader) {
    this.downloader = downloader;
    this.activeTaskId = null;
    this.pollTimer = null;
    this.isRunning = false;
    this.latestResults = {};
  }

  async startManualCalculation(options = {}) {
    if (this.isRunning) {
      this.downloader.showNotification('ℹ️ Size Scan', 'Size calculation is already running');
      return;
    }

    const onlyUnknown = Boolean(options.onlyUnknown);

    const pageState = await this.downloader.loadPageState();
    const sizeResults = pageState.sizeResults || {};

    const urls = this.downloader.fileItems
      .map((item) => item.url)
      .filter((url) => typeof url === 'string' && url.trim())
      .filter((url) => {
        if (!onlyUnknown) return true;

        const current = sizeResults[url];
        return !(current && current.status === CONFIG.SIZE_STATUS.KNOWN && Number.isFinite(current.bytes));
      });

    if (urls.length === 0) {
      const message = onlyUnknown
        ? 'All files already have known sizes'
        : 'No links found to calculate sizes';
      this.downloader.showNotification('ℹ️ Size Scan', message);
      this.downloader.pageUIManager?.setSizeProgressText(message);
      return;
    }

    this.stopPolling();
    this.isRunning = true;
    this.latestResults = {};

    this.downloader.pageUIManager?.setSizeCalculationState(true);
    this.downloader.pageUIManager?.setSizeProgressText(`Starting size scan for ${urls.length} files${onlyUnknown ? ' (unknown only)' : ''}...`);

    try {
      const response = await browserAPI.runtime.sendMessage({
        action: 'startSizeCalculation',
        urls,
        ignoreCacheForUnknown: onlyUnknown
      });

      if (!response || !response.success || !response.taskId) {
        throw new Error(response?.error || 'Failed to start size calculation');
      }

      this.activeTaskId = response.taskId;
      this.pollTimer = setInterval(() => {
        this.pollTaskStatus().catch((error) => {
          console.error('FitGirl Downloader: failed to poll size task', error);
        });
      }, CONFIG.SIZE_POLL_INTERVAL_MS || 1000);

      await this.pollTaskStatus();
    } catch (error) {
      this.finishWithError(error.message || 'Size calculation failed');
    }
  }

  async pollTaskStatus() {
    if (!this.activeTaskId) {
      this.stopPolling();
      return;
    }

    const response = await browserAPI.runtime.sendMessage({
      action: 'getSizeCalculationStatus',
      taskId: this.activeTaskId
    });

    if (!response || !response.success) {
      this.finishWithError(response?.error || 'Unable to fetch size progress');
      return;
    }

    const results = response.results || {};
    this.latestResults = { ...this.latestResults, ...results };
    this.downloader.applySizeResults(this.latestResults, {
      processed: response.processed || 0,
      total: response.total || 0,
      progress: response.progress || 0,
      status: response.status || CONFIG.SIZE_STATUS.IDLE
    });

    const label = `Size scan: ${response.processed || 0}/${response.total || 0} (${response.progress || 0}%)`;
    this.downloader.pageUIManager?.setSizeProgressText(label);

    if (
      response.status === CONFIG.SIZE_STATUS.COMPLETED ||
      response.status === CONFIG.SIZE_STATUS.CANCELLED ||
      response.status === CONFIG.SIZE_STATUS.FAILED
    ) {
      this.stopPolling();
      this.isRunning = false;
      this.activeTaskId = null;
      this.downloader.pageUIManager?.setSizeCalculationState(false);

      if (response.status === CONFIG.SIZE_STATUS.FAILED) {
        this.downloader.pageUIManager?.setSizeProgressText(`Size scan failed: ${response.error || 'unknown error'}`);
      } else if (response.status === CONFIG.SIZE_STATUS.CANCELLED) {
        this.downloader.pageUIManager?.setSizeProgressText('Size scan cancelled');
      } else {
        this.downloader.pageUIManager?.setSizeProgressText('Size scan completed');
      }

      await this.persistLatestResults();
    }
  }

  async cancelCalculation() {
    if (!this.activeTaskId) {
      return;
    }

    try {
      await browserAPI.runtime.sendMessage({
        action: 'cancelSizeCalculation',
        taskId: this.activeTaskId
      });
    } catch (error) {
      console.error('FitGirl Downloader: failed to cancel size task', error);
    }

    this.stopPolling();
    this.isRunning = false;
    this.activeTaskId = null;
    this.downloader.pageUIManager?.setSizeCalculationState(false);
    this.downloader.pageUIManager?.setSizeProgressText('Size scan cancelled');
  }

  async persistLatestResults() {
    await this.downloader.saveSizeResults(this.latestResults);
  }

  finishWithError(message) {
    this.stopPolling();
    this.isRunning = false;
    this.activeTaskId = null;
    this.downloader.pageUIManager?.setSizeCalculationState(false);
    this.downloader.pageUIManager?.setSizeProgressText(`Size scan failed: ${message}`);
    this.downloader.showNotification('❌ Size Scan Failed', message);
  }

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  destroy() {
    if (this.activeTaskId) {
      browserAPI.runtime.sendMessage({
        action: 'cancelSizeCalculation',
        taskId: this.activeTaskId
      }).catch(() => {});
    }

    this.stopPolling();
    this.activeTaskId = null;
    this.isRunning = false;
    this.latestResults = {};
  }
}

if (typeof self !== 'undefined') {
  self.FitGirlSizeComputeManager = FitGirlSizeComputeManager;
}

if (typeof window !== 'undefined') {
  window.FitGirlSizeComputeManager = FitGirlSizeComputeManager;
}

})();