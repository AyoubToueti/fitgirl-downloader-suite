// Optimized background service worker (Chrome) / event page (Firefox)

// Chrome loads this script as a service worker, where importScripts exists.
// Firefox loads the background as an event page driven by the manifest's
// `background.scripts` array, which already lists shared/config.js first.
// Guarding on typeof keeps a trimmed fallback from clobbering the real CONFIG.
if (typeof importScripts === 'function') {
  importScripts('../shared/config.js');
}

if (typeof CONFIG === 'undefined' || !CONFIG) {
  throw new Error('FitGirl Downloader: shared/config.js was not loaded before the background script');
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

    case 'checkForUpdate':
      handleCheckForUpdate(request, sendResponse);
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
      return;
    }

        // Fallback: extract file ID from URL pattern when page fetch yields no result
        const urlFallback = extractDownloadUrlFromUrlPattern(url);
        if (urlFallback) {
          setUrlCacheEntry(url, urlFallback);
          sendResponse({ success: true, downloadUrl: urlFallback });
          return;
        }

        throw new Error('No download URL found');
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
 * Try to construct a download URL from the fuckingfast.co URL pattern.
 * Extracts file ID and builds /f/{id}/dl as fallback when page fetch fails.
 */
function extractDownloadUrlFromUrlPattern(url) {
  const pattern = CONFIG.PATTERNS.FUCKINGFAST_FILE_REGEX;
  if (!pattern) return null;
  const match = url.match(pattern);
  if (match) {
    const fileId = match[1];
    if (fileId === 'f') return null;
    return 'https://fuckingfast.co/f/' + fileId + '/dl';
  }
  return null;
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

  // 1. Try new HTMX pattern first
  const htmxMatch = html.match(CONFIG.PATTERNS.HTMX_POST_REGEX);
  if (htmxMatch && htmxMatch[1]) {
    return { type: 'htmx_post', path: htmxMatch[1] };
  }

  // 2. Fallback to old window.open pattern
  const match = html.match(CONFIG.PATTERNS.WINDOW_OPEN_REGEX);
  if (match && match[1]) {
    return { type: 'direct', url: match[1] };
  }

  return null;
}

// Non-file routes on fuckingfast.co that look like single-segment paths
const FUCKINGFAST_SITE_ROUTES = new Set([
  'index', 'speedtest', 'help', 'privacy', 'terms', 'contact', 'login',
  'logout', 'register', 'account', 'upload', 'faq', 'about', 'api'
]);

/**
 * Derive the fuckingfast.co file id from a file page URL like
 * https://fuckingfast.co/<id>#<filename>. Returns null for anything else
 * (dl.fuckingfast.co direct links, site pages, URLs with extra segments).
 */
function deriveFuckingFastFileId(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    if (host !== 'fuckingfast.co' && !host.endsWith('.fuckingfast.co')) {
      return null;
    }
    if (host.startsWith('dl.')) {
      return null;
    }
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length !== 1) {
      return null;
    }
    const id = segments[0];
    if (FUCKINGFAST_SITE_ROUTES.has(id.toLowerCase())) {
      return null;
    }
    return /^[A-Za-z0-9_-]{6,}$/.test(id) ? id : null;
  } catch (e) {
    return null;
  }
}

/**
 * Resolve a direct download URL via the new HTMX interface:
 * empty-body POST to https://fuckingfast.co/f/<id>/go -> HX-Redirect header.
 *
 * The server answers with HX-Redirect even on non-2xx statuses, and it does
 * not require any specific headers or a warmed cookie jar, so a plain
 * service-worker fetch is sufficient (cookies are attached automatically
 * thanks to host_permissions).
 */
async function postFuckingFastGo(url, signal) {
  const fileId = deriveFuckingFastFileId(url);
  if (!fileId) {
    return null;
  }

  const postUrl = 'https://fuckingfast.co/f/' + fileId + '/go';
  console.log('POSTing to HTMX go endpoint:', postUrl);

  const response = await fetch(postUrl, {
    method: 'POST',
    body: '',
    signal,
    headers: {
      'Accept': '*/*',
      'Content-Type': 'application/x-www-form-urlencoded',
      'HX-Request': 'true',
      'HX-Current-URL': url,
      'HX-Target': 'body'
    }
  });

  // HX-Redirect is returned on the happy path (200); fall back to a standard
  // Location header just in case the server ever switches to a plain redirect.
  const redirect = response.headers.get('HX-Redirect') || response.headers.get('Location');
  if (redirect && redirect.trim()) {
    return redirect.trim();
  }

  console.log('No HX-Redirect in response; status', response.status);
  return null;
}

/**
 * GET a fuckingfast file page and parse size/stat information plus legacy
 * download-url patterns. The GET can legitimately fail (Cloudflare 403 for
 * non-interactive clients); callers must tolerate a null html.
 */
async function fetchFuckingFastPageHtml(url, signal) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal
    });

    if (!response.ok) {
      return {
        html: null,
        status: response.status
      };
    }

    return {
      html: await response.text(),
      status: response.status
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.warn('Page GET failed (non-fatal):', error.message);
    return { html: null, status: null };
  }
}

/**
 * Fallback resolution using the page HTML: try the HTMX POST path found in the
 * markup, then the legacy window.open('/dl/...') pattern.
 */
async function resolveDownloadUrlFromHtml(html, baseUrl, signal) {
  const parsedUrlData = parseDownloadUrlFromHtml(html);
  if (parsedUrlData && parsedUrlData.type === 'direct') {
    return parsedUrlData.url;
  }

  if (parsedUrlData && parsedUrlData.type === 'htmx_post') {
    try {
      const postUrl = new URL(parsedUrlData.path, new URL(baseUrl)).href;
      const postResponse = await fetch(postUrl, {
        method: 'POST',
        signal,
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/x-www-form-urlencoded',
          'HX-Request': 'true',
          'HX-Current-URL': baseUrl,
          'HX-Target': 'body'
        }
      });
      const redirect = postResponse.headers.get('HX-Redirect') ||
                       postResponse.headers.get('Location');
      if (redirect && redirect.trim()) {
        return redirect.trim();
      }
    } catch (error) {
      console.warn('Legacy HTMX POST resolution failed:', error.message);
    }
  }

  return null;
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
      parentSignal,
      skipGoPost: true
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

  const { controller, cleanup } = createAbortControllerWithTimeout(timeoutMs, parentSignal);
  try {
    // Fast path: direct POST to /f/<id>/go (new HTMX interface). No page GET
    // is required; the server replies with the direct URL in HX-Redirect.
    // In parallel, best-effort GET of the page for size/stat parsing and the
    // legacy resolution path. Size-only jobs can skip the download POST.
    const skipGoPost = Boolean(options.skipGoPost);
    const [directResult, pageResult] = await Promise.allSettled([
      skipGoPost ? Promise.resolve(null) : postFuckingFastGo(url, controller.signal),
      fetchFuckingFastPageHtml(url, controller.signal)
    ]);

    const pageHtml = (pageResult.status === 'fulfilled') ? (pageResult.value?.html || null) : null;
    const pageStatus = (pageResult.status === 'fulfilled') ? (pageResult.value?.status ?? null) : null;

    const sizeStructure = pageHtml
      ? (() => {
          const parsedSize = parseSizeFromHtml(pageHtml);
          if (!parsedSize) {
            return {
              status: CONFIG.SIZE_STATUS.UNKNOWN,
              bytes: null,
              source: 'size-not-found'
            };
          }
          return {
            status: CONFIG.SIZE_STATUS.KNOWN,
            bytes: parsedSize.bytes,
            source: 'html-size-text',
            label: parsedSize.label
          };
        })()
      : {
          status: CONFIG.SIZE_STATUS.UNKNOWN,
          bytes: null,
          source: pageStatus ? ('http-status-' + pageStatus) : 'request-error'
        };

    let finalDownloadUrl = (directResult.status === 'fulfilled') ? directResult.value : null;

    if (directResult.status === 'rejected' && directResult.reason?.name !== 'AbortError') {
      console.warn('Direct /go POST failed:', directResult.reason?.message);
    }

    // Legacy fallback: parse the GET'd HTML for hx-post / window.open patterns.
    if (!finalDownloadUrl && pageHtml) {
      finalDownloadUrl = await resolveDownloadUrlFromHtml(pageHtml, url, controller.signal);
    }

    return {
      downloadUrl: finalDownloadUrl,
      sizeResult: sizeStructure
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

    // Subscribe BEFORE reading state, then reconcile with a snapshot. Firefox
    // resolves downloads.download() only once the download is in progress, so
    // a fast file could reach 'complete' before a listener attached afterwards
    // would ever see the delta. Attaching first plus the snapshot closes both
    // orders: anything that already happened shows up in the snapshot, anything
    // later arrives as an event.
    const watcher = monitorDownload(downloadId);

    try {
      const [item] = await browserAPI.downloads.search({ id: downloadId });
      watcher.settleFromSnapshot(item);
    } catch (snapshotError) {
      console.warn('Download state snapshot unavailable:', snapshotError.message);
    }

    sendResponse({ success: true, downloadId: downloadId });
  } catch (error) {
    console.error('Download failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Watch a download until it settles.
 *
 * Returns { settleFromSnapshot } so the caller can reconcile the state that
 * existed before/around the subscription. Detaches exactly once, from every
 * path, and re-arms an idle timer on each delta so a suspended MV3 event page
 * cannot keep the listener registered forever.
 */
function monitorDownload(downloadId) {
  let settled = false;
  let idleTimer = null;

  const DETACH_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  const detach = () => {
    if (settled) return;
    settled = true;
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    try {
      browserAPI.downloads.onChanged.removeListener(listener);
    } catch (error) {
      console.error('Failed to detach download listener:', error);
    }
  };

  const rearmIdleTimer = () => {
    if (settled) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      console.warn(`Download ${downloadId} produced no changes for 30 minutes, detaching watcher`);
      detach();
    }, DETACH_TIMEOUT_MS);
  };

  const settleFromState = (state, errorCode) => {
    if (state === 'complete') {
      console.log(`Download ${downloadId} completed`);
      detach();
      return true;
    }
    if (state === 'interrupted') {
      console.error(`Download ${downloadId} interrupted:`, errorCode || 'unknown reason');
      detach();
      return true;
    }
    return false;
  };

  const listener = (delta) => {
    if (delta.id !== downloadId || settled) return;

    rearmIdleTimer();
    settleFromState(delta.state?.current, delta.error?.current);
  };

  browserAPI.downloads.onChanged.addListener(listener);
  rearmIdleTimer();

  return {
    settleFromSnapshot(item) {
      if (settled || !item) return;
      settleFromState(item.state, item.error);
    }
  };
}

/**
 * Get storage data
 */
async function handleGetStorage(request, sendResponse) {
  const { keys } = request;

  try {
    // Promise-based so this works in Chrome and Firefox. A trailing callback
    // is silently dropped by Firefox's browser.* namespace.
    const result = await browserAPI.storage.local.get(keys);
    sendResponse({ success: true, data: result || {} });
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
    await browserAPI.storage.local.set(data);
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Look for a newer extension release on GitHub.
 *
 * Chrome cannot auto-update an unpacked extension, so the popup only shows a
 * "new version available" notice. The result is cached in storage.local and
 * re-checked at most once a day; the popup renders the cache immediately and
 * never waits on the network.
 *
 * /releases/latest is NOT used: it is repo-wide, and the userscript publishes
 * userscript-v* releases in the same repository, so "latest" may not be an
 * extension release at all. Listing and filtering on tag_name avoids that.
 */
const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const UPDATE_CHECK_KEY = 'update_check';
const UPDATE_RELEASES_URL =
  'https://api.github.com/repos/AyoubToueti/fitgirl-downloader-suite/releases?per_page=100';

async function handleCheckForUpdate(request, sendResponse) {
  try {
    const result = await browserAPI.storage.local.get([UPDATE_CHECK_KEY]);
    const cached = result[UPDATE_CHECK_KEY] || null;

    // Throttle: at most one network call per day per profile.
    if (cached && typeof cached.checkedAt === 'number' &&
        Date.now() - cached.checkedAt < UPDATE_CHECK_INTERVAL_MS) {
      sendResponse({ success: true, data: cached, cached: true });
      return;
    }

    const response = await fetch(UPDATE_RELEASES_URL, {
      headers: { 'Accept': 'application/vnd.github+json' }
    });

    if (!response.ok) {
      // Rate limit or transient failure: keep the previous cache, report no data.
      sendResponse({ success: false, error: 'HTTP ' + response.status, data: cached });
      return;
    }

    const releases = await response.json();
    if (!Array.isArray(releases)) {
      sendResponse({ success: false, error: 'Unexpected response shape', data: cached });
      return;
    }

    // GitHub returns newest first; take the first extension release.
    const release = releases.find((entry) =>
      entry && typeof entry.tag_name === 'string' &&
      entry.tag_name.startsWith('extension-v') && !entry.draft
    );

    if (!release) {
      sendResponse({ success: false, error: 'No extension release found', data: cached });
      return;
    }

    const next = {
      checkedAt: Date.now(),
      latestVersion: release.tag_name.slice('extension-v'.length),
      latestTag: release.tag_name,
      releaseUrl: release.html_url || ('https://github.com/AyoubToueti/fitgirl-downloader-suite/releases/tag/' + release.tag_name),
      // Preserve a dismissal so the same version is not advertised twice.
      dismissedVersion: cached ? cached.dismissedVersion || null : null
    };

    await browserAPI.storage.local.set({ [UPDATE_CHECK_KEY]: next });
    sendResponse({ success: true, data: next });
  } catch (error) {
    // Offline or blocked: never surface this to the user.
    console.error('FitGirl Downloader: update check failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Remove pictographic emoji and emoji skin-tone modifiers from a string.
 * Flags, dingbats and symbol glyphs are dropped, ASCII and letters kept.
 */
function stripEmoji(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Show browser notification
 */
async function handleShowNotification(request, sendResponse) {
  const { title, message } = request;

  // Queue notification. Strip any pictographic emoji so the OS notification
  // stays consistent with the extension's text-only UI.
  const cleanTitle = stripEmoji(title);
  const cleanMessage = stripEmoji(message);

  notificationQueue.push({ title: cleanTitle, message: cleanMessage });

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
    // Promise-based: Firefox drops a trailing callback entirely, which used to
    // leave this handler silent and the popup stats permanently at zero.
    const result = await browserAPI.storage.local.get([
      CONFIG.STORAGE_KEYS.COMPLETED_URLS,
      CONFIG.STORAGE_KEYS.FAILED_URLS,
      CONFIG.STORAGE_KEYS.DOWNLOAD_STATS
    ]) || {};

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

    await browserAPI.storage.local.set({
      [CONFIG.STORAGE_KEYS.COMPLETED_URLS]: completedUrls,
      [CONFIG.STORAGE_KEYS.FAILED_URLS]: failedUrls,
      [CONFIG.STORAGE_KEYS.DOWNLOAD_STATS]: stats
    });

    updateBadge(stats);
    sendResponse({ success: true });
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

  try {
    const result = await browserAPI.storage.local.get([CONFIG.STORAGE_KEYS.DOWNLOAD_STATS]) || {};
    const stats = result[CONFIG.STORAGE_KEYS.DOWNLOAD_STATS];
    if (stats) {
      updateBadge(stats);
    }
  } catch (error) {
    console.error('Failed to restore badge state:', error);
  }

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
