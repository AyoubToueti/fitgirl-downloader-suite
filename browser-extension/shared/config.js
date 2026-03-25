// shared/config.js
// Configuration constants for FitGirl FDM Downloader Extension

const CONFIG = {
  // Timing settings
  WAIT_BETWEEN: 3000, // ms between downloads
  MAX_RETRIES_EXTRACTION: 3,
  MAX_RETRIES_FDM: 2,
  RETRY_BASE_DELAY_EXTRACTION: 2000, // ms
  RETRY_BASE_DELAY_FDM: 1000, // ms
  CONSECUTIVE_FAILURES_THRESHOLD: 3,
  SIZE_CALC_CONCURRENCY: 1,
  SIZE_CALC_TIMEOUT_MS: 12000,
  SIZE_CALC_REQUEST_GAP_MS: 250,
  SIZE_CACHE_TTL_MS: 6 * 60 * 60 * 1000, // 6 hours
  SIZE_POLL_INTERVAL_MS: 1000,
  
  // Pause/Resume settings
  PAUSE_EXPIRATION_TIME: 60 * 60 * 1000, // 1 hour in ms
  
  // Storage keys
  STORAGE_KEYS: {
    COMPLETED_URLS: 'completed_urls',
    FAILED_URLS: 'failed_urls',
    PAUSE_STATE: 'pause_state',
    FILE_SELECTIONS: 'file_selections',
    SKIPPED_FILES: 'skipped_files',
    DOWNLOAD_STATS: 'download_stats',
    USER_PREFERENCES: 'user_preferences',
    PAGE_STATE_VERSION: 'page_state_version'
  },

  // UI mode settings
  UI_MODES: {
    MODAL: 'modal',
    INLINE: 'inline'
  },
  DEFAULT_UI_MODE: 'modal',
  
  // Status types
  STATUS: {
    IDLE: 'idle',
    PROCESSING: 'processing',
    SUCCESS: 'success',
    COMPLETED: 'completed',
    FAILED: 'failed',
    RETRYING: 'retrying',
    SKIPPED: 'skipped',
    PAUSED: 'paused',
    STOPPED: 'stopped'
  },

  SIZE_STATUS: {
    IDLE: 'idle',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    KNOWN: 'known',
    UNKNOWN: 'unknown'
  },
  
  // UI Colors
  COLORS: {
    PRIMARY: '#667eea',
    PRIMARY_DARK: '#764ba2',
    SUCCESS: '#10b981',
    DANGER: '#ef4444',
    WARNING: '#f59e0b',
    INFO: '#3b82f6',
    MUTED: '#6b7280',
    LIGHT: '#f3f4f6',
    DARK: '#1f2937'
  },
  
  // Notification settings
  NOTIFICATION_TIMEOUT: 4000, // ms
  
  // URL patterns
  PATTERNS: {
    FUCKINGFAST_BASE: 'fuckingfast.co',
    FUCKINGFAST_DL: '/dl/',
    FITGIRL_SITE: 'fitgirl-repacks.site',
    WINDOW_OPEN_REGEX: /window\.open\(["']([^"']+\/dl\/[^"']+)["']/
  }
};

// Make CONFIG available globally for service workers and content scripts
if (typeof self !== 'undefined') {
  self.CONFIG = CONFIG;
}

// Also support window context
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}

// Export for use in other scripts (Node.js/module systems)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
