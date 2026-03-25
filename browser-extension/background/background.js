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
const pageDerivedDataInFlight = new Map();

// Size calculation jobs and cache
const sizeJobs = new Map();
const sizeCache = new Map();
const SIZE_JOB_RETENTION_MS = 10 * 60 * 1000; // 10 minutes

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

    case 'startSizeCalculation':
      handleStartSizeCalculation(request, sendResponse);
      return true;

    case 'getSizeCalculationStatus':
      handleGetSizeCalculationStatus(request, sendResponse);
      return true;

    case 'cancelSizeCalculation':
      handleCancelSizeCalculation(request, sendResponse);
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

    const parsed = await getOrCreatePageDerivedDataRequest(url, {
      timeoutMs: 10000
    });

    if (parsed.downloadUrl) {
      setUrlCacheEntry(url, parsed.downloadUrl);

      if (parsed.sizeResult) {
        setSizeCacheEntry(url, {
          status: parsed.sizeResult.status,
          bytes: parsed.sizeResult.bytes,
          source: parsed.sizeResult.source,
          error: parsed.sizeResult.error || null
        });
      }

      console.log('Extracted download URL:', parsed.downloadUrl);
      sendResponse({ success: true, downloadUrl: parsed.downloadUrl });
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

function setUrlCacheEntry(url, downloadUrl) {
  urlCache.set(url, {
    downloadUrl,
    timestamp: Date.now()
  });

  if (urlCache.size > 100) {
    const firstKey = urlCache.keys().next().value;
    urlCache.delete(firstKey);
  }
}

function createSizeTaskId() {
  return `size_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getSizeCacheEntry(url) {
  const cacheTtl = CONFIG.SIZE_CACHE_TTL_MS || (6 * 60 * 60 * 1000);
  const entry = sizeCache.get(url);
  if (!entry) return null;

  if ((Date.now() - entry.timestamp) > cacheTtl) {
    sizeCache.delete(url);
    return null;
  }

  return entry;
}

function setSizeCacheEntry(url, value) {
  sizeCache.set(url, {
    ...value,
    timestamp: Date.now()
  });

  if (sizeCache.size > 500) {
    const firstKey = sizeCache.keys().next().value;
    sizeCache.delete(firstKey);
  }
}

function parseSizeToNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.floor(parsed);
}

function parseHumanSizeToBytes(sizeValue, sizeUnit) {
  const numeric = Number(String(sizeValue).replace(',', '.'));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  const unit = String(sizeUnit || 'B').toUpperCase();
  const multipliers = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024
  };

  if (!multipliers[unit]) {
    return null;
  }

  return Math.floor(numeric * multipliers[unit]);
}

function parseSizeFromHtml(html) {
  if (!html) return null;

  // Expected examples: "Size: 500.0MB | Downloads: 993"
  const sizeMatch = html.match(/Size\s*:\s*([0-9]+(?:[\.,][0-9]+)?)\s*([KMGT]?B)/i);
  if (!sizeMatch) {
    return null;
  }

  const bytes = parseHumanSizeToBytes(sizeMatch[1], sizeMatch[2]);
  if (!bytes) {
    return null;
  }

  return {
    bytes,
    label: `${sizeMatch[1]}${String(sizeMatch[2]).toUpperCase()}`
  };
}

function parseDownloadUrlFromHtml(html) {
  if (!html) return null;

  const match = html.match(CONFIG.PATTERNS.WINDOW_OPEN_REGEX);
  return match && match[1] ? match[1] : null;
}

function createAbortControllerWithTimeout(timeoutMs, parentSignal) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let removeAbortForwarder = null;
  if (parentSignal) {
    const forwardAbort = () => controller.abort();
    if (parentSignal.aborted) {
      controller.abort();
    } else {
      parentSignal.addEventListener('abort', forwardAbort, { once: true });
      removeAbortForwarder = () => parentSignal.removeEventListener('abort', forwardAbort);
    }
  }

  return {
    controller,
    cleanup: () => {
      clearTimeout(timeoutId);
      if (removeAbortForwarder) {
        removeAbortForwarder();
      }
    }
  };
}

function createAbortError() {
  const error = new Error('Request aborted');
  error.name = 'AbortError';
  return error;
}

function awaitWithParentAbort(promise, parentSignal) {
  if (!parentSignal) {
    return promise;
  }

  if (parentSignal.aborted) {
    return Promise.reject(createAbortError());
  }

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      parentSignal.removeEventListener('abort', onAbort);
      reject(createAbortError());
    };

    parentSignal.addEventListener('abort', onAbort, { once: true });

    promise.then(
      (value) => {
        parentSignal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        parentSignal.removeEventListener('abort', onAbort);
        reject(error);
      }
    );
  });
}

function getOrCreatePageDerivedDataRequest(url, options = {}) {
  const existing = pageDerivedDataInFlight.get(url);
  if (existing) {
    return existing;
  }

  const requestPromise = fetchPageDerivedData(url, options)
    .finally(() => {
      const current = pageDerivedDataInFlight.get(url);
      if (current === requestPromise) {
        pageDerivedDataInFlight.delete(url);
      }
    });

  pageDerivedDataInFlight.set(url, requestPromise);
  return requestPromise;
}

async function extractFileSizeFromPage(url, parentSignal) {
  const timeoutMs = CONFIG.SIZE_CALC_TIMEOUT_MS || 12000;
  try {
    const parsed = await awaitWithParentAbort(getOrCreatePageDerivedDataRequest(url, {
      timeoutMs,
      parentSignal
    }), parentSignal);

    if (parsed.downloadUrl) {
      setUrlCacheEntry(url, parsed.downloadUrl);
    }

    if (!parsed.sizeResult) {
      return {
        status: CONFIG.SIZE_STATUS.UNKNOWN,
        bytes: null,
        source: 'size-not-found'
      };
    }

    return parsed.sizeResult;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }

    return {
      status: CONFIG.SIZE_STATUS.UNKNOWN,
      bytes: null,
      source: 'request-error',
      error: error.message || 'Unknown error'
    };
  }
}

async function fetchPageDerivedData(url, options = {}) {
  const timeoutMs = Number(options.timeoutMs) || 12000;
  const parentSignal = options.parentSignal;
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  const { controller, cleanup } = createAbortControllerWithTimeout(timeoutMs, parentSignal);
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent
      }
    });

    if (!response.ok) {
      return {
        downloadUrl: null,
        sizeResult: {
          status: CONFIG.SIZE_STATUS.UNKNOWN,
          bytes: null,
          source: 'http-status',
          error: `HTTP ${response.status}`
        }
      };
    }

    const html = await response.text();
    const downloadUrl = parseDownloadUrlFromHtml(html);
    const parsedSize = parseSizeFromHtml(html);

    return {
      downloadUrl,
      sizeResult: parsedSize
        ? {
            status: CONFIG.SIZE_STATUS.KNOWN,
            bytes: parsedSize.bytes,
            source: 'html-size-text',
            label: parsedSize.label
          }
        : null
    };
  } finally {
    cleanup();
  }
}

async function runSizeCalculationJob(taskId) {
  const job = sizeJobs.get(taskId);
  if (!job) return;

  const concurrency = Math.max(1, Number(CONFIG.SIZE_CALC_CONCURRENCY || 1));
  const requestGapMs = Math.max(0, Number(CONFIG.SIZE_CALC_REQUEST_GAP_MS || 0));
  job.status = CONFIG.SIZE_STATUS.RUNNING;

  let nextIndex = 0;

  const worker = async () => {
    while (!job.controller.signal.aborted && nextIndex < job.urls.length) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= job.urls.length) {
        return;
      }

      const url = job.urls[index];

      if (job.controller.signal.aborted) {
        return;
      }

      const cached = getSizeCacheEntry(url);
      const bypassUnknownCache = Boolean(job.ignoreCacheForUnknown && cached && cached.status === CONFIG.SIZE_STATUS.UNKNOWN);
      if (cached && !bypassUnknownCache) {
        job.results[url] = {
          status: cached.status,
          bytes: cached.bytes,
          source: 'cache',
          error: cached.error || null,
          updatedAt: Date.now()
        };
        job.processed += 1;
        continue;
      }

      if (requestGapMs > 0 && index > 0) {
        await new Promise((resolve) => setTimeout(resolve, requestGapMs));
      }

      const result = await extractFileSizeFromPage(url, job.controller.signal);
      job.results[url] = {
        status: result.status,
        bytes: result.bytes,
        source: result.source,
        error: result.error || null,
        updatedAt: Date.now()
      };

      if (result.status === CONFIG.SIZE_STATUS.KNOWN || result.status === CONFIG.SIZE_STATUS.UNKNOWN) {
        setSizeCacheEntry(url, {
          status: result.status,
          bytes: result.bytes,
          source: result.source,
          error: result.error || null
        });
      }

      job.processed += 1;
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, job.urls.length) }, () => worker());

  try {
    await Promise.all(workers);

    if (job.controller.signal.aborted) {
      job.status = CONFIG.SIZE_STATUS.CANCELLED;
    } else {
      job.status = CONFIG.SIZE_STATUS.COMPLETED;
    }
  } catch (error) {
    if (job.controller.signal.aborted || error?.name === 'AbortError') {
      job.status = CONFIG.SIZE_STATUS.CANCELLED;
    } else {
      job.status = CONFIG.SIZE_STATUS.FAILED;
      job.error = error.message || 'Size calculation failed';
    }
  } finally {
    job.completedAt = Date.now();
    job.cleanupAt = Date.now() + SIZE_JOB_RETENTION_MS;
  }
}

async function handleStartSizeCalculation(request, sendResponse) {
  try {
    const inputUrls = Array.isArray(request.urls) ? request.urls : [];
    const urls = [...new Set(inputUrls.filter((url) => typeof url === 'string' && url.trim()))];

    if (urls.length === 0) {
      sendResponse({ success: false, error: 'No valid URLs provided' });
      return;
    }

    const taskId = createSizeTaskId();
    const controller = new AbortController();

    const job = {
      taskId,
      urls,
      status: CONFIG.SIZE_STATUS.IDLE,
      processed: 0,
      total: urls.length,
      results: {},
      ignoreCacheForUnknown: Boolean(request.ignoreCacheForUnknown),
      startedAt: Date.now(),
      completedAt: null,
      cleanupAt: null,
      error: null,
      controller
    };

    sizeJobs.set(taskId, job);

    runSizeCalculationJob(taskId).catch((error) => {
      const currentJob = sizeJobs.get(taskId);
      if (!currentJob) return;
      currentJob.status = CONFIG.SIZE_STATUS.FAILED;
      currentJob.error = error.message || 'Unexpected size calculation error';
      currentJob.completedAt = Date.now();
      currentJob.cleanupAt = Date.now() + SIZE_JOB_RETENTION_MS;
    });

    sendResponse({ success: true, taskId, total: urls.length });
  } catch (error) {
    sendResponse({ success: false, error: error.message || 'Failed to start size calculation' });
  }
}

async function handleGetSizeCalculationStatus(request, sendResponse) {
  const { taskId } = request;
  const job = sizeJobs.get(taskId);

  if (!job) {
    sendResponse({ success: false, error: 'Task not found' });
    return;
  }

  const progress = job.total > 0
    ? Math.round((job.processed / job.total) * 100)
    : 0;

  sendResponse({
    success: true,
    taskId,
    status: job.status,
    processed: job.processed,
    total: job.total,
    progress,
    results: job.results,
    error: job.error || null,
    startedAt: job.startedAt,
    completedAt: job.completedAt
  });
}

async function handleCancelSizeCalculation(request, sendResponse) {
  const { taskId } = request;
  const job = sizeJobs.get(taskId);

  if (!job) {
    sendResponse({ success: false, error: 'Task not found' });
    return;
  }

  job.controller.abort();
  job.status = CONFIG.SIZE_STATUS.CANCELLED;
  job.completedAt = Date.now();
  job.cleanupAt = Date.now() + SIZE_JOB_RETENTION_MS;

  sendResponse({ success: true, taskId });
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

  for (const [taskId, job] of sizeJobs.entries()) {
    if (job.cleanupAt && now > job.cleanupAt) {
      sizeJobs.delete(taskId);
    }
  }

  const cacheTtl = CONFIG.SIZE_CACHE_TTL_MS || (6 * 60 * 60 * 1000);
  for (const [url, cacheEntry] of sizeCache.entries()) {
    if (now - cacheEntry.timestamp > cacheTtl) {
      sizeCache.delete(url);
    }
  }
}, 60000); // Every minute
