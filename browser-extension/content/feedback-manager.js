(function() {
'use strict';

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

class FitGirlFeedbackManager {
  constructor(downloader) {
    this.downloader = downloader;
  }

  updateCounter() {
    const counterText = this.downloader.cachedElements.counterText;
    if (!counterText) return;

    this.downloader.refreshCheckboxCache();
    const total = this.downloader.fileItems.length;
    const skipped = this.downloader.fileItems.filter((item) => item.isSkipped).length;
    const { checkedTotal } = this.downloader.getCheckboxStats();

    counterText.textContent = `${checkedTotal} of ${total} files selected (${skipped} skipped)`;
  }

  updateProgress(current, total) {
    const { progressFill, progressText } = this.downloader.cachedElements;
    const percentage = Math.round((current / total) * 100);

    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }

    if (progressText) {
      progressText.textContent = `${current} / ${total} files (${percentage}%)`;
    }
  }

  updateStatus(message) {
    const { statusText } = this.downloader.cachedElements;
    if (statusText) {
      statusText.textContent = message;
    }
  }

  async logSuccess(url) {
    try {
      await browserAPI.runtime.sendMessage({
        action: 'updateStats',
        type: 'success',
        url
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
        url,
        error
      });
    } catch (err) {
      console.error('Error logging failure:', err);
    }
  }

  async showNotification(title, message) {
    try {
      await browserAPI.runtime.sendMessage({
        action: 'showNotification',
        title,
        message
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }
}

if (typeof self !== 'undefined') {
  self.FitGirlFeedbackManager = FitGirlFeedbackManager;
}

if (typeof window !== 'undefined') {
  window.FitGirlFeedbackManager = FitGirlFeedbackManager;
}

})();
