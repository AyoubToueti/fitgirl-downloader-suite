# FitGirl Downloader Suite

**Four independent, purpose-built tools** to automate downloading [FitGirl repack](https://fitgirl-repacks.site/) game parts from `fuckingfast.co`.

Choose the approach that fits your needs:

| Project | Tech Stack | Best For |
|--------|-----------|--------|
| **`browser-extension`** ⭐ | Chrome Extension (MV3) | Users who want **one-click native browser integration** with pause/resume, file selection, and retry |
| **`Tampermonkey-userscript`** | Userscript (JS) | Users who prefer **userscripts** and already have Tampermonkey installed |
| **`browser-automation`** | Node.js + Puppeteer | Users who want **realistic browser interaction** and automation scripts |
| **`python-cloudscraper`** | Python + cloudscraper | Users who want **speed, simplicity, and minimal resource usage** — no browser needed |

All tools:
- Work with Cloudflare-protected pages
- Handle multiple file parts automatically
- Send downloads to **Free Download Manager (FDM)** or your **default browser downloader**
- Support retry and error handling

---

## 🔧 Projects Overview

### 1. [`browser-extension`](./browser-extension/) ⭐ **NEW!**
A **native browser extension** (Chrome/Edge) with advanced features:
- **🧭 Dual UI Modes**: Switch between Modal UI and Inline UI from popup settings
- **🔄 Instant Apply**: Changing UI mode auto-reloads the active tab
- **⏹️ Stop & Resume**: Pause downloads and resume later (1-hour window)
- **📋 File Selection**: Checkboxes to select/deselect specific files
- **⏭️ Skip Functionality**: Skip unwanted files with undo option
- **🔄 Comprehensive Retry**: Retry individual or all failed downloads
- **🎨 Modern UI**: Card-based design with real-time progress tracking
- **📊 Statistics Dashboard**: Track successful/failed downloads in popup
- **Auto-Injection**: Automatically detects FitGirl download pages

✅ **Use this if you:**
- Want **native browser integration** without Tampermonkey
- Need **pause/resume** functionality for large downloads
- Prefer **visual file selection** with checkboxes
- Want **automatic retry** for failed downloads
- Like **modern, polished UI** with real-time feedback

➡️ [View Extension README](./browser-extension/README.md) | [Quick Install Guide](./browser-extension/INSTALL.md)

---

### 2. [`Tampermonkey-userscript`](./Tampermonkey-userscript/)
A **Tampermonkey/Greasemonkey userscript** for browser automation:
- Automatically detects FitGirl download links
- Adds bulk download button to pages
- Extracts real download URLs
- Sends to FDM or browser downloader
- Tracks completed and failed downloads
- Control panel with statistics

✅ **Use this if you:**
- Already have **Tampermonkey installed**
- Prefer **userscripts** over extensions
- Want **quick script edits** without reload
- Need **cross-browser compatibility** (Firefox, Chrome, Edge, etc.)

➡️ [View Userscript](./Tampermonkey-userscript/)

---

### 3. [`browser-automation`](./browser-automation/)
A **browser automation tool** using **Puppeteer**:
- Launches your real or temp browser profile
- **Clicks the "DOWNLOAD" button** like a human
- Lets the browser handle downloads natively
- Processes paste files with multiple URLs
- Cleans up temp profiles automatically
- Supports Edge, Chrome, Chromium browsers

✅ **Use this if you:**
- Prefer **visual confirmation** (browser window opens)
- Want **maximum compatibility** with site logic
- Need to use your **real browser profile** (cookies, settings)
- Have a **paste file** with many links to process
- Want to automate from command line/scripts

➡️ [View Automation README](./browser-automation/README.md)

---

### 4. [`python-cloudscraper`](./python-cloudscraper/)
A **lightweight Python script** for headless operation:
- Fetches page HTML directly (no browser)
- Uses `cloudscraper` to bypass Cloudflare
- Extracts the real `/dl/...` download URL via regex
- Sends directly to **FDM via command line**
- Fast and headless operation
- Minimal dependencies

✅ **Use this if you:**
- Want **fast, silent, headless** operation
- Don't need a browser window
- Prefer **Python simplicity**
- Have FDM installed and want **instant queueing**
- Need to integrate into other Python workflows
- Running on servers or headless systems

➡️ [View Python README](./python-cloudscraper/README.md)

---

## 📥 Quick Start

### Browser Extension (Recommended for Most Users)
```bash
# Clone the repository
git clone https://github.com/AyoubToueti/fitgirl-game-downloader.git
cd fitgirl-game-downloader/browser-extension

# load unpacked extension in Chrome/Edge

# Visit any FitGirl game page and start downloading!
```
➡️ [Detailed Installation Guide](./browser-extension/INSTALL.md)

### Tampermonkey Script
1. Install [Tampermonkey](https://www.tampermonkey.net/) browser extension
2. Open `Tampermonkey-userscript/fitgirl_Tampermonkey_downloader.js`
3. Copy and paste into new Tampermonkey script
4. Save and visit any FitGirl page

### Browser Automation
```bash
cd browser-automation
npm install
node main.js paste-file.txt
```

### Python Script
```bash
cd python-cloudscraper
pip install -r requirements.txt
python fitgirl_fdm_downloader.py paste-file.txt
```

---

## 🆚 Comparison

| Feature | Browser Extension | Tampermonkey | Browser Automation | Python Script |
|---------|------------------|--------------|-------------------|---------------|
| **Installation** | Load unpacked | Paste script | npm install | pip install |
| **UI** | Modern, native | Injected | Browser window | CLI only |
| **Pause/Resume** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **File Selection** | ✅ Checkboxes | ❌ All files | ❌ All files | ❌ All files |
| **Skip Files** | ✅ With undo | ❌ No | ❌ No | ❌ No |
| **Retry System** | ✅ Individual + Bulk | ⚠️ Basic | ⚠️ Basic | ⚠️ Basic |
| **Statistics** | ✅ Popup dashboard | ⚠️ Control panel | ❌ Console only | ❌ Console only |
| **Browser Required** | Chrome/Edge | Any | Chrome/Edge | ❌ No |
| **Headless** | ❌ No | ❌ No | ⚠️ Optional | ✅ Yes |
| **Real Browser Profile** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ N/A |
| **FDM Integration** | ⚠️ Default handler | ⚠️ Default handler | ⚠️ Default handler | ✅ Direct CLI |
| **Cross-Browser** | ❌ Chrome/Edge only | ✅ All browsers | ❌ Chromium only | ✅ Universal |

---

## 🛑 Disclaimer

- These tools are for **automation convenience** only
- Respect website terms of service and rate limits
- Do not use for illegal purposes
- Downloads are your responsibility

---

## 📜 License

MIT License — free to use, modify, and share.

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/AyoubToueti/fitgirl-game-downloader/issues)
- **Discussions**: [GitHub Discussions](https://github.com/AyoubToueti/fitgirl-game-downloader/discussions)


---

## ⭐ Star History

If you find this project useful, please consider giving it a star!

---

**Made with ❤️ for the FitGirl community**
