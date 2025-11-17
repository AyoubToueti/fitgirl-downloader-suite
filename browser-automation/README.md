# FitGirl Game Downloader

An automated browser-based downloader for FitGirl repack game parts from `fuckingfast.co`.  
**No external tools. No CLI calls. No extension needed.** Just **realistic button clicks** that trigger the site’s native download flow.

> ✅ Works with **any browser**  
> ✅ Downloads go through your **default browser downloader**  
> ✅ Uses your **real browser profile** (or a temp one)  
> ✅ **Pass any paste file directly as an argument**

---

## What This Project Does

This tool automates downloading FitGirl `.rar` parts by:

1. Accepting a **paste file path** as a command-line argument
2. Launching your preferred browser (**Edge, Chrome, or Brave**) — using your **real profile** or a **temporary profile**
3. **Simulating a real user click** on the **"DOWNLOAD" button** (`<button class="gay-button">`)
4. Letting the browser **handle the download naturally** (via `window.open(...)`)
5. **Cleaning up temporary browser profiles** after use

> ⚠️ **This is a pure browser automation tool.**  
> If you use a download manager (like FDM or IDM), it may automatically capture downloads — but the script itself **does not require or interact with any external downloaders**.

> 📌 **Allow popups** for `fuckingfast.co` and **keep the browser open** until downloads finish.

---

## Features

- ✅ **CLI-driven** — pass any paste file as argument
- ✅ **Multi-browser support**: Edge, Chrome, and Brave (Windows)
- ✅ **Realistic interaction**: Simulates actual user click
- ✅ **Profile flexibility**: Uses main profile or falls back to temp
- ✅ **No external dependencies**: No FDM path, no extension setup
- ✅ **Auto cleanup**: Temp profiles deleted after browser closes
- ✅ **Robust parsing**: Handles bullet-point links from FitGirl paste files

---

## Prerequisites

- **Windows** (browser paths are Windows-specific)
- **Node.js** (v16 or higher)
- A supported **browser installed**: Edge, Chrome, or Brave
- A **paste file** with `fuckingfast.co` links (see format below)

---

## Installation

```bash
git clone <your-repo>
cd browser-automation
npm install
```

---

## ▶️ Usage

```bash
node main.js your-paste-file.txt
```

### Example:
```bash
node main.js paste-bc03dda029e41067.txt
```

The script will:
1. Parse all URLs from your file
2. Launch your browser (visible window)
3. Visit each link
4. **Click the "DOWNLOAD" button** like a real user
5. Let the browser start the download in the same tab
6. Close the browser and clean up temp files

> 🔔 **Allow popups** for `fuckingfast.co` if prompted.

---

## 📁 File Structure

```
browser-automation/
├── main.js              # Accepts CLI argument
├── config.js            # Browser paths & timeouts
├── BrowserManager.js    # Launches browser
├── DownloadManager.js   # Clicks button only
├── url-parser.js        # Parses bullet-point URLs
└── (your-paste-file.txt) # Any file you provide
```

> 💡 Your paste file can be **anywhere** — just pass the path.

---

## 📝 Paste File Format

Must contain lines like:

```txt
- https://fuckingfast.co/5jaujd0c3qef#Nobody_Wants_to_Die_--_fitgirl-repacks.site_--_.part01.rar
- https://fuckingfast.co/ntd5eex141lw#Nobody_Wants_to_Die_--_fitgirl-repacks.site_--_.part02.rar
```

> The filename after `#` is used **only for logging**.

---

## ⚙️ Optional Configuration (via `.env`)

You can still customize browser or timing:

```env
BROWSER_TYPE=edge
WAITING_TIME_BETWEEN_DOWNLOADS=3000
PAGE_LOAD_TIMEOUT=30000
TEMP_PROFILE_DIR=temp_profile
```

But **the paste file is now passed via CLI — no `.env` needed for it**.

---

## Why This Approach?

- The site says: **"All FF downloads happen in this fucking window"** → so we **must trigger the button**
- No URL extraction needed — the page handles everything
- Works even if Cloudflare or token logic changes
- **Maximum compatibility** with site behavior

---

## Troubleshooting

| Issue | Solution |
|------|--------|
| ❌ "Usage: node main.js <paste-file.txt>" | You forgot the file argument |
| ❌ Browser won’t launch | Verify browser is installed |
| ❌ Download doesn’t start | Allow popups for `fuckingfast.co` |
| ❌ "Profile in use" | Fallback to temp profile is automatic — safe to ignore |

---

## License

MIT License — free to use, modify, and distribute.