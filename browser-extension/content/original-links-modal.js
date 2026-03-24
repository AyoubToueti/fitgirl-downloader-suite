(function() {
'use strict';

class FitGirlOriginalLinksModal {
  constructor(downloader) {
    this.downloader = downloader;
    this.originalLinksHidden = false;
    this.linksModal = null;
    this.modalKeydownHandler = null;
  }

  toggleOriginalLinks() {
    this.originalLinksHidden = !this.originalLinksHidden;

    if (this.originalLinksHidden) {
      this.hideOriginalLinks();
    } else {
      this.showOriginalLinks();
    }
  }

  updateOriginalLinksButtonText() {
    const toggleBtn = this.downloader.cachedElements.toggleLinksBtn;
    if (!toggleBtn) return;
    toggleBtn.textContent = this.originalLinksHidden ?
      '👁️ Show Original Links' :
      '🙈 Hide Original Links';
  }

  hideOriginalLinks() {
    const toggleBtn = this.downloader.cachedElements.toggleLinksBtn;
    if (!toggleBtn) return;

    this.closeOriginalLinksModal();

    document.querySelectorAll('textarea[readonly], textarea#plaintext, pre:has(a[href*="fuckingfast.co"]), article:has(a[href*="fuckingfast.co"])').forEach((el) => {
      el.style.display = 'none';
    });

    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
      const text = heading.textContent.toLowerCase();
      if (text.includes('download') && text.includes('link')) {
        heading.style.display = 'none';
      }
    });

    this.originalLinksHidden = true;
    this.updateOriginalLinksButtonText();
  }

  showOriginalLinks() {
    const toggleBtn = this.downloader.cachedElements.toggleLinksBtn;

    this.originalLinksHidden = false;
    this.openOriginalLinksModal();

    if (toggleBtn) {
      toggleBtn.style.display = 'none';
    }
  }

  getOriginalDownloadLinks() {
    const links = [];
    const seenUrls = new Set();

    document.querySelectorAll('a[href*="fuckingfast.co"]').forEach((anchor) => {
      const url = anchor.href;
      if (!url || seenUrls.has(url)) return;

      seenUrls.add(url);
      links.push({
        url,
        text: (anchor.textContent || '').trim() || this.downloader.getFilenameFromUrl(url)
      });
    });

    return links;
  }

  openOriginalLinksModal() {
    if (this.linksModal) {
      return;
    }

    const links = this.getOriginalDownloadLinks();
    const overlay = document.createElement('div');
    overlay.className = 'fg-links-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'fg-links-modal';

    const header = document.createElement('div');
    header.className = 'fg-links-modal-header';
    header.innerHTML = `
      <h4>Original Download Links</h4>
      <button class="fg-links-modal-close" type="button" aria-label="Close">x</button>
    `;

    const body = document.createElement('div');
    body.className = 'fg-links-modal-body';

    if (links.length === 0) {
      body.innerHTML = '<p class="fg-links-modal-empty">No download links were found on this page.</p>';
    } else {
      const list = document.createElement('ul');
      list.className = 'fg-links-modal-list';

      links.forEach((link, index) => {
        const li = document.createElement('li');
        li.className = 'fg-links-modal-item';
        li.innerHTML = `
          <span class="fg-links-modal-index">${index + 1}.</span>
          <a class="fg-links-modal-link" href="${this.downloader.escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${this.downloader.escapeHtml(link.text)}</a>
        `;
        list.appendChild(li);
      });

      body.appendChild(list);
    }

    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        this.closeOriginalLinksModal();
      }
    });

    const closeButton = header.querySelector('.fg-links-modal-close');
    closeButton.addEventListener('click', () => {
      this.closeOriginalLinksModal();
    });

    this.modalKeydownHandler = (event) => {
      if (event.key === 'Escape' && this.linksModal) {
        this.closeOriginalLinksModal();
      }
    };

    document.addEventListener('keydown', this.modalKeydownHandler);
    document.body.classList.add('fg-links-modal-open');
    document.body.appendChild(overlay);
    this.linksModal = overlay;
  }

  closeOriginalLinksModal() {
    if (this.linksModal && this.linksModal.parentElement) {
      this.linksModal.parentElement.removeChild(this.linksModal);
    }
    this.linksModal = null;

    if (this.modalKeydownHandler) {
      document.removeEventListener('keydown', this.modalKeydownHandler);
      this.modalKeydownHandler = null;
    }

    this.originalLinksHidden = true;
    const toggleBtn = this.downloader.cachedElements.toggleLinksBtn;
    if (toggleBtn) {
      toggleBtn.style.display = '';
    }
    this.updateOriginalLinksButtonText();

    document.body.classList.remove('fg-links-modal-open');
  }

  destroy() {
    this.closeOriginalLinksModal();
  }
}

if (typeof self !== 'undefined') {
  self.FitGirlOriginalLinksModal = FitGirlOriginalLinksModal;
}

if (typeof window !== 'undefined') {
  window.FitGirlOriginalLinksModal = FitGirlOriginalLinksModal;
}

})();
