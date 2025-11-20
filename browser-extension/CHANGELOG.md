# Changelog

All notable changes to the FitGirl FDM Downloader Extension will be documented in this file.

## [2.0.0] - 2024-11-18

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
