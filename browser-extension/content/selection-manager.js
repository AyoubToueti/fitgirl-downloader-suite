(function() {
'use strict';

class FitGirlSelectionManager {
  constructor(downloader) {
    this.downloader = downloader;
  }

  getSelectedFiles() {
    return this.downloader.fileItems.filter((item) => {
      if (item.isSkipped) return false;
      const checkbox = item.element.querySelector('.fg-checkbox');
      return checkbox && checkbox.checked;
    });
  }

  async handleSkipFile(url) {
    const fileItem = this.downloader.fileItems.find((item) => item.url === url);
    if (!fileItem) return;

    fileItem.isSkipped = true;
    fileItem.element.classList.add('fg-file-skipped');

    const checkbox = fileItem.element.querySelector('.fg-checkbox');
    if (checkbox) {
      checkbox.disabled = true;
      checkbox.checked = false;
    }

    const statusContainer = fileItem.element.querySelector('.fg-file-status');
    statusContainer.innerHTML = '<span class="fg-badge fg-badge-skipped">Skipped</span>';

    const actionsContainer = fileItem.element.querySelector('.fg-file-actions');
    actionsContainer.innerHTML = `<button class="fg-btn fg-btn-xs fg-undo-skip" data-url="${url}">↩️ Undo</button>`;

    this.downloader.refreshCheckboxCache();
    await this.downloader.saveSkippedFiles();
    this.downloader.updateCounter();
    this.downloader.showNotification('⏭️ Skipped', 'File marked as skipped');
  }

  async handleUndoSkip(url) {
    const fileItem = this.downloader.fileItems.find((item) => item.url === url);
    if (!fileItem) return;

    fileItem.isSkipped = false;
    fileItem.element.classList.remove('fg-file-skipped');

    const checkbox = fileItem.element.querySelector('.fg-checkbox');
    if (checkbox) {
      checkbox.disabled = false;
      checkbox.checked = true;
    }

    const statusContainer = fileItem.element.querySelector('.fg-file-status');
    statusContainer.innerHTML = '';

    const actionsContainer = fileItem.element.querySelector('.fg-file-actions');
    actionsContainer.innerHTML = `<button class="fg-btn fg-btn-xs fg-skip-file" data-url="${url}">⏭️ Skip</button>`;

    this.downloader.refreshCheckboxCache();
    await this.downloader.saveSkippedFiles();
    this.downloader.debouncedSaveSelections();
    this.downloader.updateCounter();
    this.downloader.showNotification('↩️ Restored', 'File restored to selection');
  }

  selectAll() {
    this.downloader.refreshCheckboxCache();
    this.downloader.checkboxElements.forEach((cb) => {
      if (!cb.disabled) cb.checked = true;
    });
    this.downloader.debouncedSaveSelections();
    this.downloader.updateCounter();
  }

  deselectAll() {
    this.downloader.refreshCheckboxCache();
    this.downloader.checkboxElements.forEach((cb) => {
      if (!cb.disabled) cb.checked = false;
    });
    this.downloader.debouncedSaveSelections();
    this.downloader.updateCounter();
  }

  toggleSelectAll() {
    this.downloader.refreshCheckboxCache();
    const { enabled, checkedEnabled } = this.downloader.getCheckboxStats();
    const shouldSelectAll = checkedEnabled < enabled / 2;

    this.downloader.checkboxElements.forEach((cb) => {
      if (!cb.disabled) cb.checked = shouldSelectAll;
    });

    this.downloader.debouncedSaveSelections();
    this.downloader.updateCounter();
    this.downloader.updateToggleButton();
  }

  updateToggleButton() {
    const toggleBtn = this.downloader.cachedElements.toggleSelectBtn;
    if (!toggleBtn) return;

    this.downloader.refreshCheckboxCache();
    const { enabled, checkedEnabled } = this.downloader.getCheckboxStats();

    if (checkedEnabled === 0) {
      toggleBtn.textContent = '☑️ Select All';
    } else if (checkedEnabled === enabled) {
      toggleBtn.textContent = '☐ Deselect All';
    } else {
      toggleBtn.textContent = '☑️ Select All';
    }
  }

  async resetSelection() {
    const state = await this.downloader.loadPageState();
    state.selections = {};
    await this.downloader.savePageState(state);

    this.downloader.refreshCheckboxCache();
    this.downloader.checkboxElements.forEach((cb) => {
      if (!cb.disabled) cb.checked = true;
    });

    this.downloader.updateCounter();
    this.downloader.showNotification('🔄 Reset', 'Selections reset to default');
  }
}

if (typeof self !== 'undefined') {
  self.FitGirlSelectionManager = FitGirlSelectionManager;
}

if (typeof window !== 'undefined') {
  window.FitGirlSelectionManager = FitGirlSelectionManager;
}

})();
