// Optimized background service worker

// Import config - wrapped in try-catch for error handling
try {
  importScripts('../shared/config.js');
} catch (error) {
  console.error('Failed to load config.js:', error);
  // Define minimal CONFIG fallback
  self.CONFIG = {
    STORAGE_KEYS: {
      COMPLETED_URLS: 'completed_urls',
      FAILED_URLS: 'failed_urls',
      PAUSE_STATE: 'pause_state',
      DOWNLOAD_STATS: 'download_stats'
    },
    PATTERNS: {
      WINDOW_OPEN_REGEX: /window\.open\(["']([^"']+\/dl\/[^"']+)["']/
    }
  };
}

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

console.log('FitGirl Downloader: Background service worker loaded');

// Cache for extracted URLs (prevent redundant fetches)
const urlCache = new Map();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Batch notification queue
let notificationQueue = [];
let notificationTimeout = null;

browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action);

  switch (request.action) {
    case 'extractDownloadUrl':
      handleExtractDownloadUrl(request, sendResponse);
      return true;

    case 'download':
      handleDownload(request, sendResponse);
      return true;

    case 'getStorage':
      handleGetStorage(request, sendResponse);
      return true;

    case 'setStorage':
      handleSetStorage(request, sendResponse);
      return true;

    case 'showNotification':
      handleShowNotification(request, sendResponse);
      return true;

    case 'updateStats':
      handleUpdateStats(request, sendResponse);
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
      return false;
  }
});

/**
 * Extract real download URL from fuckingfast.co page
 */
async function handleExtractDownloadUrl(request, sendResponse) {
  const { url } = request;

  try {
    // Check cache first
    const cached = urlCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
      console.log('Using cached download URL');
      sendResponse({ success: true, downloadUrl: cached.downloadUrl });
      return;
    }

    console.log('Extracting download URL from:', url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const match = html.match(CONFIG.PATTERNS.WINDOW_OPEN_REGEX);

    if (match && match[1]) {
      const downloadUrl = match[1];
      
      // Cache the result
      urlCache.set(url, {
        downloadUrl: downloadUrl,
        timestamp: Date.now()
      });

      // Limit cache size
      if (urlCache.size > 100) {
        const firstKey = urlCache.keys().next().value;
        urlCache.delete(firstKey);
      }

      console.log('Extracted download URL:', downloadUrl);
      sendResponse({ success: true, downloadUrl: downloadUrl });
    } else {
      throw new Error('No /dl/ URL found in page');
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Request timeout');
      sendResponse({ success: false, error: 'Request timeout' });
    } else {
      console.error('Failed to extract download URL:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
}

/**
 * Handle download request
 */
async function handleDownload(request, sendResponse) {
  const { url, filename } = request;

  try {
    console.log('Starting download:', { url, filename });

    const downloadId = await browserAPI.downloads.download({
      url: url,
      filename: filename,
      saveAs: false,
      conflictAction: 'uniquify'
    });

    monitorDownload(downloadId);

    sendResponse({ success: true, downloadId: downloadId });
  } catch (error) {
    console.error('Download failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Monitor download progress and update badge
 */
function monitorDownload(downloadId) {
  const listener = (delta) => {
    if (delta.id !== downloadId) return;

    if (delta.state && delta.state.current === 'complete') {
      console.log(`Download ${downloadId} completed`);
      browserAPI.downloads.onChanged.removeListener(listener);
    } else if (delta.error) {
      console.error(`Download ${downloadId} failed:`, delta.error.current);
      browserAPI.downloads.onChanged.removeListener(listener);
    }
  };

  browserAPI.downloads.onChanged.addListener(listener);
}

/**
 * Get storage data
 */
async function handleGetStorage(request, sendResponse) {
  const { keys } = request;

  try {
    browserAPI.storage.local.get(keys, (result) => {
      if (browserAPI.runtime.lastError) {
        sendResponse({ success: false, error: browserAPI.runtime.lastError.message });
      } else {
        sendResponse({ success: true, data: result });
      }
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Set storage data
 */
async function handleSetStorage(request, sendResponse) {
  const { data } = request;

  try {
    browserAPI.storage.local.set(data, () => {
      if (browserAPI.runtime.lastError) {
        sendResponse({ success: false, error: browserAPI.runtime.lastError.message });
      } else {
        sendResponse({ success: true });
      }
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Show browser notification
 */
async function handleShowNotification(request, sendResponse) {
  const { title, message } = request;

  // Queue notification
  notificationQueue.push({ title, message });

  // Clear existing timeout
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }

  // Show last notification after 500ms of inactivity
  notificationTimeout = setTimeout(async () => {
    if (notificationQueue.length === 0) return;

    const notification = notificationQueue[notificationQueue.length - 1];
    notificationQueue = [];

    try {
      await browserAPI.notifications.create({
        type: 'basic',
        iconUrl: browserAPI.runtime.getURL('icons/icon128.png'),
        title: notification.title,
        message: notification.message,
        priority: 1
      });
      
      sendResponse({ success: true });
    } catch (error) {
      console.error('Notification failed:', error);
      sendResponse({ success: false, error: error.message });
    }
  }, 500);
}

/**
 * Update download statistics
 */
async function handleUpdateStats(request, sendResponse) {
  const { type, url, error } = request;

  try {
    browserAPI.storage.local.get([
      CONFIG.STORAGE_KEYS.COMPLETED_URLS,
      CONFIG.STORAGE_KEYS.FAILED_URLS,
      CONFIG.STORAGE_KEYS.DOWNLOAD_STATS
    ], (result) => {
      const completedUrls = result[CONFIG.STORAGE_KEYS.COMPLETED_URLS] || [];
      const failedUrls = result[CONFIG.STORAGE_KEYS.FAILED_URLS] || [];
      const stats = result[CONFIG.STORAGE_KEYS.DOWNLOAD_STATS] || {
        totalDownloads: 0,
        successfulDownloads: 0,
        failedDownloads: 0,
        lastUpdated: null
      };

      if (type === 'success') {
        if (!completedUrls.includes(url)) {
          completedUrls.push(url);
        }
        
        // Remove from failed if present
        const failedIndex = failedUrls.findIndex(f => f.url === url);
        if (failedIndex !== -1) {
          failedUrls.splice(failedIndex, 1);
          stats.failedDownloads = Math.max(0, stats.failedDownloads - 1);
        }
        
        stats.successfulDownloads++;
        stats.totalDownloads++;
      } else if (type === 'failure') {
        const existingFailed = failedUrls.find(f => f.url === url);
        if (existingFailed) {
          existingFailed.error = error;
          existingFailed.timestamp = Date.now();
        } else {
          failedUrls.push({
            url: url,
            error: error,
            timestamp: Date.now()
          });
          stats.failedDownloads++;
        }
        stats.totalDownloads++;
      }

      stats.lastUpdated = Date.now();

      browserAPI.storage.local.set({
        [CONFIG.STORAGE_KEYS.COMPLETED_URLS]: completedUrls,
        [CONFIG.STORAGE_KEYS.FAILED_URLS]: failedUrls,
        [CONFIG.STORAGE_KEYS.DOWNLOAD_STATS]: stats
      }, () => {
        updateBadge(stats);
        sendResponse({ success: true });
      });
    });
  } catch (error) {
    console.error('Failed to update stats:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Update extension badge
 */
function updateBadge(stats) {
  const failedCount = stats.failedDownloads || 0;

  if (failedCount > 0) {
    browserAPI.action.setBadgeText({ text: failedCount.toString() });
    browserAPI.action.setBadgeBackgroundColor({ color: '#ef4444' });
  } else {
    browserAPI.action.setBadgeText({ text: '' });
  }
}

/**
 * Initialize extension
 */
async function initialize() {
  console.log('Initializing FitGirl Downloader extension...');

  browserAPI.storage.local.get([CONFIG.STORAGE_KEYS.DOWNLOAD_STATS], (result) => {
    const stats = result[CONFIG.STORAGE_KEYS.DOWNLOAD_STATS];
    if (stats) {
      updateBadge(stats);
    }
  });

  console.log('FitGirl Downloader extension initialized');
}

// Initialize on install/update
browserAPI.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');
    initialize();
  } else if (details.reason === 'update') {
    console.log('Extension updated');
    initialize();
  }
});

initialize();

// Periodic cache cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of urlCache.entries()) {
    if (now - value.timestamp > CACHE_EXPIRY) {
      urlCache.delete(key);
    }
  }
}, 60000); // Every minute
