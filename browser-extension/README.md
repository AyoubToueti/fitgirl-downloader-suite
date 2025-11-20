# FitGirl FDM Downloader - Browser Extension

A powerful browser extension for automating downloads from FitGirl Repacks with advanced features like pause/resume, file selection, skip functionality, and comprehensive retry system.

## 🌟 Features

### ⏹️ Stop & Pause
- **Stop Button**: Appears when download starts (fixed position, top-right)
- **Smart Pause**: Stops after current file finishes to prevent corruption
- **Auto-Resume**: Resume downloads from where you left off (with 1-hour expiration)
- **Visual Feedback**: Shows "Stopping..." status and disables button during pause

### 📋 File Selection System
- **Individual Checkboxes**: Select/deselect specific files to download
- **Bulk Actions**: Select All / Deselect All / Reset Selections buttons
- **Live Counter**: Shows "X of Y files selected (Z skipped)"
- **Page-Specific Persistence**: Selections saved per page using URL hash
- **Smart Defaults**: Respects skipped files (disabled checkboxes)

### ⏭️ Skip Functionality
- **Skip Individual Files**: Skip button on each file item
- **Undo Skip**: Reverse skip decision with one click
- **Persistent State**: Skipped files persist across page reloads
- **Visual Feedback**: Gray styling with strike-through text

### 🔄 Comprehensive Retry System
- **Retry All Failed**: Bulk retry button in control panel
- **Individual Retry**: Retry button on each failed file item
- **Dual Feedback**: File item badge + control panel status
- **Auto-Cleanup**: Removes from failed list on successful retry
- **Persistent Failures**: Failed files persist across page reloads

### 🎨 Modern UI
- **Card-Based Layout**: Clean, modern file list design
- **Color-Coded Badges**:
  - 🟡 Yellow: Processing
  - 🟢 Green: Success
  - 🔴 Red: Failed
  - 🟠 Orange: Retrying
  - ⚪ Gray: Skipped
- **Smooth Animations**: 0.3s transitions on all interactions
- **Progress Bar**: Real-time progress with percentage
- **Hover Effects**: Interactive cards with elevation on hover

### 📊 Enhanced Popup
- **Statistics Dashboard**: Total, successful, and failed download counts
- **Progress Tracking**: Live progress bar with current/total files
- **Pause State Indicator**: Shows paused downloads with timestamp
- **Retry All Failed**: One-click retry of all failed downloads
- **View Failed List**: Detailed list of failed downloads with error messages
- **Clear Logs**: Reset all statistics and history

## 📦 Installation

### Chrome/Edge (Manifest V3)

1. **Download the Extension**
   ```bash
   cd fitgirl-downloader-suite/browser-extension
   ```

2. **Add Icons** (Important!)
   - Add `icon16.png`, `icon48.png`, and `icon128.png` to the `icons/` folder
   - See `icons/README.md` for resources

3. **Load in Browser**
   - Open Chrome/Edge and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `browser-extension` folder

4. **Verify Installation**
   - Extension icon should appear in toolbar
   - Visit a FitGirl Repacks download page to test

### Firefox (Manifest V2 - Coming Soon)

Firefox support requires a Manifest V2 version. A separate build will be provided.

## 🚀 Usage

### On FitGirl Repacks Pages

1. **Navigate** to any FitGirl Repacks game page with download links
2. **Wait** for the extension to detect download links (auto-initializes)
3. **See UI** - A purple download interface appears at the top of the page

### Basic Download Flow

1. **Select Files**: Check/uncheck boxes for files you want to download
2. **Optional**: Skip files you don't want (gray out permanently)
3. **Click**: "🚀 Start Download" button
4. **Monitor**: Progress bar shows real-time status
5. **Stop Anytime**: Click "⏹️ Stop" to pause (resumes on next visit)

### Advanced Features

#### Pause & Resume
```
1. Click "⏹️ Stop" during download
2. Extension saves current progress
3. Return to same page within 1 hour
4. Banner appears: "▶️ Resume Download"
5. Click to continue from where you left off
```

#### Skip Files
```
1. Click "⏭️ Skip" on any file
2. File turns gray and checkbox disables
3. Click "↩️ Undo" to reverse skip
4. Skipped files persist across sessions
```

#### Retry Failed Downloads
```
Option 1: Individual Retry
- Click "🔄 Retry" button on failed file

Option 2: Bulk Retry
- Open extension popup
- Click "🔄 Retry All Failed"
- Navigate to download page
```

### Popup Controls

Click the extension icon in toolbar to:
- **View Statistics**: Total, successful, failed downloads
- **Check Pause State**: See if any download is paused
- **Retry Failed**: Bulk retry all failed downloads
- **View Failed List**: See detailed error messages
- **Clear Logs**: Reset all statistics (requires confirmation)

## 🔧 Configuration

### Timing Settings (in `shared/config.js`)

```javascript
CONFIG = {
  WAIT_BETWEEN: 2000,                    // ms between downloads
  MAX_RETRIES_EXTRACTION: 3,             // URL extraction retries
  MAX_RETRIES_FDM: 2,                    // Download retries
  RETRY_BASE_DELAY_EXTRACTION: 2000,     // Base retry delay (ms)
  RETRY_BASE_DELAY_FDM: 1000,            // FDM retry delay (ms)
  CONSECUTIVE_FAILURES_THRESHOLD: 3,     // Pause after N failures
  PAUSE_EXPIRATION_TIME: 3600000         // 1 hour (ms)
}
```

### Customizing Colors (in `content/styles.css` or `popup/popup.css`)

```css
:root {
  --fg-primary: #667eea;        /* Main purple */
  --fg-primary-dark: #764ba2;   /* Dark purple */
  --fg-success: #10b981;        /* Green */
  --fg-danger: #ef4444;         /* Red */
  --fg-warning: #f59e0b;        /* Orange */
  --fg-info: #3b82f6;           /* Blue */
  --fg-muted: #6b7280;          /* Gray */
}
```

## 🗂️ File Structure

```
browser-extension/
├── manifest.json              # Extension metadata (MV3)
├── background/
│   └── background.js         # Service worker (network, downloads, storage)
├── content/
│   ├── content-script.js     # Page interaction & UI injection
│   └── styles.css            # Modern UI styling
├── popup/
│   ├── popup.html            # Extension popup UI
│   ├── popup.js              # Popup logic & stats
│   └── popup.css             # Popup styling
├── shared/
│   ├── config.js             # Configuration constants
│   └── utils.js              # Shared utility functions
└── icons/
    ├── icon16.png            # 16x16 icon (required)
    ├── icon48.png            # 48x48 icon (required)
    └── icon128.png           # 128x128 icon (required)
```

## 🔑 Permissions Explained

- **storage**: Save download history, selections, and pause state
- **downloads**: Trigger file downloads via browser
- **notifications**: Show download status notifications
- **tabs**: Open new tabs for retry functionality
- **host_permissions**: Access FitGirl and fuckingfast.co pages

## 🐛 Troubleshooting

### Extension Not Detecting Links
- **Cause**: Page loaded before extension initialized
- **Solution**: Refresh the page (F5) or wait a few seconds

### Downloads Not Starting
- **Cause**: Browser download permissions not granted
- **Solution**: Check browser settings → Downloads → Allow automatic downloads

### Pause State Not Restoring
- **Cause**: Pause expired (>1 hour) or different page
- **Solution**: Pause state is page-specific and expires after 1 hour

### Failed Downloads Not Retrying
- **Cause**: Content script needs to be on the download page
- **Solution**: Navigate to the original FitGirl page, then retry

### Stop Button Not Working
- **Cause**: Current file must finish first (prevents corruption)
- **Solution**: Wait for current file to complete, then it will stop

## 🛠️ Development

### Prerequisites
- Chrome/Edge browser (version 88+)
- Text editor (VS Code recommended)
- Basic JavaScript knowledge

### Making Changes

1. **Edit Files**: Modify `.js` or `.css` files as needed
2. **Reload Extension**:
   - Go to `chrome://extensions/`
   - Click reload icon on extension card
3. **Test Changes**: Visit a FitGirl page and verify

### Debug Console

- **Content Script**: Right-click page → Inspect → Console tab
- **Background Script**: `chrome://extensions/` → Extension details → Inspect service worker
- **Popup**: Right-click extension icon → Inspect popup

### Common Dev Tasks

```javascript
// Log from content script
console.log('FitGirl Downloader:', message);

// Test storage
chrome.storage.local.get(null, (data) => console.log(data));

// Clear all storage
chrome.storage.local.clear();
```

## 📝 Known Limitations

1. **FDM Integration**: Uses browser's default download handler (FDM must be set as default)
2. **Cross-Origin**: Can only access specified domains in manifest
3. **Service Worker**: May go inactive after 30 seconds (auto-restarts on message)
4. **Pause Expiration**: Paused downloads expire after 1 hour
5. **Manifest V3**: Chrome/Edge only (Firefox requires separate MV2 build)

## 🔄 Migration from Tampermonkey

| Feature | Tampermonkey | Extension |
|---------|-------------|-----------|
| Installation | Requires Tampermonkey | Native extension |
| Permissions | Auto-granted | User must approve |
| Storage | Synchronous | Async (Promise-based) |
| Downloads | `GM_download` (limited) | `chrome.downloads` (full API) |
| UI | DOM injection only | Popup + Page injection |
| Updates | Manual | Auto-update (if published) |


## 📄 License

MIT License - See main project README

## 🙏 Credits

- FitGirl Repacks for game distribution
- Chrome Extension API documentation

## 🔗 Related Projects
- **Main Repository**: [fitgirl-downloader-suite](../)
- **Browser Automation**: [../browser-automation/](../browser-automation/)
- **Tampermonkey Script**: [../tampermonkey-script/](../tampermonkey-script/)
- **Python CloudScraper**: [../python-cloudscraper/](../python-cloudscraper/)

---

**Note**: This extension is for personal use and automation convenience. Please respect website terms of service and rate limits.
