// popup/popup.js
// Popup script for FitGirl Downloader Extension

// Cross-browser API compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// DOM Elements
const elements = {
  totalDownloads: document.getElementById('total-downloads'),
  successfulDownloads: document.getElementById('successful-downloads'),
  failedDownloads: document.getElementById('failed-downloads'),
  progressSection: document.getElementById('progress-section'),
  progressFill: document.getElementById('progress-fill'),
  progressPercentage: document.getElementById('progress-percentage'),
  progressText: document.getElementById('progress-text'),
  pauseState: document.getElementById('pause-state'),
  pauseDetails: document.getElementById('pause-details'),
  resumeBtn: document.getElementById('resume-btn'),
  retryAllBtn: document.getElementById('retry-all-btn'),
  failedCountBadge: document.getElementById('failed-count-badge'),
  viewFailedBtn: document.getElementById('view-failed-btn'),
  clearLogsBtn: document.getElementById('clear-logs-btn'),
  failedList: document.getElementById('failed-list'),
  failedItems: document.getElementById('failed-items'),
  closeFailedList: document.getElementById('close-failed-list'),
  statusMessage: document.getElementById('status-message'),
  lastUpdated: document.getElementById('last-updated')
};

// Storage keys (from config)
const STORAGE_KEYS = {
  COMPLETED_URLS: 'completed_urls',
  FAILED_URLS: 'failed_urls',
  PAUSE_STATE: 'pause_state',
  DOWNLOAD_STATS: 'download_stats'
};

// Initialize popup
async function init() {
  console.log('FitGirl Downloader: Popup initializing...');
  
  await loadStats();
  await checkPauseState();
  bindEventHandlers();
  
  // Listen for storage changes
  browserAPI.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      handleStorageChange(changes);
    }
  });
  
  console.log('FitGirl Downloader: Popup initialized');
}

// Load statistics from storage
async function loadStats() {
  try {
    const keys = [
      STORAGE_KEYS.COMPLETED_URLS,
      STORAGE_KEYS.FAILED_URLS,
      STORAGE_KEYS.DOWNLOAD_STATS
    ];
    
    browserAPI.storage.local.get(keys, (result) => {
      const completedUrls = result[STORAGE_KEYS.COMPLETED_URLS] || [];
      const failedUrls = result[STORAGE_KEYS.FAILED_URLS] || [];
      const stats = result[STORAGE_KEYS.DOWNLOAD_STATS] || {
        totalDownloads: 0,
        successfulDownloads: 0,
        failedDownloads: 0,
        lastUpdated: null
      };
      
      // Update UI
      updateStatsUI(stats, completedUrls.length, failedUrls.length);
      updateFailedList(failedUrls);
    });
  } catch (error) {
    console.error('Error loading stats:', error);
    showStatus('Error loading statistics', 'error');
  }
}

// Update statistics UI
function updateStatsUI(stats, completedCount, failedCount) {
  elements.totalDownloads.textContent = stats.totalDownloads || 0;
  elements.successfulDownloads.textContent = completedCount;
  elements.failedDownloads.textContent = failedCount;
  
  // Update failed count badge
  if (failedCount > 0) {
    elements.failedCountBadge.textContent = failedCount;
    elements.failedCountBadge.style.display = 'inline-block';
    elements.retryAllBtn.disabled = false;
  } else {
    elements.failedCountBadge.style.display = 'none';
    elements.retryAllBtn.disabled = true;
  }
  
  // Update last updated time
  if (stats.lastUpdated) {
    elements.lastUpdated.textContent = `Updated ${formatTimestamp(stats.lastUpdated)}`;
  }
}

// Check pause state
async function checkPauseState() {
  try {
    browserAPI.storage.local.get([STORAGE_KEYS.PAUSE_STATE], (result) => {
      const pauseState = result[STORAGE_KEYS.PAUSE_STATE];
      
      if (pauseState && pauseState.isPaused) {
        // Check if expired
        const isExpired = isPauseExpired(pauseState.pausedAt);
        
        if (isExpired) {
          // Clear expired pause state
          browserAPI.storage.local.set({ [STORAGE_KEYS.PAUSE_STATE]: null });
          elements.pauseState.style.display = 'none';
        } else {
          // Show pause state
          showPauseState(pauseState);
        }
      } else {
        elements.pauseState.style.display = 'none';
      }
    });
  } catch (error) {
    console.error('Error checking pause state:', error);
  }
}

// Show pause state
function showPauseState(pauseState) {
  elements.pauseState.style.display = 'flex';
  
  const pageUrl = new URL(pauseState.pageUrl);
  const pageName = pageUrl.pathname.split('/').filter(s => s).pop() || 'Unknown';
  const timeAgo = formatTimestamp(pauseState.pausedAt);
  
  elements.pauseDetails.textContent = `Paused ${timeAgo} on ${pageName}`;
  
  elements.resumeBtn.onclick = () => {
    // Navigate to the paused page
    browserAPI.tabs.create({ url: pauseState.pageUrl }, () => {
      window.close();
    });
  };
}

// Update failed URLs list
function updateFailedList(failedUrls) {
  if (!failedUrls || failedUrls.length === 0) {
    elements.failedItems.innerHTML = '<p class="no-failed">No failed downloads</p>';
    return;
  }
  
  elements.failedItems.innerHTML = '';
  
  failedUrls.forEach((failed, index) => {
    const url = typeof failed === 'string' ? failed : failed.url;
    const error = typeof failed === 'object' ? failed.error : 'Unknown error';
    const timestamp = typeof failed === 'object' ? failed.timestamp : null;
    
    const item = document.createElement('div');
    item.className = 'failed-item';
    item.innerHTML = `
      <div class="failed-item-header">
        <span class="failed-item-number">#${index + 1}</span>
        <span class="failed-item-time">${timestamp ? formatTimestamp(timestamp) : ''}</span>
      </div>
      <div class="failed-item-url">${url}</div>
      <div class="failed-item-error">${error}</div>
      <button class="btn btn-xs btn-retry-single" data-url="${url}">
        <span class="btn-icon">🔄</span>
        <span>Retry</span>
      </button>
    `;
    
    elements.failedItems.appendChild(item);
  });
  
  // Bind retry buttons
  document.querySelectorAll('.btn-retry-single').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const url = e.currentTarget.dataset.url;
      retryFailedUrl(url);
    });
  });
}

// Bind event handlers
function bindEventHandlers() {
  // Retry all failed button
  elements.retryAllBtn.addEventListener('click', retryAllFailed);
  
  // View failed button
  elements.viewFailedBtn.addEventListener('click', () => {
    elements.failedList.style.display = 'block';
  });
  
  // Close failed list button
  elements.closeFailedList.addEventListener('click', () => {
    elements.failedList.style.display = 'none';
  });
  
  // Clear logs button
  elements.clearLogsBtn.addEventListener('click', clearLogs);
}

// Retry all failed downloads
async function retryAllFailed() {
  try {
    showStatus('Retrying all failed downloads...', 'info');
    
    browserAPI.storage.local.get([STORAGE_KEYS.FAILED_URLS], async (result) => {
      const failedUrls = result[STORAGE_KEYS.FAILED_URLS] || [];
      
      if (failedUrls.length === 0) {
        showStatus('No failed downloads to retry', 'info');
        return;
      }
      
      // This would require the content script to handle retry
      // For now, just notify the user
      showStatus(`${failedUrls.length} failed downloads found. Please visit the download page to retry.`, 'info');
      
      // Optional: Open the first failed URL's page
      if (failedUrls.length > 0) {
        const firstFailed = typeof failedUrls[0] === 'string' ? failedUrls[0] : failedUrls[0].url;
        
        const shouldOpen = confirm(`Open the download page to retry failed downloads?`);
        if (shouldOpen) {
          // Try to extract the page URL from the download URL
          const pageUrl = extractPageUrl(firstFailed);
          browserAPI.tabs.create({ url: pageUrl });
          window.close();
        }
      }
    });
  } catch (error) {
    console.error('Error retrying failed downloads:', error);
    showStatus('Error retrying downloads', 'error');
  }
}

// Retry single failed URL
async function retryFailedUrl(url) {
  try {
    showStatus(`Retrying ${getFilenameFromUrl(url)}...`, 'info');
    
    // Extract page URL and open it
    const pageUrl = extractPageUrl(url);
    browserAPI.tabs.create({ url: pageUrl });
    window.close();
  } catch (error) {
    console.error('Error retrying URL:', error);
    showStatus('Error retrying download', 'error');
  }
}

// Clear all logs
async function clearLogs() {
  const confirmed = confirm('Are you sure you want to clear all download logs? This cannot be undone.');
  
  if (!confirmed) return;
  
  try {
    const clearData = {
      [STORAGE_KEYS.COMPLETED_URLS]: [],
      [STORAGE_KEYS.FAILED_URLS]: [],
      [STORAGE_KEYS.DOWNLOAD_STATS]: {
        totalDownloads: 0,
        successfulDownloads: 0,
        failedDownloads: 0,
        lastUpdated: Date.now()
      }
    };
    
    browserAPI.storage.local.set(clearData, () => {
      showStatus('Logs cleared successfully', 'success');
      loadStats();
      
      // Clear badge
      browserAPI.action.setBadgeText({ text: '' });
    });
  } catch (error) {
    console.error('Error clearing logs:', error);
    showStatus('Error clearing logs', 'error');
  }
}

// Handle storage changes
function handleStorageChange(changes) {
  if (changes[STORAGE_KEYS.DOWNLOAD_STATS] || 
      changes[STORAGE_KEYS.COMPLETED_URLS] || 
      changes[STORAGE_KEYS.FAILED_URLS]) {
    loadStats();
  }
  
  if (changes[STORAGE_KEYS.PAUSE_STATE]) {
    checkPauseState();
  }
}

// Show status message
function showStatus(message, type = 'info') {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `footer-status status-${type}`;
  
  // Auto-clear after 3 seconds
  setTimeout(() => {
    elements.statusMessage.textContent = 'Ready';
    elements.statusMessage.className = 'footer-status';
  }, 3000);
}

// Utility functions
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function isPauseExpired(pausedAt) {
  const PAUSE_EXPIRATION_TIME = 60 * 60 * 1000; // 1 hour
  const now = Date.now();
  return (now - pausedAt) > PAUSE_EXPIRATION_TIME;
}

function getFilenameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const segments = pathname.split('/').filter(s => s);
    return segments[segments.length - 1] || 'unknown';
  } catch (error) {
    const match = url.match(/([^\/#]+)(?=#|$)/);
    return match ? match[1] : 'unknown';
  }
}

function extractPageUrl(downloadUrl) {
  // Try to extract the original page URL from the download URL
  // This is a best-effort approach
  if (downloadUrl.includes('fuckingfast.co')) {
    return downloadUrl.split('/dl/')[0] || downloadUrl;
  }
  return downloadUrl;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
