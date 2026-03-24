(function() {
'use strict';

class FitGirlMutationHandler {
  constructor(downloader) {
    this.downloader = downloader;
    this.observer = null;
    this.pendingMutations = [];
    this.mutationProcessTimeout = null;
  }

  setupMutationObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      if (!this.downloader.initialized) {
        this.downloader.tryInitialize();
        return;
      }

      this.queueMutationProcessing(mutations);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  queueMutationProcessing(mutations) {
    if (!mutations || mutations.length === 0) return;

    this.pendingMutations.push(...mutations);

    if (this.mutationProcessTimeout) {
      return;
    }

    this.mutationProcessTimeout = setTimeout(() => {
      this.mutationProcessTimeout = null;
      const batchedMutations = this.pendingMutations;
      this.pendingMutations = [];

      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => this.handleMutations(batchedMutations), { timeout: 300 });
      } else {
        this.handleMutations(batchedMutations);
      }
    }, 150);
  }

  handleMutations(mutations) {
    if (this.downloader.isFitGirlPage() && this.downloader.hasMainUI()) {
      return;
    }

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          if (node.querySelector && (
            node.querySelector('a[href*="fuckingfast.co"]') ||
            node.textContent.includes('Download links') ||
            node.id === 'plaintext'
          )) {
            console.log('FitGirl Downloader: New download content detected');
            if (!this.downloader.isFitGirlPage() || !this.downloader.hasMainUI()) {
              this.downloader.tryInitialize();
            }
            return;
          }
        }
      }
    }
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.mutationProcessTimeout) {
      clearTimeout(this.mutationProcessTimeout);
      this.mutationProcessTimeout = null;
    }

    this.pendingMutations = [];
  }
}

if (typeof self !== 'undefined') {
  self.FitGirlMutationHandler = FitGirlMutationHandler;
}

if (typeof window !== 'undefined') {
  window.FitGirlMutationHandler = FitGirlMutationHandler;
}

})();
