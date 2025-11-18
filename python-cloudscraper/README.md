# FitGirl Auto Downloader (Python + FDM)

A lightweight, fast, and reliable tool to **automatically extract and send FitGirl repack download links** from `fuckingfast.co` directly to **Free Download Manager (FDM)** — **without a browser**.

> ✅ No Puppeteer  
> ✅ No browser overhead  
> ✅ No popup blockers  
> ✅ Bypasses Cloudflare with `cloudscraper`  
> ✅ Works in seconds, not minutes  
> ✅ **Pass any paste file as an argument**  
> ✅ **Automatic retry logic with exponential backoff**  
> ✅ **Internet connection monitoring & auto-recovery**  
> ✅ **Resume interrupted downloads**  
> ✅ **Full audit logging**

---

## 🔧 How It Works

1. **Checks internet connectivity** before starting (tests DNS servers)
2. You provide a **paste file path** as a command-line argument
3. The script fetches each `fuckingfast.co` page using **`cloudscraper`** (to bypass Cloudflare)
4. **Extracts the real `/dl/...` download URL** from the inline `<script>` tag
5. **Sends the URL directly to FDM** via command line (`fdm.exe "URL"`)
6. **Logs completed URLs** for resume capability
7. **Auto-retries on failures** with exponential backoff (up to 3 attempts for extraction, 2 for FDM)
8. **Monitors connection** and waits for recovery after consecutive failures
9. FDM handles the rest: **resumable, fast, batch downloads**

---

## ✅ Features

### Core Functionality
- 🌩️ **Cloudflare bypass** using `cloudscraper`
- ⚡ **Ultra-fast** — no browser, just HTTP + regex
- 🎯 **Precise URL extraction** — parses `window.open(...)` from page script
- 🖥️ **FDM CLI integration** — sends links directly to desktop app
- 📋 **Fully flexible input** — pass **any paste file** via CLI
- 🔧 **Minimal config** — only FDM path needs setup (once)
- 🧹 **Zero leftovers** — no temp profiles, no cache

### Reliability & Resilience
- 🔄 **Smart retry logic** — automatic retries with exponential backoff
  - 3 retries for URL extraction (2s → 4s → 8s delays)
  - 2 retries for FDM sending (1s → 2s delays)
- 🌐 **Internet connection monitoring** — checks connectivity before starting
- 🔌 **Auto-recovery** — detects 3 consecutive failures and waits for connection restoration
- ⏱️ **Configurable timeouts** — default 1000s connection wait, fully customizable
- 📊 **Detailed progress tracking** — shows retry attempts and failure reasons

### Session Management
- 💾 **Resume capability** — continue from where you left off with `--resume` flag
- 📝 **Audit logging** — tracks completed downloads with timestamps (`completed_downloads.log`)
- ⚠️ **Failure tracking** — logs failed URLs with error details (`failed_downloads.txt`)
- 🗑️ **Log management** — clear logs before new sessions with `--clear-log` flag
- 🎯 **Smart skipping** — automatically skips already-downloaded files in resume mode

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

### Basic Usage
```bash
python fitgirl_fdm_downloader.py your-paste-file.txt
```

### Example:
```bash
python fitgirl_fdm_downloader.py paste-bc03dda029e41067.txt
```

### Advanced Options
```bash
# Resume from last session (skip already completed URLs)
python fitgirl_fdm_downloader.py paste.txt --resume

# Clear logs before starting fresh
python fitgirl_fdm_downloader.py paste.txt --clear-log

# Set custom connection timeout (default: 1000s)
python fitgirl_fdm_downloader.py paste.txt --connection-timeout 300

# Combine flags
python fitgirl_fdm_downloader.py paste.txt --resume --connection-timeout 600
```

### What Happens:
1. **Connection check** — verifies internet connectivity (DNS: 8.8.8.8, 1.1.1.1)
2. **Load resume state** — skips URLs already completed (if `--resume` used)
3. **Read URLs** from your file
4. **Fetch each page** silently (no browser)
5. **Extract** the real `/dl/...` tokenized URL
6. **Retry on failures** — automatic retries with exponential backoff
7. **Monitor connection** — re-checks and waits if 3 consecutive failures occur
8. **Launch FDM** with each URL
9. **Log progress** — saves completed/failed URLs with timestamps
10. **Display statistics** — comprehensive summary at the end

> 📌 **Keep FDM open** — downloads appear in its queue immediately.

### Command-Line Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `paste_file` | Path to paste file (required) | - |
| `--resume` | Resume from last session, skip completed URLs | Disabled |
| `--clear-log` | Clear completed and failed logs before starting | Disabled |
| `--connection-timeout SECONDS` | Max seconds to wait for connection recovery | 1000 |

---

## 📁 File Structure

```
python-cloudscraper/
├── fitgirl_fdm_downloader.py      ← Main script (accepts CLI arg)
├── completed_downloads.log        ← Auto-generated: completed URLs with timestamps
├── failed_downloads.txt           ← Auto-generated: failed URLs with error details
└── (your-paste-file.txt)          ← Any paste file you provide
```

> 💡 Your paste file can be **anywhere** — just pass the full or relative path.  
> 📝 Log files are created automatically in the script directory and persist across sessions.

---

## ⚙️ Configuration

### FDM Path (One-Time Setup)

Open `fitgirl_fdm_downloader.py` and update **only if needed**:

```python
FDM_PATH = r"C:\Program Files\Softdeluxe\Free Download Manager\fdm.exe"
```

> ✅ Default should work for most FDM installs.  
> ❌ If FDM is elsewhere, update this path once.

### Advanced Configuration (Optional)

You can customize retry behavior and connection settings at the top of the script:

```python
# Retry Configuration
MAX_RETRIES_EXTRACTION = 3           # Number of retries for URL extraction
MAX_RETRIES_FDM = 2                  # Number of retries for FDM send
RETRY_BASE_DELAY_EXTRACTION = 2      # Base delay for extraction retries (exponential)
RETRY_BASE_DELAY_FDM = 1             # Base delay for FDM retries (exponential)

# Connection Configuration
CONNECTIVITY_CHECK_TIMEOUT = 5       # Seconds to wait when checking connection
CONSECUTIVE_FAILURES_THRESHOLD = 3   # Failures before re-checking connection
CONNECTION_WAIT_TIMEOUT = 1000       # Max seconds to wait for connection recovery

# Other Settings
WAIT_BETWEEN = 2                     # Seconds to wait between downloads
TIMEOUT = 15                         # HTTP request timeout
```

> 🎯 **Exponential backoff**: With base delay of 2s and 3 retries, delays are: 2s → 4s → 8s

---

## 📝 Paste File Format

Your file must contain lines like:

```txt
- https://fuckingfast.co/5jaujd0c3qef#Nobody_Wants_to_Die_--_fitgirl-repacks.site_--_.part01.rar
- https://fuckingfast.co/ntd5eex141lw#Nobody_Wants_to_Die_--_fitgirl-repacks.site_--_.part02.rar
```

> The filename after `#` is **ignored** — only the base URL is used.

---

## 📊 Output & Statistics

After processing, you'll see a detailed summary:

```
==================================================
📊 DOWNLOAD SUMMARY
==================================================
✅ Successfully sent to FDM: 25/25
⏭️ Skipped (already completed): 0
❌ Extraction failures: 0
❌ FDM send failures: 0
⏱️ Total time: 87s
==================================================
```

If there are failures:
```
⚠️ Failed URLs logged to: C:\path\to\python-cloudscraper\failed_downloads.txt
💡 Use --resume flag to retry or continue from where you left off
```

### Log File Formats

**completed_downloads.log:**
```
2025-11-18 14:23:45 | https://fuckingfast.co/5jaujd0c3qef
2025-11-18 14:24:12 | https://fuckingfast.co/ntd5eex141lw
```

**failed_downloads.txt:**
```
2025-11-18 14:25:30 | https://fuckingfast.co/badlink123 | Extraction error: HTTPError 404
2025-11-18 14:26:15 | https://fuckingfast.co/timeout456 | Extraction error: Timeout
```

## 🔧 Troubleshooting

### Connection Issues
- **Symptom**: "No internet connection detected!"
- **Solution**: Script automatically waits for connection restoration (max 1000s by default)
- **Override**: Use `--connection-timeout 300` for shorter wait time
- **Abort**: Press `Ctrl+C` during connection wait to abort

### Repeated Failures
- **Symptom**: Multiple consecutive failures
- **Behavior**: After 3 consecutive failures, script re-checks connection and waits if needed
- **Action**: Check `failed_downloads.txt` for error patterns
- **Retry**: Use `--resume` to continue from last successful download

### Resume Not Working
- **Issue**: URLs already completed are processed again
- **Cause**: Missing `--resume` flag
- **Fix**: Always use `python fitgirl_fdm_downloader.py paste.txt --resume` for continuing sessions

### Clear Old Sessions
- **Issue**: Want to start fresh without old logs
- **Fix**: Use `--clear-log` flag to delete completed and failed logs before starting

## ❓ Why Not Use a Browser?

Because it's **unnecessary**:
- The real download URL is **in plain JavaScript**
- No user interaction or cookies are required
- `cloudscraper` handles Cloudflare like a human
- **Faster, lighter, scriptable**
- **Better error handling** with retries and connection monitoring

This tool does **one thing perfectly**: extract and forward the URL to FDM with maximum reliability.

---

## 📜 License

MIT License — free to use, modify, and share.