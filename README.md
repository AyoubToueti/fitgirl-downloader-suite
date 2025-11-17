# FitGirl Downloader Suite

Two **independent, purpose-built tools** to automate downloading [FitGirl repack](https://fitgirl-repacks.site/) game parts from `fuckingfast.co`.

Choose the approach that fits your needs:

| Project | Tech Stack | Best For |
|--------|-----------|--------|
| **`browser-automation`** | Node.js + Puppeteer | Users who want **realistic browser interaction**, **FDM CLI integration**, or **button-fallback** control |
| **`python-cloudscraper`** | Python + cloudscraper | Users who want **speed, simplicity, and minimal resource usage** — no browser needed |

Both tools:
- Parse your paste file (e.g., `paste-bc03dda029e41067.txt`)
- Handle all 39 parts + optional files
- Work with Cloudflare-protected pages
- Send downloads to **Free Download Manager (FDM)** or your **default browser downloader**

---

## 🔧 Projects Overview

### 1. [`browser-automation`](./browser-automation/)
A **browser automation tool** using **Puppeteer** that:
- Launches your real or temp browser profile
- **Clicks the "DOWNLOAD" button** exactly like a human
- Optionally **launches FDM via CLI** with the extracted `/dl/...` URL
- Falls back to browser download if FDM fails
- Cleans up temp profiles automatically

✅ Use this if you:
- Prefer **visual confirmation** (browser window opens)
- Want **maximum compatibility** with site logic
- Need **FDM CLI control** or **extension-less FDM usage**

➡️ [View browser-automation README](./browser-automation/README.md)

---

### 2. [`python-cloudscraper`](./python-cloudscraper/)
A **lightweight script** that:
- Fetches page HTML directly (no browser)
- Uses `cloudscraper` to bypass Cloudflare
- Extracts the real `/dl/...` download URL via regex
- Sends it **directly to FDM** via command line

✅ Use this if you:
- Want **fast, silent, headless** operation
- Don’t need a browser window
- Prefer **Python simplicity**
- Have FDM installed and want **instant queueing**

➡️ [View python-cloudscraper README](./python-cloudscraper/README.md)

---

## 📥 How to Use

1. Clone this repo:
   ```bash
   git clone https://github.com/yourname/fitgirl-downloader-suite.git
   cd fitgirl-downloader-suite
2. Choose your preferred tool:
- For browser automation: go to browser-automation/ and follow its README
- For Python script: go to python-cloudscraper/ and follow its README
- Place your paste file (e.g., paste-bc03dda029e41067.txt) in the chosen project folder.
### 🛑 Disclaimer
- These tools are for automation convenience only.
- Respect fuckingfast.co's terms and avoid excessive request rates.
### 📜 License
MIT License — free to use, modify, and share.

