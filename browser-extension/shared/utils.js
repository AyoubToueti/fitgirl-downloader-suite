// shared/utils.js
// Utility functions for FitGirl Downloader Extension

// Cross-browser compatibility wrapper
const browserAPI = (() => {
  if (typeof browser !== 'undefined') {
    return browser; // Firefox
  } else if (typeof chrome !== 'undefined') {
    return chrome; // Chrome/Edge
  }
  throw new Error('Browser API not available');
})();

/**
 * Hash a string using simple hash function (for URL keys)
 * @param {string} str - String to hash
 * @returns {string} Hash string
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Debounce function to limit rapid calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit execution rate
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Memoize function results for performance
 * @param {Function} func - Function to memoize
 * @param {number} maxCacheSize - Maximum cache entries (default 100)
 * @returns {Function} Memoized function
 */
function memoize(func, maxCacheSize = 100) {
  const cache = new Map();
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = func.apply(this, args);
    cache.set(key, result);
    // Limit cache size
    if (cache.size > maxCacheSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    return result;
  };
}

/**
 * Batch DOM updates using requestIdleCallback or setTimeout
 * @param {Function} callback - Function to execute
 */
function batchUpdate(callback) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback);
  } else {
    setTimeout(callback, 0);
  }
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Create a cancellable promise
 * @param {Promise} promise - Original promise
 * @returns {Object} Object with promise and cancel function
 */
function makeCancellable(promise) {
  let cancelled = false;
  const wrappedPromise = new Promise((resolve, reject) => {
    promise
      .then(value => cancelled ? reject({ cancelled: true }) : resolve(value))
      .catch(error => cancelled ? reject({ cancelled: true }) : reject(error));
  });
  return {
    promise: wrappedPromise,
    cancel: () => { cancelled = true; }
  };
}

/**
 * Get storage data with Promise wrapper
 * @param {string|string[]|object} keys - Storage keys to retrieve
 * @returns {Promise<object>} Storage data
 */
async function getStorage(keys) {
  return new Promise((resolve, reject) => {
    browserAPI.storage.local.get(keys, (result) => {
      if (browserAPI.runtime.lastError) {
        reject(browserAPI.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Set storage data with Promise wrapper
 * @param {object} data - Data to store
 * @returns {Promise<void>}
 */
async function setStorage(data) {
  return new Promise((resolve, reject) => {
    browserAPI.storage.local.set(data, () => {
      if (browserAPI.runtime.lastError) {
        reject(browserAPI.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Send message to background script
 * @param {object} message - Message object
 * @returns {Promise<any>} Response from background
 */
async function sendMessage(message) {
  return new Promise((resolve, reject) => {
    browserAPI.runtime.sendMessage(message, (response) => {
      if (browserAPI.runtime.lastError) {
        reject(browserAPI.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Show browser notification
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (basic, image, list, progress)
 */
async function showNotification(title, message, type = 'basic') {
  const notificationOptions = {
    type: type,
    iconUrl: browserAPI.runtime.getURL('icons/icon48.png'),
    title: title,
    message: message
  };
  
  return new Promise((resolve) => {
    browserAPI.notifications.create('', notificationOptions, (notificationId) => {
      resolve(notificationId);
      
      // Auto-clear after timeout
      setTimeout(() => {
        browserAPI.notifications.clear(notificationId);
      }, CONFIG.NOTIFICATION_TIMEOUT);
    });
  });
}

/**
 * Delay execution for specified milliseconds
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get filename from URL
 * @param {string} url - URL to extract filename from
 * @returns {string} Filename
 */
function getFilenameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const segments = pathname.split('/').filter(s => s);
    return segments[segments.length - 1] || 'download';
  } catch (error) {
    const match = url.match(/([^\/#]+)(?=#|$)/);
    return match ? match[1] : 'download';
  }
}

/**
 * Generate unique filename with timestamp
 * @param {string} url - URL to base filename on
 * @returns {string} Generated filename
 */
function generateFilename(url) {
  const timestamp = new Date().getTime();
  const baseName = getFilenameFromUrl(url);
  return `fitgirl_${baseName}_${timestamp}`;
}

/**
 * Format timestamp to readable string
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted time string
 */
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

/**
 * Retry an async operation with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} baseDelay - Base delay in ms
 * @returns {Promise<any>} Operation result
 */
async function retryWithBackoff(operation, maxRetries, baseDelay) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= maxRetries) {
        throw error;
      }
      
      const delayMs = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Retry ${attempt}/${maxRetries} after ${delayMs}ms`);
      await delay(delayMs);
    }
  }
}

/**
 * Log message with timestamp
 * @param {string} message - Message to log
 * @param {string} level - Log level (info, warn, error)
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = '[FitGirl Downloader]';
  
  switch (level) {
    case 'error':
      console.error(`${prefix} ${timestamp}:`, message);
      break;
    case 'warn':
      console.warn(`${prefix} ${timestamp}:`, message);
      break;
    default:
      console.log(`${prefix} ${timestamp}:`, message);
  }
}

/**
 * Check if pause state has expired
 * @param {number} pausedAt - Timestamp when paused
 * @returns {boolean} True if expired
 */
function isPauseExpired(pausedAt) {
  const now = Date.now();
  return (now - pausedAt) > CONFIG.PAUSE_EXPIRATION_TIME;
}

/**
 * Sanitize filename for download
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(filename) {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 255);
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    browserAPI,
    hashString,
    debounce,
    throttle,
    memoize,
    batchUpdate,
    escapeHtml,
    makeCancellable,
    getStorage,
    setStorage,
    sendMessage,
    showNotification,
    delay,
    getFilenameFromUrl,
    generateFilename,
    formatTimestamp,
    retryWithBackoff,
    log,
    isPauseExpired,
    sanitizeFilename
  };
}
