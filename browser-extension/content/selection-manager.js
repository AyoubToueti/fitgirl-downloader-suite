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
    this.downloader.updateToggleButton();
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
    actionsContainer.innerHTML = `
      <button class="fg-btn fg-btn-xs fg-download-file" data-url="${url}">⬇️ Download</button>
      <button class="fg-btn fg-btn-xs fg-skip-file" data-url="${url}">⏭️ Skip</button>
    `;

    this.downloader.refreshCheckboxCache();
    await this.downloader.saveSkippedFiles();
    this.downloader.debouncedSaveSelections();
    this.downloader.updateCounter();
    this.downloader.updateToggleButton();
    this.downloader.showNotification('↩️ Restored', 'File restored to selection');
  }

  selectAll() {
    this.downloader.refreshCheckboxCache();
    this.downloader.checkboxElements.forEach((cb) => {
      if (!cb.disabled) cb.checked = true;
    });
    this.downloader.debouncedSaveSelections();
    this.downloader.updateCounter();
    this.downloader.updateToggleButton();
  }

  deselectAll() {
    this.downloader.refreshCheckboxCache();
    this.downloader.checkboxElements.forEach((cb) => {
      if (!cb.disabled) cb.checked = false;
    });
    this.downloader.debouncedSaveSelections();
    this.downloader.updateCounter();
    this.downloader.updateToggleButton();
  }

  toggleSelectAll(forceSelectAll = null) {
    this.downloader.refreshCheckboxCache();
    const { enabled, checkedEnabled } = this.downloader.getCheckboxStats();
    const shouldSelectAll = typeof forceSelectAll === 'boolean'
      ? forceSelectAll
      : checkedEnabled !== enabled;

    if (enabled === 0) {
      this.updateToggleButton();
      return;
    }

    this.downloader.checkboxElements.forEach((cb) => {
      if (!cb.disabled) cb.checked = shouldSelectAll;
    });

    this.downloader.debouncedSaveSelections();
    this.downloader.updateCounter();
    this.downloader.updateToggleButton();
  }

  updateToggleButton() {
    const toggleCheckbox = this.downloader.cachedElements.toggleSelectCheckbox;
    const toggleText = this.downloader.cachedElements.toggleSelectText;
    if (!toggleCheckbox) return;

    this.downloader.refreshCheckboxCache();
    const { enabled, checkedEnabled } = this.downloader.getCheckboxStats();

    if (enabled === 0) {
      toggleCheckbox.checked = false;
      toggleCheckbox.indeterminate = false;
      toggleCheckbox.disabled = true;
      if (toggleText) {
        toggleText.textContent = 'Select All';
      }
      return;
    }

    toggleCheckbox.disabled = false;
    toggleCheckbox.checked = checkedEnabled === enabled;
    toggleCheckbox.indeterminate = checkedEnabled > 0 && checkedEnabled < enabled;
    if (toggleText) {
      toggleText.textContent = checkedEnabled > 0 ? 'Deselect All' : 'Select All';
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
    this.downloader.updateToggleButton();
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
