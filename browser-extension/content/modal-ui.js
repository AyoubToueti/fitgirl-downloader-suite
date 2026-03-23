(function() {
'use strict';

class FitGirlModalUI {
  constructor(downloader) {
    this.downloader = downloader;
    this.triggerButton = null;
    this.modalOverlay = null;
    this.modalBody = null;
    this.modalKeydownHandler = null;
  }

  hasTriggerButton() {
    return !!(this.triggerButton && document.body.contains(this.triggerButton));
  }

  ensureTriggerButton() {
    if (!this.downloader.isModalMode()) {
      return;
    }

    let button = this.triggerButton;

    if (!button || !document.body.contains(button)) {
      button = document.querySelector('.fg-ui-trigger-btn');
    }

    if (!button) {
      button = document.createElement('button');
      button.className = 'fg-ui-trigger-btn';
      button.type = 'button';
      button.textContent = '🎮 Open Downloader';
      button.addEventListener('click', () => this.open());
    }

    const heading = document.querySelector('h2#downloadlinks');
    if (heading) {
      heading.classList.add('fg-downloadlinks-heading');
      if (button.parentElement !== heading) {
        heading.appendChild(button);
      }
      button.classList.remove('fg-ui-trigger-floating');
      button.classList.add('fg-ui-trigger-inline');
    } else {
      if (button.parentElement !== document.body) {
        document.body.appendChild(button);
      }
      button.classList.remove('fg-ui-trigger-inline');
      button.classList.add('fg-ui-trigger-floating');
    }

    this.triggerButton = button;
  }

  ensureModalContainer() {
    if (this.modalOverlay && document.body.contains(this.modalOverlay)) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'fg-ui-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'fg-ui-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'FitGirl Downloader');

    overlay.appendChild(modal);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        this.close();
      }
    });

    if (!this.modalKeydownHandler) {
      this.modalKeydownHandler = (event) => {
        if (event.key === 'Escape' && this.modalOverlay && this.modalOverlay.classList.contains('is-open')) {
          this.close();
        }
      };
      document.addEventListener('keydown', this.modalKeydownHandler);
    }

    document.body.appendChild(overlay);
    this.modalOverlay = overlay;
    this.modalBody = modal;
  }

  async open() {
    if (!this.downloader.isModalMode()) {
      return;
    }

    this.ensureModalContainer();
    if (!this.modalBody) {
      return;
    }

    const existingUI = this.downloader.getMainUIElement();
    if (existingUI && existingUI.parentElement !== this.modalBody) {
      this.modalBody.appendChild(existingUI);
    }

    if (!this.downloader.hasMainUI()) {
      await this.downloader.createDownloadUI(this.modalBody);
    } else {
      this.downloader.cacheElements();
      this.downloader.refreshCheckboxCache();
      this.downloader.updateCounter();
      this.downloader.updateToggleButton();
    }

    if (this.modalOverlay) {
      this.modalOverlay.classList.add('is-open');
    }
    document.body.classList.add('fg-ui-modal-open');
  }

  close() {
    if (this.modalOverlay) {
      this.modalOverlay.classList.remove('is-open');
    }

    document.body.classList.remove('fg-ui-modal-open');
  }

  teardown() {
    this.close();

    if (this.triggerButton && this.triggerButton.parentElement) {
      this.triggerButton.parentElement.removeChild(this.triggerButton);
    }

    this.triggerButton = null;
  }

  destroy() {
    this.close();

    if (this.modalOverlay && this.modalOverlay.parentElement) {
      this.modalOverlay.parentElement.removeChild(this.modalOverlay);
    }
    this.modalOverlay = null;
    this.modalBody = null;

    if (this.modalKeydownHandler) {
      document.removeEventListener('keydown', this.modalKeydownHandler);
      this.modalKeydownHandler = null;
    }

    if (this.triggerButton && this.triggerButton.parentElement) {
      this.triggerButton.parentElement.removeChild(this.triggerButton);
    }
    this.triggerButton = null;
  }
}

if (typeof self !== 'undefined') {
  self.FitGirlModalUI = FitGirlModalUI;
}

if (typeof window !== 'undefined') {
  window.FitGirlModalUI = FitGirlModalUI;
}

})();
