(function() {
'use strict';

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

class FitGirlDownloadManager {
  constructor(downloader) {
    this.downloader = downloader;
  }

  async downloadSingleFile(url) {
    if (this.downloader.isProcessing) {
      this.downloader.showNotification('⚠️ Busy', 'A download is already in progress');
      return;
    }

    this.downloader.isProcessing = true;

    const filename = this.downloader.getFilenameFromUrl(url);
    this.downloader.updateStatus(`📥 Downloading: ${filename}...`);
    this.setFileStatus(url, CONFIG.STATUS.PROCESSING);

    try {
      let downloadUrl = url;

      if (!downloadUrl.includes('/dl/')) {
        downloadUrl = await this.extractRealDownloadUrl(url);
      }

      if (downloadUrl) {
        await this.initiateDownload(downloadUrl, url);
        this.setFileStatus(url, CONFIG.STATUS.SUCCESS);
        this.downloader.updateStatus(`✅ Downloaded: ${filename}`);
        this.downloader.showNotification('✅ Success', `${filename} downloaded`);
      } else {
        throw new Error('Failed to extract download URL');
      }
    } catch (error) {
      console.error(`Download failed for ${url}:`, error);
      this.setFileStatus(url, CONFIG.STATUS.FAILED, error.message);
      this.downloader.updateStatus(`❌ Failed: ${filename}`);
      this.downloader.showNotification('❌ Error', error.message);
    } finally {
      this.downloader.isProcessing = false;
    }
  }

  async startBulkDownload(resumeFromIndex = null, resumeFiles = null) {
    if (this.downloader.isProcessing) {
      this.downloader.showNotification('⚠️ Busy', 'Download process already running');
      return;
    }

    const selectedFiles = resumeFiles || this.downloader.getSelectedFiles();

    if (selectedFiles.length === 0) {
      this.downloader.showNotification('❌ No Files', 'No files selected for download');
      return;
    }

    this.downloader.isProcessing = true;
    this.downloader.shouldStop = false;
    this.downloader.currentIndex = resumeFromIndex !== null ? resumeFromIndex : 0;

    const { startBtn, stopBtn } = this.downloader.cachedElements;
    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';

    this.downloader.updateStatus(`📥 Starting download of ${selectedFiles.length} files...`);

    let success = 0;
    let failures = 0;
    let consecutiveFailures = 0;

    const completedResponse = await browserAPI.runtime.sendMessage({
      action: 'getStorage',
      keys: [CONFIG.STORAGE_KEYS.COMPLETED_URLS]
    });
    const completedUrls = new Set(completedResponse.success ?
      completedResponse.data[CONFIG.STORAGE_KEYS.COMPLETED_URLS] || [] : []);

    for (let i = this.downloader.currentIndex; i < selectedFiles.length; i++) {
      if (this.downloader.shouldStop) {
        await this.downloader.savePauseState(i, selectedFiles);
        this.downloader.updateStatus('⏸️ Paused');
        this.downloader.showNotification('⏸️ Paused', 'Download paused. You can resume later.');
        break;
      }

      const file = selectedFiles[i];
      this.downloader.currentIndex = i;

      if (completedUrls.has(file.url)) {
        this.downloader.updateStatus(`[✓] Skipping already downloaded: ${this.downloader.getFilenameFromUrl(file.url)}`);
        this.setFileStatus(file.url, CONFIG.STATUS.COMPLETED);
        continue;
      }

      this.downloader.updateProgress(i + 1, selectedFiles.length);
      this.downloader.updateStatus(`[${i + 1}/${selectedFiles.length}] Processing: ${this.downloader.getFilenameFromUrl(file.url)}`);
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
        await this.downloader.logFailure(file.url, error.message);
        failures++;
        consecutiveFailures++;

        if (consecutiveFailures >= CONFIG.CONSECUTIVE_FAILURES_THRESHOLD) {
          this.downloader.updateStatus('⚠️ Too many consecutive failures. Pausing...');
          await this.downloader.savePauseState(i + 1, selectedFiles);
          this.downloader.showNotification('⚠️ Paused', `${consecutiveFailures} consecutive failures. Please check your connection.`);
          break;
        }
      }

      if (i < selectedFiles.length - 1) {
        await this.downloader.delay(CONFIG.WAIT_BETWEEN);
      }
    }

    this.downloader.isProcessing = false;

    const { startBtn: sb, stopBtn: stb } = this.downloader.cachedElements;
    sb.style.display = 'block';
    stb.style.display = 'none';

    if (!this.downloader.shouldStop) {
      await this.downloader.clearPauseState();
      this.downloader.updateStatus(`✅ Complete: ${success} successful, ${failures} failed`);
      this.downloader.showNotification(
        '📊 Download Complete',
        `Processed ${selectedFiles.length} files: ${success} successful, ${failures} failed`
      );
    }
  }

  stopDownload() {
    if (!this.downloader.isProcessing) return;

    this.downloader.shouldStop = true;
    this.downloader.updateStatus('⏹️ Stopping after current file...');

    const { stopBtn } = this.downloader.cachedElements;
    if (stopBtn) {
      stopBtn.disabled = true;
      stopBtn.textContent = '⏹️ Stopping...';
    }
  }

  async extractRealDownloadUrl(pageUrl) {
    const response = await browserAPI.runtime.sendMessage({
      action: 'extractDownloadUrl',
      url: pageUrl
    });

    if (response.success) {
      return response.downloadUrl;
    }

    throw new Error(response.error || 'Extraction failed');
  }

  async initiateDownload(downloadUrl, originalUrl) {
    const filename = this.downloader.generateFilename(downloadUrl);

    const response = await browserAPI.runtime.sendMessage({
      action: 'download',
      url: downloadUrl,
      filename
    });

    if (response.success) {
      await this.downloader.logSuccess(originalUrl);
      return;
    }

    throw new Error(response.error || 'Download failed');
  }

  setFileStatus(url, status, errorMessage = '') {
    const fileItem = this.downloader.fileItems.find((item) => item.url === url);
    if (!fileItem) return;

    const statusContainer = fileItem.element.querySelector('.fg-file-status');
    const actionsContainer = fileItem.element.querySelector('.fg-file-actions');

    if (!statusContainer || !actionsContainer) return;

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
    const fileItem = this.downloader.fileItems.find((item) => item.url === url);
    if (!fileItem) return;

    this.setFileStatus(url, CONFIG.STATUS.RETRYING);
    this.downloader.updateStatus(`🔄 Retrying: ${this.downloader.getFilenameFromUrl(url)}`);

    try {
      let downloadUrl = url;

      if (!downloadUrl.includes('/dl/')) {
        downloadUrl = await this.extractRealDownloadUrl(url);
      }

      if (downloadUrl) {
        await this.initiateDownload(downloadUrl, url);
        this.setFileStatus(url, CONFIG.STATUS.SUCCESS);
        this.downloader.showNotification('✅ Retry Successful', 'File downloaded successfully');
      } else {
        throw new Error('Could not extract download URL');
      }
    } catch (error) {
      console.error(`Retry failed for ${url}:`, error);
      this.setFileStatus(url, CONFIG.STATUS.FAILED, error.message);
      this.downloader.showNotification('❌ Retry Failed', error.message);
    }
  }
}

if (typeof self !== 'undefined') {
  self.FitGirlDownloadManager = FitGirlDownloadManager;
}

if (typeof window !== 'undefined') {
  window.FitGirlDownloadManager = FitGirlDownloadManager;
}

})();
