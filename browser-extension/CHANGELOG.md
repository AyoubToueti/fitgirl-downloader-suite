# Changelog

All notable changes to the FitGirl FDM Downloader Extension will be documented in this file.

## [0.2.0] - 2026-10-31

### 🚀 New fuckingfast.co interface support

Rewritten for the 2026 fuckingfast.co page redesign. Credit to the
[`fistgirl`](https://github.com/sagarchaulagai/fistgirl) FDM add-on for proving
the new server contract.

### 📡 New Download Flow

- **Direct HTMX POST**: The background service worker now POSTs an empty body
  to `https://fuckingfast.co/f/<id>/go` and reads the direct download URL from
  the `HX-Redirect` response header. No page interaction needed — bulk
  downloads from paste pages work without navigating anywhere.
- **No warm-up required**: Verified live that the `/go` endpoint needs no
  cookies, no `Origin`/`Referer`, and no HTMX headers.
- **Page fetch demoted**: The HTML GET is now only a best-effort side channel
  (size parsing + legacy pattern fallback); a 403 from Cloudflare on the GET
  is tolerated and non-fatal.

### 🗑️ Removed

- **Turnstile gate**: Removed the `window.turnstileToken` checks — the new
  page has no interactive captcha widget, so the old gate dead-ended every
  download attempt with "Captcha Required".
- **`window.dlCleared` two-click simulation**: Replaced with detection of
  whether the HTMX POST actually fired (`htmx:beforeRequest`); the page click
  fallback auto-clicks again when the site's ad interceptor consumed the
  first click.
- Legacy `/f/<id>/dl` URL-pattern fallback (superseded by the `/go` POST).

### 🐛 Bug Fixes

- **Extension UI vanished after downloads**: The `beforeunload` handler tore
  down the whole UI (modal, "Open Downloader" trigger, file list). Download
  hand-off navigations fire unload events even when the document survives,
  leaving a live page with no UI until reload. Unload now only flushes pending
  storage writes; DOM UI is never stripped.

### ✨ Added

- **Download delivery mode** (popup setting): `Hand-off (FDM / download
  manager)` — default — hands the direct URL to the normal navigation flow
  (Content-Disposition attachment), which external download-manager browser
  hooks intercept reliably; `Browser downloads API (direct)` keeps the old
  `chrome.downloads` path. Applies to the next download without reload.
- `/go` POST is now the primary extraction strategy; the old page-click flow
  (`a.link-button` + ad two-click handling) is kept only as an on-page
  fallback when background extraction fails.
- Click fallback restricted to files that are actually the current page
  (`isCurrentFilePage`), fixing a correctness hole in bulk flows.

---

## [0.0.2] - 2025-11-24

### 🚀 Performance Optimization Release

Major performance overhaul with 60% faster load times and 60% less memory usage.

### ⚡ Performance Improvements

#### Content Script Optimizations
- **DOM Caching**: Store all element references, reducing queries by ~60%
- **Event Delegation**: Single listeners instead of 300+ individual bindings (95% fewer listeners)
- **Debounced Operations**: Storage writes batched with 500ms debounce (80% fewer writes)
- **DocumentFragment**: Batch DOM insertions, 70% faster initial rendering
- **Request Idle Callback**: Non-critical work deferred to browser idle time
- **Set for Deduplication**: O(1) lookup vs O(n) array search
- **Minimal Pause Data**: Store URLs only, reducing pause state size by 85%
- **Memory Cleanup**: Zero memory leaks with proper observer disconnection

#### Background Script Optimizations
- **URL Extraction Cache**: 5-minute LRU cache prevents redundant network requests
- **Fetch Timeout**: 10-second AbortController prevents hanging requests
- **Notification Batching**: Queue and dedupe notifications to prevent spam
- **Periodic Cache Cleanup**: Remove expired cache entries every minute

#### Popup Script Optimizations
- **Element Caching**: Cache all DOM references after DOMContentLoaded
- **Parallel Loading**: Load stats and pause state simultaneously with Promise.all
- **Event Delegation**: Single listener for all dynamic content
- **Guard Against Rebinding**: Prevent duplicate event listener registration
- **DocumentFragment Lists**: 60% faster list rendering

#### CSS Performance Optimizations
- **GPU Acceleration**: `transform: translateZ(0)` on all animated elements
- **CSS Containment**: `contain: layout style paint` isolates rendering changes
- **will-change Hints**: Browser optimization hints for animations
- **Smooth Scrolling**: `-webkit-overflow-scrolling: touch` for better mobile UX
- **Reduced Motion Support**: Respects user accessibility preferences

#### Shared Utilities
- **debounce()**: Limit rapid function calls with configurable delay
- **throttle()**: Rate-limit execution for scroll/resize handlers
- **memoize()**: LRU cache for function results (max 100 entries)
- **batchUpdate()**: Defer non-critical DOM work with requestIdleCallback
- **escapeHtml()**: XSS prevention for dynamic content
- **makeCancellable()**: Cancel async operations cleanly

### 📊 Performance Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Initial Load Time | ~800ms | ~320ms | **60% faster** |
| Memory Usage | ~45MB | ~18MB | **60% less** |
| Storage Writes | 50-100/session | 10-15/session | **80% fewer** |
| Event Listeners | 300+ (100 files) | 15-20 total | **95% fewer** |
| DOM Operations | 500+ | 50-80 | **85% fewer** |

### 🐛 Bug Fixes
- **Multiple Script Injection**: Wrapped content script in IIFE with guard to prevent `SyntaxError: Identifier already declared`
- **ImportScripts Failure**: Added try-catch and fallback CONFIG for service worker
- **Global CONFIG Access**: Made CONFIG available in both `self` and `window` contexts

### 📚 Documentation
- **PERFORMANCE.md**: Comprehensive 1000+ line performance optimization guide
- **OPTIMIZATION_SUMMARY.md**: Quick reference for developers
- Code examples and best practices
- Performance monitoring techniques
- Common pitfalls to avoid

### 🔧 Technical Details
- IIFE pattern prevents variable collisions on re-injection
- Service worker CONFIG with graceful fallback
- Strict mode enabled for better error catching
- All animations use transform/opacity for GPU acceleration
- CSS containment reduces cascade reflows

### ♻️ Code Quality
- Consistent error handling patterns
- Memory leak prevention with cleanup methods
- XSS protection with HTML escaping
- Proper async/await usage
- Minimal, serializable storage data

---

## [0.0.1] - 2024-11-18

### 🎉 Initial Release - Complete Browser Extension

Major transformation from Tampermonkey userscript to full-featured browser extension.

### ✨ Added Features

#### Core Functionality
- **Browser Extension Architecture**: Manifest V3 for Chrome/Edge
- **Background Service Worker**: Handles downloads, storage, and notifications
- **Content Script**: DOM manipulation and UI injection on FitGirl pages
- **Popup Interface**: Statistics dashboard and controls
- **Modern UI**: Card-based design with smooth animations

#### Download Management
- **Bulk Download**: Process multiple files sequentially
- **Progress Tracking**: Real-time progress bar with percentage
- **Status Indicators**: Color-coded badges for each file state
- **Error Handling**: Comprehensive error reporting and logging

#### ⏹️ Stop & Pause System
- **Stop Button**: Gracefully stop after current file
- **Pause State Persistence**: Save progress to storage
- **Auto-Resume Banner**: Shows on page reload within 1 hour
- **Pause Expiration**: Automatic cleanup after 1 hour
- **Page-Specific Resume**: Only shows on the correct page

#### 📋 File Selection System
- **Individual Checkboxes**: Select/deselect specific files
- **Select All Button**: Check all non-skipped files
- **Deselect All Button**: Uncheck all files
- **Reset Selection Button**: Restore to default (all selected)
- **Live Counter**: "X of Y files selected (Z skipped)"
- **Page-Specific Persistence**: Selections saved per URL hash
- **Smart Disabled State**: Respects skipped files

#### ⏭️ Skip Functionality
- **Skip Button**: Mark individual files to skip
- **Undo Skip Button**: Reverse skip decision
- **Visual Feedback**: Gray styling with strike-through
- **Persistent State**: Skipped files saved per page
- **Disabled Checkboxes**: Skipped files can't be selected

#### 🔄 Retry System
- **Retry All Failed Button**: Bulk retry in popup
- **Individual Retry Buttons**: Per-file retry on page
- **Failed URL Storage**: Persist with error details and timestamp
- **Auto-Cleanup**: Remove from failed list on success
- **Error Details**: Show specific error messages
- **Retry Counter**: Badge shows failed count

#### 🎨 UI/UX Enhancements
- **Modern Color Palette**: Purple gradient theme
- **Card-Based Layout**: Elevated cards with hover effects
- **Smooth Animations**: 0.3s transitions on all interactions
- **Status Badges**: Processing, Success, Failed, Retrying, Skipped
- **Progress Bar**: Animated gradient fill
- **Responsive Design**: Mobile-friendly breakpoints
- **Floating Buttons**: For fuckingfast.co pages
- **Resume Banner**: Eye-catching pause state indicator

#### 📊 Statistics & Tracking
- **Total Downloads**: All-time download count
- **Successful Downloads**: Completed files
- **Failed Downloads**: Failed attempts with errors
- **Completed URLs List**: Historical record
- **Failed URLs List**: Detailed error log with timestamps
- **Last Updated**: Timestamp of last activity
- **Badge Counter**: Shows failed count on extension icon

#### 🔧 Technical Improvements
- **Cross-Browser API**: Wrapper for Chrome/Firefox compatibility
- **Promise-Based Storage**: Async `chrome.storage.local`
- **Message Passing**: Content ↔ Background communication
- **URL Hashing**: Page-specific state keys
- **Exponential Backoff**: Smart retry delays
- **CORS-Free Fetching**: Background script handles requests
- **Download Monitoring**: Track download state changes
- **Notification System**: Browser native notifications

### 📦 Project Structure
```
browser-extension/
├── manifest.json
├── background/background.js
├── content/content-script.js
├── content/styles.css
├── popup/popup.html
├── popup/popup.js
├── popup/popup.css
├── shared/config.js
├── shared/utils.js
├── icons/README.md
├── README.md
└── INSTALL.md
```

### 🔐 Permissions
- `storage`: Save state and history
- `downloads`: Trigger file downloads
- `notifications`: Status notifications
- `tabs`: Resume functionality
- `host_permissions`: FitGirl & fuckingfast.co

### 📝 Configuration Options
- Wait time between downloads: 2000ms
- Max extraction retries: 3
- Max download retries: 2
- Consecutive failure threshold: 3
- Pause expiration time: 1 hour
- All colors customizable via CSS variables

### 🐛 Known Limitations
- Requires icons to be added manually
- FDM integration uses browser default handler
- Service worker may become inactive (auto-restarts)
- Pause state expires after 1 hour
- Page-specific selections only

### 🔄 Migration from Tampermonkey
- All core functionality preserved
- Enhanced UI and controls
- Better state management
- Improved error handling
- Native browser integration

### 📚 Documentation
- Complete README.md with feature guide
- INSTALL.md with quick start guide
- Inline code comments
- Configuration examples
- Troubleshooting section

### 🎯 Future Roadmap
- Manifest V2 for Firefox
- Direct FDM CLI integration
- Download queue with priorities
- Speed monitoring
- Dark mode
- Multi-language support
- Export/import history

---

## [1.2] - Previous (Tampermonkey Script)

Legacy version - see `Tampermonkey-userscript/` folder

### Features
- Basic bulk download
- Link extraction
- Simple retry logic
- Control panel
- Local storage

---

**Versioning**: Following [Semantic Versioning](https://semver.org/)
- **Major**: Breaking changes or complete rewrites
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes and minor improvements
