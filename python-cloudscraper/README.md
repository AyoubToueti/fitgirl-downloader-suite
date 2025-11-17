# FitGirl Auto Downloader (Python + FDM)

A lightweight, fast, and reliable tool to **automatically extract and send FitGirl repack download links** from `fuckingfast.co` directly to **Free Download Manager (FDM)** — **without a browser**.

> ✅ No Puppeteer  
> ✅ No browser overhead  
> ✅ No popup blockers  
> ✅ Bypasses Cloudflare with `cloudscraper`  
> ✅ Works in seconds, not minutes  
> ✅ **Pass any paste file as an argument**

---

## 🔧 How It Works

1. You provide a **paste file path** as a command-line argument
2. The script fetches each `fuckingfast.co` page using **`cloudscraper`** (to bypass Cloudflare)
3. **Extracts the real `/dl/...` download URL** from the inline `<script>` tag
4. **Sends the URL directly to FDM** via command line (`fdm.exe "URL"`)
5. FDM handles the rest: **resumable, fast, batch downloads**

---

## ✅ Features

- 🌩️ **Cloudflare bypass** using `cloudscraper`
- ⚡ **Ultra-fast** — no browser, just HTTP + regex
- 🎯 **Precise URL extraction** — parses `window.open(...)` from page script
- 🖥️ **FDM CLI integration** — sends links directly to desktop app
- 📋 **Fully flexible input** — pass **any paste file** via CLI
- 🔧 **Minimal config** — only FDM path needs setup (once)
- 🧹 **Zero leftovers** — no temp profiles, no cache

---

## 📦 Prerequisites

- **Windows** (FDM path is Windows-specific)
- **[Free Download Manager (FDM)](https://www.freedownloadmanager.org/)** installed
- **Python 3.7+**
- Basic terminal knowledge

---

## 🚀 Installation

```bash
pip install cloudscraper
```

> ⚠️ Ensure `fdm.exe` is installed (usually at `C:\Program Files\Softdeluxe\Free Download Manager\fdm.exe`)

---

## ▶️ Usage

```bash
python fitgirl_fdm_downloader.py your-paste-file.txt
```

### Example:
```bash
python fitgirl_fdm_downloader.py paste-bc03dda029e41067.txt
```

The script will:
1. Read all URLs from your file
2. Fetch each page silently (no browser)
3. Extract the real `/dl/...` tokenized URL
4. Launch FDM with it
5. Pause briefly between files (to be polite)

> 📌 **Keep FDM open** — downloads appear in its queue immediately.

---

## 📁 File Structure

```
python-cloudscraper/
├── fitgirl_fdm_downloader.py   ← Main script (accepts CLI arg)
└── (your-paste-file.txt)       ← Any paste file you provide
```

> 💡 Your paste file can be **anywhere** — just pass the full or relative path.

---

## ⚙️ Configuration (One-Time Setup)

Open `fitgirl_fdm_downloader.py` and update **only if needed**:

```python
FDM_PATH = r"C:\Program Files\Softdeluxe\Free Download Manager\fdm.exe"
```

> ✅ Default should work for most FDM installs.  
> ❌ If FDM is elsewhere, update this path once.

All other settings (delays, timeout) are reasonable defaults.

---

## 📝 Paste File Format

Your file must contain lines like:

```txt
- https://fuckingfast.co/5jaujd0c3qef#Nobody_Wants_to_Die_--_fitgirl-repacks.site_--_.part01.rar
- https://fuckingfast.co/ntd5eex141lw#Nobody_Wants_to_Die_--_fitgirl-repacks.site_--_.part02.rar
```

> The filename after `#` is **ignored** — only the base URL is used.

---

## ❓ Why Not Use a Browser?

Because it’s **unnecessary**:
- The real download URL is **in plain JavaScript**
- No user interaction or cookies are required
- `cloudscraper` handles Cloudflare like a human
- **Faster, lighter, scriptable**

This tool does **one thing perfectly**: extract and forward the URL to FDM.

---

## 📜 License

MIT License — free to use, modify, and share.