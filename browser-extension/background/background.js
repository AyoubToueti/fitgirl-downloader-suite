// background/background.js
// Background service worker for FitGirl Downloader Extension

// Import config (Note: In MV3, we need to load via importScripts or fetch)
importScripts('../shared/config.js');

// Cross-browser API compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

console.log('FitGirl Downloader: Background service worker loaded');

// Message handler
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action);
  
  switch (request.action) {
    case 'extractDownloadUrl':
      handleExtractDownloadUrl(request, sendResponse);
      return true; // Async response
      
    case 'download':
      handleDownload(request, sendResponse);
      return true; // Async response
      
    case 'getStorage':
      handleGetStorage(request, sendResponse);
      return true; // Async response
      
    case 'setStorage':
      handleSetStorage(request, sendResponse);
      return true; // Async response
      
    case 'showNotification':
      handleShowNotification(request, sendResponse);
      return true; // Async response
      
    case 'updateStats':
      handleUpdateStats(request, sendResponse);
      return true; // Async response
      
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
    console.log('Extracting download URL from:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    const match = html.match(CONFIG.PATTERNS.WINDOW_OPEN_REGEX);
    
    if (match && match[1]) {
      const downloadUrl = match[1];
      console.log('Extracted download URL:', downloadUrl);
      sendResponse({ success: true, downloadUrl: downloadUrl });
    } else {
      throw new Error('No /dl/ URL found in page');
    }
  } catch (error) {
    console.error('Failed to extract download URL:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle download request
 */
async function handleDownload(request, sendResponse) {
  const { url, filename } = request;
  
  try {
    console.log('Starting download:', url);
    
    // Sanitize filename
    const sanitizedFilename = filename
      ? filename.replace(/[<>:"/\\|?*]/g, '_')
      : `fitgirl_download_${Date.now()}`;
    
    browserAPI.downloads.download({
      url: url,
      filename: sanitizedFilename,
      saveAs: false,
      conflictAction: 'uniquify'
    }, (downloadId) => {
      if (browserAPI.runtime.lastError) {
        console.error('Download failed:', browserAPI.runtime.lastError);
        sendResponse({ 
          success: false, 
          error: browserAPI.runtime.lastError.message 
        });
      } else {
        console.log('Download started with ID:', downloadId);
        sendResponse({ success: true, downloadId: downloadId });
        
        // Monitor download progress
        monitorDownload(downloadId);
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Monitor download progress and update badge
 */
function monitorDownload(downloadId) {
  const checkDownload = () => {
    browserAPI.downloads.search({ id: downloadId }, (downloads) => {
      if (downloads.length === 0) return;
      
      const download = downloads[0];
      
      if (download.state === 'complete') {
        console.log('Download completed:', downloadId);
      } else if (download.state === 'interrupted') {
        console.error('Download interrupted:', downloadId, download.error);
      } else if (download.state === 'in_progress') {
        // Still downloading, check again
        setTimeout(checkDownload, 1000);
      }
    });
  };
  
  checkDownload();
}

/**
 * Get storage data
 */
async function handleGetStorage(request, sendResponse) {
  const { keys } = request;
  
  browserAPI.storage.local.get(keys, (result) => {
    if (browserAPI.runtime.lastError) {
      sendResponse({ success: false, error: browserAPI.runtime.lastError.message });
    } else {
      sendResponse({ success: true, data: result });
    }
  });
}

/**
 * Set storage data
 */
async function handleSetStorage(request, sendResponse) {
  const { data } = request;
  
  browserAPI.storage.local.set(data, () => {
    if (browserAPI.runtime.lastError) {
      sendResponse({ success: false, error: browserAPI.runtime.lastError.message });
    } else {
      sendResponse({ success: true });
    }
  });
}

/**
 * Show browser notification
 */
async function handleShowNotification(request, sendResponse) {
  const { title, message, type = 'basic' } = request;
  
  const notificationOptions = {
    type: type,
    iconUrl: browserAPI.runtime.getURL('icons/icon48.png'),
    title: title,
    message: message
  };
  
  browserAPI.notifications.create('', notificationOptions, (notificationId) => {
    if (browserAPI.runtime.lastError) {
      sendResponse({ success: false, error: browserAPI.runtime.lastError.message });
    } else {
      sendResponse({ success: true, notificationId: notificationId });
      
      // Auto-clear after timeout
      setTimeout(() => {
        browserAPI.notifications.clear(notificationId);
      }, CONFIG.NOTIFICATION_TIMEOUT);
    }
  });
}

/**
 * Update download statistics
 */
async function handleUpdateStats(request, sendResponse) {
  const { type, url, error } = request;
  
  try {
    const keys = [
      CONFIG.STORAGE_KEYS.COMPLETED_URLS,
      CONFIG.STORAGE_KEYS.FAILED_URLS,
      CONFIG.STORAGE_KEYS.DOWNLOAD_STATS
    ];
    
    browserAPI.storage.local.get(keys, (result) => {
      const completedUrls = result[CONFIG.STORAGE_KEYS.COMPLETED_URLS] || [];
      const failedUrls = result[CONFIG.STORAGE_KEYS.FAILED_URLS] || [];
      const stats = result[CONFIG.STORAGE_KEYS.DOWNLOAD_STATS] || {
        totalDownloads: 0,
        successfulDownloads: 0,
        failedDownloads: 0,
        lastUpdated: Date.now()
      };
      
      if (type === 'success') {
        // Add to completed
        if (!completedUrls.includes(url)) {
          completedUrls.push(url);
        }
        
        // Remove from failed if it was there
        const failedIndex = failedUrls.findIndex(f => 
          typeof f === 'string' ? f === url : f.url === url
        );
        if (failedIndex !== -1) {
          failedUrls.splice(failedIndex, 1);
        }
        
        stats.totalDownloads++;
        stats.successfulDownloads++;
        
      } else if (type === 'failure') {
        // Add to failed
        const failedEntry = {
          url: url,
          error: error || 'Unknown error',
          timestamp: Date.now()
        };
        
        // Remove existing entry for this URL
        const existingIndex = failedUrls.findIndex(f => 
          typeof f === 'string' ? f === url : f.url === url
        );
        if (existingIndex !== -1) {
          failedUrls.splice(existingIndex, 1);
        }
        
        failedUrls.push(failedEntry);
        
        stats.totalDownloads++;
        stats.failedDownloads++;
      }
      
      stats.lastUpdated = Date.now();
      
      const updateData = {
        [CONFIG.STORAGE_KEYS.COMPLETED_URLS]: completedUrls,
        [CONFIG.STORAGE_KEYS.FAILED_URLS]: failedUrls,
        [CONFIG.STORAGE_KEYS.DOWNLOAD_STATS]: stats
      };
      
      browserAPI.storage.local.set(updateData, () => {
        if (browserAPI.runtime.lastError) {
          sendResponse({ success: false, error: browserAPI.runtime.lastError.message });
        } else {
          sendResponse({ success: true, stats: stats });
          
          // Update badge
          updateBadge(stats);
        }
      });
    });
  } catch (error) {
    console.error('Error updating stats:', error);
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
  
  // Load stats and update badge
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

// Initialize on startup
initialize();
