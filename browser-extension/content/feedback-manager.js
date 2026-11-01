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
      this.reportMessageFailure(error, 'logging success');
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
      this.reportMessageFailure(err, 'logging failure');
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
      this.reportMessageFailure(error, 'showing notification');
    }
  }

  /**
   * A reloaded extension leaves this page's content script orphaned, so every
   * runtime message rejects with "Extension context invalidated". That is
   * expected during development. Warn once and swallow the rest instead of
   * logging a failure for each individual call.
   */
  reportMessageFailure(error, context) {
    if (typeof isExtensionContextError === 'function' && isExtensionContextError(error)) {
      if (!FitGirlFeedbackManager.contextWarned) {
        FitGirlFeedbackManager.contextWarned = true;
        console.warn('FitGirl Downloader: the extension was reloaded. Reload this page to restore it.');
      }
      return;
    }
    console.error('Error ' + context + ':', error);
  }
}

if (typeof self !== 'undefined') {
  self.FitGirlFeedbackManager = FitGirlFeedbackManager;
}

if (typeof window !== 'undefined') {
  window.FitGirlFeedbackManager = FitGirlFeedbackManager;
}

})();
