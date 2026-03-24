(function() {
'use strict';

class FitGirlLinkListManager {
  constructor(downloader) {
    this.downloader = downloader;
  }

  async extractAndDisplayLinks() {
    const links = this.getAllDownloadLinks();
    const fileListContainer = this.downloader.cachedElements.fileList;

    if (!fileListContainer) return;

    const state = await this.downloader.loadPageState();
    const selections = state.selections || {};
    const skippedFiles = state.skipped || [];

    this.downloader.fileItems = [];

    const fragment = document.createDocumentFragment();

    links.forEach((link, index) => {
      const fileItem = this.createFileItem(link, index, selections, skippedFiles);
      fragment.appendChild(fileItem.element);
      this.downloader.fileItems.push(fileItem);
    });

    fileListContainer.appendChild(fragment);

    this.downloader.refreshCheckboxCache();

    this.downloader.updateCounter();
    this.downloader.updateToggleButton();

    this.delegateFileItemEvents();
  }

  createFileItem(link, index, selections, skippedFiles) {
    const fileItem = document.createElement('div');
    fileItem.className = 'fg-file-item';
    fileItem.dataset.url = link.url;
    fileItem.dataset.index = index;

    const isSkipped = skippedFiles.includes(link.url);
    const isSelected = selections[link.url] !== false;

    if (isSkipped) {
      fileItem.classList.add('fg-file-skipped');
    }

    fileItem.innerHTML = `
      <div class="fg-file-checkbox">
        <input type="checkbox"
               class="fg-checkbox"
               data-url="${link.url}"
               ${isSelected ? 'checked' : ''}
               ${isSkipped ? 'disabled' : ''}>
      </div>
      <div class="fg-file-info">
        <div class="fg-file-name">${this.downloader.escapeHtml(this.downloader.getFilenameFromUrl(link.url))}</div>
        <div class="fg-file-url">${this.downloader.escapeHtml(link.url)}</div>
      </div>
      <div class="fg-file-status">
        ${isSkipped ? '<span class="fg-badge fg-badge-skipped">Skipped</span>' : ''}
      </div>
      <div class="fg-file-actions">
        ${isSkipped ?
        `<button class="fg-btn fg-btn-xs fg-undo-skip" data-url="${link.url}">↩️ Undo</button>` :
        `<button class="fg-btn fg-btn-xs fg-download-file" data-url="${link.url}">⬇️ Download</button>
         <button class="fg-btn fg-btn-xs fg-skip-file" data-url="${link.url}">⏭️ Skip</button>`
      }
      </div>
    `;

    return {
      element: fileItem,
      url: link.url,
      text: link.text,
      index,
      isSkipped
    };
  }

  delegateFileItemEvents() {
    const fileList = this.downloader.cachedElements.fileList;
    if (!fileList || fileList.dataset.fgDelegated === 'true') {
      return;
    }

    fileList.dataset.fgDelegated = 'true';

    fileList.addEventListener('change', (e) => {
      if (e.target.classList.contains('fg-checkbox')) {
        this.downloader.refreshCheckboxCache();
        this.downloader.debouncedSaveSelections();
        this.downloader.debouncedUpdateCounter();
        this.downloader.updateToggleButton();
      }
    });

    fileList.addEventListener('click', (e) => {
      const target = e.target;

      if (target.classList.contains('fg-download-file')) {
        e.stopPropagation();
        this.downloader.downloadSingleFile(target.dataset.url);
      } else if (target.classList.contains('fg-skip-file')) {
        e.stopPropagation();
        this.downloader.handleSkipFile(target.dataset.url);
      } else if (target.classList.contains('fg-undo-skip')) {
        e.stopPropagation();
        this.downloader.handleUndoSkip(target.dataset.url);
      } else if (target.classList.contains('fg-retry-file')) {
        e.stopPropagation();
        this.downloader.retryFile(target.dataset.url);
      }
    });

    fileList.addEventListener('click', (e) => {
      const fileItem = e.target.closest('.fg-file-item');
      if (!fileItem) return;

      if (
        e.target.tagName === 'BUTTON' ||
        e.target.tagName === 'A' ||
        e.target.classList.contains('fg-checkbox') ||
        e.target.closest('button')
      ) {
        return;
      }

      const checkbox = fileItem.querySelector('.fg-checkbox');
      if (checkbox && !checkbox.disabled) {
        checkbox.checked = !checkbox.checked;
        this.downloader.refreshCheckboxCache();
        this.downloader.debouncedSaveSelections();
        this.downloader.debouncedUpdateCounter();
        this.downloader.updateToggleButton();
      }
    });
  }

  getAllDownloadLinks() {
    const uniqueUrls = new Set();
    const links = [];

    const linkElements = document.querySelectorAll('a[href*="fuckingfast.co"]');

    for (const element of linkElements) {
      const url = element.href;
      if (url && !url.includes('optional') && !uniqueUrls.has(url)) {
        uniqueUrls.add(url);
        links.push({
          url,
          element,
          text: element.textContent.trim()
        });
      }
    }

    console.log(`FitGirl Downloader: Found ${links.length} download links`);
    return links;
  }
}

if (typeof self !== 'undefined') {
  self.FitGirlLinkListManager = FitGirlLinkListManager;
}

if (typeof window !== 'undefined') {
  window.FitGirlLinkListManager = FitGirlLinkListManager;
}

})();
