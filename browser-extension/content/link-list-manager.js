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
    const sizeResults = state.sizeResults || {};

    this.downloader.fileItems = [];

    const fragment = document.createDocumentFragment();

    links.forEach((link, index) => {
      const fileItem = this.createFileItem(link, index, selections, skippedFiles, sizeResults);
      fragment.appendChild(fileItem.element);
      this.downloader.fileItems.push(fileItem);
    });

    fileListContainer.appendChild(fragment);

    this.downloader.refreshCheckboxCache();

    this.downloader.updateCounter();
    this.downloader.updateToggleButton();

    this.delegateFileItemEvents();
    this.applySizeResults(sizeResults);
  }

  createFileItem(link, index, selections, skippedFiles, sizeResults) {
    const fileItem = document.createElement('div');
    fileItem.className = 'fg-file-item';
    fileItem.dataset.url = link.url;
    fileItem.dataset.index = index;

    const isSkipped = skippedFiles.includes(link.url);
    const isSelected = selections[link.url] !== false;
    const sizeResult = sizeResults[link.url] || null;
    const sizeText = this.formatSizeResult(sizeResult);

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
        <div class="fg-file-size" data-size-url="${link.url}">${sizeText}</div>
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

  applySizeResults(sizeResults = {}, progressMeta = null) {
    if (!sizeResults || typeof sizeResults !== 'object') {
      return;
    }

    const fileList = this.downloader.cachedElements.fileList;
    if (!fileList) {
      return;
    }

    const allSizeNodes = fileList.querySelectorAll('.fg-file-size[data-size-url]');
    allSizeNodes.forEach((sizeNode) => {
      const url = sizeNode.dataset.sizeUrl;
      const result = sizeResults[url] || null;
      sizeNode.textContent = this.formatSizeResult(result);
      sizeNode.classList.toggle('is-known', !!(result && result.status === CONFIG.SIZE_STATUS.KNOWN && Number.isFinite(result.bytes)));
      sizeNode.classList.toggle('is-unknown', !!(result && result.status !== CONFIG.SIZE_STATUS.KNOWN));
    });

    this.renderPackageSummary(sizeResults, progressMeta);
  }

  renderPackageSummary(sizeResults = {}, progressMeta = null) {
    const summaryContainer = this.downloader.cachedElements.packageSummary;
    if (!summaryContainer) {
      return;
    }

    const groups = this.buildPackageGroups(sizeResults);
    if (groups.length === 0) {
      summaryContainer.innerHTML = '';
      return;
    }

    const runningSuffix = progressMeta && progressMeta.status === CONFIG.SIZE_STATUS.RUNNING
      ? ` · ${progressMeta.processed || 0}/${progressMeta.total || 0}`
      : '';

    const rows = groups
      .sort((a, b) => b.totalBytes - a.totalBytes)
      .slice(0, 10)
      .map((group) => {
        const totalText = group.knownCount > 0 ? this.formatBytes(group.totalBytes) : 'Unknown';
        const meta = `${group.knownCount}/${group.fileCount} known`;
        return `<li><span class="fg-package-name">${this.downloader.escapeHtml(group.name)}</span><span class="fg-package-size">${totalText}</span><span class="fg-package-meta">${meta}</span></li>`;
      })
      .join('');

    summaryContainer.innerHTML = `
      <div class="fg-package-summary-title">Package totals${runningSuffix}</div>
      <ul class="fg-package-summary-list">${rows}</ul>
    `;
  }

  buildPackageGroups(sizeResults = {}) {
    const groupMap = new Map();

    this.downloader.fileItems.forEach((item) => {
      const packageName = this.derivePackageName(item.url);
      if (!groupMap.has(packageName)) {
        groupMap.set(packageName, {
          name: packageName,
          totalBytes: 0,
          fileCount: 0,
          knownCount: 0
        });
      }

      const group = groupMap.get(packageName);
      const sizeResult = sizeResults[item.url];

      group.fileCount += 1;
      if (sizeResult && sizeResult.status === CONFIG.SIZE_STATUS.KNOWN && Number.isFinite(sizeResult.bytes)) {
        group.knownCount += 1;
        group.totalBytes += sizeResult.bytes;
      }
    });

    return Array.from(groupMap.values());
  }

  derivePackageName(url) {
    const filename = this.downloader.getFilenameFromUrl(url);
    const decoded = decodeURIComponent(filename).trim();
    const noExt = decoded.replace(/\.[a-z0-9]{2,5}$/i, '');
    const compact = noExt
      .replace(/[_\.\-]+/g, ' ')
      .replace(/\b(part|pt|disk|disc|cd|dvd)\s*0*\d+\b/gi, '')
      .replace(/\b0*\d{1,3}\b$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return compact || noExt || decoded;
  }

  formatSizeResult(result) {
    if (!result) {
      return 'Size: not calculated';
    }

    if (result.status === CONFIG.SIZE_STATUS.KNOWN && Number.isFinite(result.bytes)) {
      return `Size: ${this.formatBytes(result.bytes)}`;
    }

    if (result.status === CONFIG.SIZE_STATUS.UNKNOWN) {
      return 'Size: unknown';
    }

    return 'Size: calculating...';
  }

  formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, exponent);
    const decimals = value >= 10 || exponent === 0 ? 0 : 1;

    return `${value.toFixed(decimals)} ${units[exponent]}`;
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

  filterFileItems(rawQuery = '') {
    const query = (rawQuery || '').trim().toLowerCase();

    this.downloader.fileItems.forEach((item) => {
      const filename = this.downloader.getFilenameFromUrl(item.url).toLowerCase();
      const url = item.url.toLowerCase();
      const matches = !query || filename.includes(query) || url.includes(query);
      item.element.style.display = matches ? '' : 'none';
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
