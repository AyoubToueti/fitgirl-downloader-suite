(function() {
'use strict';

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

class FitGirlDownloadManager {
  constructor(downloader) {
    this.downloader = downloader;
  }

  icon(name, sizeClass) {
    if (typeof FitGirlIcons !== 'undefined' && typeof FitGirlIcons.icon === 'function') {
      return FitGirlIcons.icon(name, sizeClass);
    }
    return '';
  }

  /**
   * Check if a URL is a fuckingfast.co file page (not /dl/, not FitGirl paste page).
   */
  isFuckingFastFilePage(url) {
    try {
      const u = new URL(url);
      return u.hostname.includes('fuckingfast.co') && !url.includes('/dl/');
    } catch (e) {
      return false;
    }
  }

  /**
   * Check if the given URL is the page this content script is running on
   * (same origin + path + hash). Only then can we click the native button.
   */
  isCurrentFilePage(url) {
    try {
      const a = new URL(url);
      const b = new URL(window.location.href);
      return a.hostname === b.hostname && a.pathname === b.pathname && a.hash === b.hash;
    } catch (e) {
      return false;
    }
  }

  /**
   * Fallback path: trigger the download via the page's native DOWNLOAD button.
   *
   * New fuckingfast interface: `a.link-button` carries hx-post="/f/<id>/go".
   * A capture-phase ad interceptor consumes the first click when the
   * server-injected ad URL (window.dynamic) is set, so the HTMX POST only
   * fires on the next click. We therefore detect whether a POST actually
   * fired (htmx:beforeRequest) and click again when it did not. The POST
   * response carries HX-Redirect and htmx follows it, which starts the
   * native download.
   */
  tryTriggerPageDownload() {
    const nativeBtn = document.querySelector('a.link-button');
    if (!nativeBtn) return false;

    let postFired = false;
    const onBeforeRequest = (e) => {
      const path = e.detail?.requestConfig?.path || '';
      if (path.includes('/go')) {
        postFired = true;
      }
    };
    document.body.addEventListener('htmx:beforeRequest', onBeforeRequest);
    document.body.addEventListener('htmx:afterRequest', () => {
      document.body.removeEventListener('htmx:beforeRequest', onBeforeRequest);
    }, { once: true });

    nativeBtn.click();

    setTimeout(() => {
      document.body.removeEventListener('htmx:beforeRequest', onBeforeRequest);
      if (!postFired) {
        console.log('FitGirl Downloader: first click consumed by ad handler, clicking again');
        nativeBtn.click();
      }
    }, 400);

    return true;
  }

  async downloadSingleFile(url) {
    if (this.downloader.isProcessing) {
      this.downloader.showNotification('Busy', 'A download is already in progress');
      return;
    }

    this.downloader.isProcessing = true;

    const filename = this.downloader.getFilenameFromUrl(url);
    this.downloader.updateStatus('Downloading: ' + filename + '...');
    this.setFileStatus(url, CONFIG.STATUS.PROCESSING);

    try {
      let downloadUrl = url;

      if (!downloadUrl.includes('/dl/')) {
        // Primary path: background service worker POSTs /f/<id>/go and uses
        // the HX-Redirect URL. Works even when this page is not on the site.
        try {
          downloadUrl = await this.extractRealDownloadUrl(url);
        } catch (extractError) {
          console.warn('Background extraction failed:', extractError.message);
          downloadUrl = null;
        }

        // Fallback: click the page's native button (only works when this
        // content script runs on the file's own page).
        if (!downloadUrl && this.isCurrentFilePage(url) &&
            this.isFuckingFastFilePage(url) && this.tryTriggerPageDownload()) {
          this.downloader.updateStatus('Download triggered via page button: ' + filename);
          return;
        }
      }

      if (downloadUrl) {
        await this.initiateDownload(downloadUrl, url);
        this.setFileStatus(url, CONFIG.STATUS.SUCCESS);
        this.downloader.updateStatus('Downloaded: ' + filename);
        this.downloader.showNotification('Success', filename + ' downloaded');
      } else {
        throw new Error('Failed to extract download URL');
      }
    } catch (error) {
      console.error('Download failed for ' + url + ':', error);
      this.setFileStatus(url, CONFIG.STATUS.FAILED, error.message);
      this.downloader.updateStatus('Failed: ' + filename);
      this.downloader.showNotification('Error', error.message);
    } finally {
      this.downloader.isProcessing = false;
    }
  }

  /**
   * Put the Start/Stop pair back into its idle state. Safe to call at any
   * point, including after an early return from startBulkDownload().
   */
  resetRunControls() {
    const { startBtn, stopBtn } = this.downloader.cachedElements || {};

    if (startBtn) {
      startBtn.classList.remove('fg-hidden');
      startBtn.disabled = false;
    }

    if (stopBtn) {
      stopBtn.classList.add('fg-hidden');
      stopBtn.disabled = false;
      stopBtn.innerHTML = this.icon('stop', 'fg-icon-sm') + ' Stop';
    }
  }

  async startBulkDownload(resumeFromIndex = null, resumeFiles = null) {
    if (this.downloader.isProcessing) {
      this.downloader.showNotification('Busy', 'Download process already running');
      return;
    }

    const selectedFiles = resumeFiles || this.downloader.getSelectedFiles();

    if (selectedFiles.length === 0) {
      this.downloader.showNotification('No files', 'No files selected for download');
      return;
    }

    this.downloader.isProcessing = true;
    this.downloader.shouldStop = false;
    this.downloader.currentIndex = resumeFromIndex !== null ? resumeFromIndex : 0;

    const { startBtn, stopBtn } = this.downloader.cachedElements;
    startBtn.classList.add('fg-hidden');
    startBtn.disabled = true;

    // A previous run may have left Stop disabled ("Stopping..." state) if the
    // page was cleared or the run ended early. Always re-arm it per run.
    stopBtn.classList.remove('fg-hidden');
    stopBtn.disabled = false;
    stopBtn.innerHTML = this.icon('stop', 'fg-icon-sm') + ' Stop';

    this.downloader.updateStatus('Starting download of ' + selectedFiles.length + ' files...');

    let success = 0;
    let failures = 0;
    let consecutiveFailures = 0;

    // Snapshot the already-downloaded list once per run. Files added to it by
    // this run must not make later iterations skip, so the set is frozen here.
    const completedResponse = await browserAPI.runtime.sendMessage({
      action: 'getStorage',
      keys: [CONFIG.STORAGE_KEYS.COMPLETED_URLS]
    });
    const completedUrls = new Set(completedResponse?.success ?
      completedResponse.data[CONFIG.STORAGE_KEYS.COMPLETED_URLS] || [] : []);

    for (let i = this.downloader.currentIndex; i < selectedFiles.length; i++) {
      if (this.downloader.shouldStop) {
        await this.downloader.savePauseState(i, selectedFiles);
        this.downloader.updateStatus('Paused');
        this.downloader.showNotification('Paused', 'Download paused. You can resume later.');
        break;
      }

      const file = selectedFiles[i];
      this.downloader.currentIndex = i;

      if (completedUrls.has(file.url)) {
        this.downloader.updateStatus('Skipping already downloaded: ' + this.downloader.getFilenameFromUrl(file.url));
        this.setFileStatus(file.url, CONFIG.STATUS.COMPLETED);
        continue;
      }

      this.downloader.updateProgress(i + 1, selectedFiles.length);
      this.downloader.updateStatus('[' + (i + 1) + '/' + selectedFiles.length + '] Processing: ' + this.downloader.getFilenameFromUrl(file.url));
      this.setFileStatus(file.url, CONFIG.STATUS.PROCESSING);

      try {
        let downloadUrl = file.url;

        if (!downloadUrl.includes('/dl/')) {
          try {
            downloadUrl = await this.extractRealDownloadUrl(file.url);
          } catch (extractError) {
            console.warn('Background extraction failed for ' + file.url + ':', extractError.message);
            downloadUrl = null;
          }

          // Fallback: only possible when the failed file IS the page we are on
          if (!downloadUrl && this.isCurrentFilePage(file.url) &&
              this.isFuckingFastFilePage(file.url)) {
            const triggered = this.tryTriggerPageDownload();
            if (triggered) {
              // Page-based download: we can't track success/failure from here.
              // Mark as success optimistically and continue.
              this.setFileStatus(file.url, CONFIG.STATUS.SUCCESS);
              success++;
              consecutiveFailures = 0;
              if (i < selectedFiles.length - 1) {
                await this.downloader.delay(CONFIG.WAIT_BETWEEN);
              }
              continue;
            }
          }
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
        console.error('Download failed for ' + file.url + ':', error);
        this.setFileStatus(file.url, CONFIG.STATUS.FAILED, error.message);
        await this.downloader.logFailure(file.url, error.message);
        failures++;
        consecutiveFailures++;

        if (consecutiveFailures >= CONFIG.CONSECUTIVE_FAILURES_THRESHOLD) {
          this.downloader.updateStatus('Too many consecutive failures. Pausing...');
          await this.downloader.savePauseState(i + 1, selectedFiles);
          this.downloader.showNotification('Paused', consecutiveFailures + ' consecutive failures. Please check your connection.');
          break;
        }
      }

      if (i < selectedFiles.length - 1) {
        await this.downloader.delay(CONFIG.WAIT_BETWEEN);
      }
    }

    this.downloader.isProcessing = false;

    const stoppedByUser = this.downloader.shouldStop;
    this.downloader.shouldStop = false;

    this.resetRunControls();

    if (!stoppedByUser) {
      await this.downloader.clearPauseState();
      this.downloader.updateStatus('Complete: ' + success + ' successful, ' + failures + ' failed');
      this.downloader.showNotification(
        'Download complete',
        'Processed ' + selectedFiles.length + ' files: ' + success + ' successful, ' + failures + ' failed'
      );
    }
  }

  stopDownload() {
    if (!this.downloader.isProcessing) return;

    this.downloader.shouldStop = true;
    this.downloader.updateStatus('Stopping after current file...');

    const { stopBtn } = this.downloader.cachedElements;
    if (stopBtn) {
      stopBtn.disabled = true;
      stopBtn.innerHTML = this.icon('stop', 'fg-icon-sm') + ' Stopping...';
    }
  }

  async extractRealDownloadUrl(pageUrl) {
    let response;

    try {
      response = await browserAPI.runtime.sendMessage({
        action: 'extractDownloadUrl',
        url: pageUrl
      });
    } catch (error) {
      // A reloaded extension orphans this page's content script; say so
      // instead of letting the raw message bubble up as an extraction bug.
      if (typeof isExtensionContextError === 'function' && isExtensionContextError(error)) {
        throw new Error('The extension was reloaded. Reload this page, then try again.');
      }
      throw error;
    }

    if (response && response.success) {
      return response.downloadUrl;
    }

    throw new Error((response && response.error) || 'Extraction failed');
  }

  async initiateDownload(downloadUrl, originalUrl) {
    // Refresh preference per initiation so popup changes apply to the next
    // download without a page reload.
    await this.downloader.loadDownloadMethodPreference();

    if (this.downloader.downloadMethod === CONFIG.DOWNLOAD_METHODS.NATIVE) {
      this.triggerNativeDownload(downloadUrl);
      await this.downloader.logSuccess(originalUrl);
      return;
    }

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

  /**
   * Hand the direct URL to the browser's normal navigation flow.
   * dl.fuckingfast.co answers with Content-Disposition: attachment, so the
   * browser starts a regular download without leaving the page. External
   * download managers with a browser hook (FDM, Xtreme etc.) reliably
   * intercept downloads created this way, unlike chrome.downloads API calls.
   */
  triggerNativeDownload(url) {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  setFileStatus(url, status, errorMessage = '') {
    const fileItem = this.downloader.fileItems.find((item) => item.url === url);
    if (!fileItem) return;

    const statusContainer = fileItem.element.querySelector('.fg-file-status');
    const actionsContainer = fileItem.element.querySelector('.fg-file-actions');

    if (!statusContainer || !actionsContainer) return;

    statusContainer.innerHTML = '';
    actionsContainer.innerHTML = '';
    actionsContainer.classList.remove('always');

    fileItem.status = status;

    const badge = document.createElement('span');

    const tagClasses = {
      [CONFIG.STATUS.PENDING]: 'fg-tag-pending',
      [CONFIG.STATUS.PROCESSING]: 'fg-tag-proc',
      [CONFIG.STATUS.SUCCESS]: 'fg-tag-ok',
      [CONFIG.STATUS.COMPLETED]: 'fg-tag-ok',
      [CONFIG.STATUS.FAILED]: 'fg-tag-err',
      [CONFIG.STATUS.RETRYING]: 'fg-tag-proc',
      [CONFIG.STATUS.SKIPPED]: 'fg-tag-skip'
    };

    const statusTexts = {
      [CONFIG.STATUS.PENDING]: 'Pending',
      [CONFIG.STATUS.PROCESSING]: 'Processing',
      [CONFIG.STATUS.SUCCESS]: 'Success',
      [CONFIG.STATUS.FAILED]: 'Failed',
      [CONFIG.STATUS.COMPLETED]: 'Completed',
      [CONFIG.STATUS.RETRYING]: 'Retrying',
      [CONFIG.STATUS.SKIPPED]: 'Skipped'
    };

    badge.className = 'fg-tag ' + (tagClasses[status] || 'fg-tag-skip');

    if (status === CONFIG.STATUS.PROCESSING || status === CONFIG.STATUS.RETRYING) {
      const spinner = document.createElement('i');
      spinner.className = 'fg-spinner';
      badge.appendChild(spinner);
    }

    badge.appendChild(document.createTextNode(statusTexts[status] || 'Unknown'));

    if (errorMessage) {
      badge.title = errorMessage;
    }

    statusContainer.appendChild(badge);

    const canRetry =
      status === CONFIG.STATUS.FAILED ||
      status === CONFIG.STATUS.SUCCESS ||
      status === CONFIG.STATUS.COMPLETED;

    if (canRetry) {
      const retryBtn = document.createElement('button');
      retryBtn.className = 'fg-btn fg-btn-xs fg-retry-file';
      retryBtn.innerHTML = this.icon('retry', 'fg-icon-sm') + ' Retry';
      retryBtn.dataset.url = url;
      retryBtn.title = status === CONFIG.STATUS.FAILED
        ? 'Retry this download'
        : 'Download this file again';
      actionsContainer.appendChild(retryBtn);

      // Keep the action visible for completed rows even without hover.
      actionsContainer.classList.add('always');
    }
  }

  async retryFile(url) {
    const fileItem = this.downloader.fileItems.find((item) => item.url === url);
    if (!fileItem) return;

    this.setFileStatus(url, CONFIG.STATUS.RETRYING);
    this.downloader.updateStatus('Retrying: ' + this.downloader.getFilenameFromUrl(url));

    try {
      let downloadUrl = url;

      if (!downloadUrl.includes('/dl/')) {
        try {
          downloadUrl = await this.extractRealDownloadUrl(url);
        } catch (extractError) {
          // The "extension reloaded" case is not an extraction failure and no
          // page-button fallback can recover from it, so surface it directly.
          if (/extension was reloaded/i.test(extractError.message)) {
            this.setFileStatus(url, CONFIG.STATUS.FAILED, extractError.message);
            this.downloader.updateStatus(extractError.message);
            this.downloader.showNotification('Extension reloaded', extractError.message);
            return;
          }
          console.warn('Background extraction failed during retry:', extractError.message);
          downloadUrl = null;
        }

        if (!downloadUrl && this.isCurrentFilePage(url) &&
            this.isFuckingFastFilePage(url) && this.tryTriggerPageDownload()) {
          this.downloader.updateStatus('Retry triggered via page button');
          return;
        }
      }

      if (downloadUrl) {
        await this.initiateDownload(downloadUrl, url);
        this.setFileStatus(url, CONFIG.STATUS.SUCCESS);
        this.downloader.showNotification('Retry successful', 'File downloaded successfully');
      } else {
        throw new Error('Could not extract download URL');
      }
    } catch (error) {
      console.error('Retry failed for ' + url + ':', error);
      this.setFileStatus(url, CONFIG.STATUS.FAILED, error.message);
      this.downloader.showNotification('Retry failed', error.message);
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