# FitGirl Downloader (Python)

A lightweight, fast, and reliable standalone terminal app that **automatically extracts direct download links** from `fuckingfast.co` paste files and hands them to **your download manager** — **without a browser**.

It works with whatever you have: GUI download managers are launched with the URL in their queue, and terminal download managers run **inline** so you can watch progress. If nothing is detected, you can point it at any executable.

> No Puppeteer
> No browser overhead
> No popup blockers
> **Zero dependencies** — Python standard library only (nothing to pip-install)
> Works in seconds, not minutes
> **Any download manager**: auto-detected, CLI flags, environment variable, or interactive setup
> **Pass any paste file as an argument** — or run with no arguments for an interactive menu
> **Real filenames** — reads the actual archive name from every paste line (or the server's headers) so terminal downloads don't end up as opaque tokens
> **`--download-dir`** — choose where in-terminal downloads land; remembered across runs
> **Automatic retry logic with exponential backoff**
> **Internet connection monitoring & auto-recovery**
> **Resume interrupted downloads**
> **Full audit logging**
> **Dry-run mode** to preview resolved links without launching anything

---

## How It Works

1. **Checks internet connectivity** before starting (tests DNS servers)
2. **Resolves your download manager**: CLI flag > `FG_DOWNLOADER_PATH` env var > `config.json` > auto-detect > interactive prompt
3. For each `fuckingfast.co` link, the app sends an empty-body **`POST /f/<id>/go`** with a browser `User-Agent`
4. The server replies with the **direct `dl.fuckingfast.co/...` download URL** in the `HX-Redirect` header
5. **Hands the URL to your download manager**
  - **GUI download managers** (Free Download Manager, Xtreme Download Manager, Persepolis, uGet): launched detached — the download appears in their queue (their own folder settings apply)
  - **Terminal download managers** (aria2, wget, curl): run attached — you watch the progress in this terminal, with `--download-dir` and the real filename passed explicitly (`aria2c --dir ... --out ...`, `wget -P`/`-O`, `curl -o`/`--output-dir`)
6. **Logs completed URLs** for resume capability (attached runs are tracked by exit code)
7. **Auto-retries on failures** with exponential backoff (up to 3 attempts for extraction, 2 for launching)
8. **Monitors connection** and waits for recovery after consecutive failures
9. Your download manager does the rest: **resumable, fast, batch downloads**

---

## Features

### Core Functionality
- **No scraping needed** — plain stdlib HTTP request works (verified live: the `/go` endpoint only needs a browser `User-Agent`)
- **Ultra-fast** — no browser, no page fetch, just one POST per file
- **Direct URL resolution** — the server answers with the `HX-Redirect` direct link
- **Any download manager** — auto-detected or explicitly configured (GUI *and* CLI downloaders)
- **Interactive session** — run with no arguments for a paste-file menu, setup, and dry-run
- **Fully flexible input** — pass **any paste file** via CLI
- **Zero leftovers** — no temp profiles, no cache
- **Colored output** — automatically degrades to plain text on non-terminal output

### Reliability & Resilience
- **Smart retry logic** — automatic retries with exponential backoff
  - 3 retries for URL extraction (2s → 4s → 8s delays)
  - 2 retries for send/launch (1s → 2s delays)
- **Internet connection monitoring** — checks connectivity before starting
- **Auto-recovery** — detects 3 consecutive failures and waits for connection restoration
-  **Configurable timeouts** — default 1000s connection wait, fully customizable
- **Detailed progress tracking** — shows retry attempts and failure reasons

### Session Management
- **Resume capability** — continue from where you left off with `--resume` flag
- **Audit logging** — tracks completed downloads with timestamps (`completed_downloads.log`)
- **Failure tracking** — logs failed URLs with error details (`failed_downloads.txt`)
- **Log management** — clear logs before new sessions with `--clear-log` flag
- **Smart skipping** — automatically skips already-downloaded files in resume mode

---

## Prerequisites

- **Python 3.8+** (standard library only — no pip packages)
- **Any download manager**, or none at all (dry-run still resolves links):
  - Auto-detected GUI download managers: Free Download Manager, Xtreme Download Manager, Persepolis, uGet
  - Auto-detected terminal download managers: `aria2c`, `wget`, `curl` (on PATH)
  - Or **any binary** via `--downloader-path` / interactive prompt

---

## Installation

**Nothing to install** — the app uses only the Python standard library.

Don't have a download manager? `wget`/`curl` are enough (`aria2`/any manager is nicer) — the app picks one up automatically.

---

## Usage

### No arguments = interactive session
```bash
python fitgirl_downloader.py
```
Opens a menu:
1. Pick a paste file (auto-scanned from the script's directory, cwd, `~/Downloads`)
2. Set download manager path (validated and saved)
3. Dry-run — print resolved links only
4. Exit

### One-liner
```bash
python fitgirl_downloader.py your-paste-file.txt
```

### Example:
```bash
python fitgirl_downloader.py paste-bc03dda029e41067.txt
```

### Advanced Options
```bash
# Resolve and print direct links without launching anything
python fitgirl_downloader.py paste.txt --dry-run

# Use a specific download manager (path is validated and saved for future runs)
python fitgirl_downloader.py paste.txt --downloader-path "/path/to/your/manager"

# Register a download manager and exit
python fitgirl_downloader.py --set-downloader "/path/to/your/manager"

# Download into a specific folder (created if missing, remembered for next runs)
python fitgirl_downloader.py paste.txt --download-dir "/path/to/games"

# Resume from last session (skip already completed URLs)
python fitgirl_downloader.py paste.txt --resume

# Clear logs before starting fresh
python fitgirl_downloader.py paste.txt --clear-log

# List detected paste files (link-containing .txt files)
python fitgirl_downloader.py --list-paste

# Set custom connection timeout (default: 1000s)
python fitgirl_downloader.py paste.txt --connection-timeout 300

# Combine flags
python fitgirl_downloader.py paste.txt --resume --connection-timeout 600
```

### What Happens:
1. **Connection check** — verifies internet connectivity (DNS: 8.8.8.8, 1.1.1.1)
2. **Download manager resolution** — the first available is used (see resolution order below)
3. **Load resume state** — skips URLs already completed (if `--resume` used)
4. **Read URLs and real filenames** from your file
  - Every paste line `- https://fuckingfast.co/<id>#<File.Name>.rar` carries the **real filename** after `#`
  - If a line has no fragment (or is a bare URL), the app asks the server with a **1-byte ranged request** and reads the real name from `Content-Disposition`
5. **POST `/f/<id>/go`** for each link silently (no browser, no page fetch)
6. **Read the direct tokenized `dl.fuckingfast.co/...` URL** from the `HX-Redirect` header
7. **Retry on failures** — automatic retries with exponential backoff
8. **Monitor connection** — re-checks and waits if 3 consecutive failures occur
9. **Launch/hand off** each URL to the download manager
10. **Log progress** — saves completed/failed URLs with timestamps
11. **Display statistics** — comprehensive summary at the end

> **GUI managers**: keep the app open — downloads appear in their queue immediately.
> **Terminal managers**: run inline; Ctrl+C aborts the current download and the session.

### Download Manager Resolution Order

1. `--downloader-path PATH` (validated, then saved to `config.json`)
2. `FG_DOWNLOADER_PATH` environment variable
3. Saved choice in `config.json` (next to the script)
4. Auto-detect: known install paths + `PATH` lookup (GUI managers first, then `aria2c` → `wget` → `curl`)
5. Interactive prompt (paste a full path, or Enter to use a terminal downloader)
6. **Dry-run fallback (links only, with a warning)**

A path whose binary name doesn't match a known download manager is treated as a **custom manager** and launched with the URL as its only argument.

### Destination & Naming

| Capability | Terminal managers (aria2/wget/curl) | GUI managers |
|------------|-------------------------------------|--------------|
| `--download-dir` | passed explicitly (`--dir` / `-P` / `--output-dir`) | they keep their own settings |
| real filename | passed explicitly (`--out` / `-O` / `-o`) | handled by the server's Content-Disposition |

If a paste line has no `#Name` fragment, the address is probed with a 1-byte ranged request and the real filename is read from the server's `Content-Disposition` header.

### Command-Line Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `paste_file` | Path to paste file (optional; opens the interactive menu if omitted) | - |
| `--downloader-path PATH` | Use this executable, save it as your download manager | - |
| `--set-downloader PATH` | Register the executable and run | - |
| `--download-dir DIR` | Destination directory (created if missing; saved for next runs) | current dir |
| `--dry-run` | Resolve and print direct links without launching anything | Disabled |
| `--list-paste` | List detected paste files and exit | Disabled |
| `--resume` | Resume from last session, skip completed URLs | Disabled |
| `--clear-log` | Clear completed and failed logs before starting | Disabled |
| `--connection-timeout SECONDS` | Max seconds to wait for connection recovery | 1000 |

---

## File Structure

```
python-downloader/
├── fitgirl_downloader.py ← Main app (single file, zero dependencies)
├── config.json ← Auto-generated: persisted download manager choice
├── completed_downloads.log ← Auto-generated: completed URLs with timestamps
├── failed_downloads.txt ← Auto-generated: failed URLs with error details
└── (your-paste-file.txt) ← Any paste file you provide
```

> Your paste file can be **anywhere** — just pass the full or relative path.
> Runtime files (`config.json`, logs) are created automatically in the script directory and persist across sessions. They are gitignored.

---

## Configuration

### Download Manager Setup (One-Time)

```bash
python fitgirl_downloader.py --set-downloader /path/to/your/manager
```

Saved to `config.json`:

```json
{
 "launcher": {
 "path": "C:\\Program Files\\...\\manager.exe",
 "key": "custom"
 }
}
```

> Popular managers are detected automatically — you usually don't need this.
> Environment variable `FG_DOWNLOADER_PATH` is handy for temporary overrides (per-run, not saved).
> Re-run `--set-downloader` anytime to re-point it.

### Download Directory

```bash
python fitgirl_downloader.py --download-dir /media/games/fitgirl
```

Validated, created if missing, and saved to `config.json` (`"download_dir"`), so later sessions keep using it until you pass a different `--download-dir` or delete the entry. In-terminal managers write there directly; GUI managers apply their own folder configuration.

### Advanced Configuration (Optional)

You can customize retry behavior and connection settings at the top of the script:

```python
# Retry Configuration
MAX_RETRIES_EXTRACTION = 3 # Number of retries for URL extraction
MAX_RETRIES_FDM = 2 # Number of retries for send/launch
RETRY_BASE_DELAY_EXTRACTION = 2 # Base delay for extraction retries (exponential)
RETRY_BASE_DELAY_FDM = 1 # Base delay for send retries (exponential)

# Connection Configuration
CONNECTIVITY_CHECK_TIMEOUT = 5 # Seconds to wait when checking connection
CONSECUTIVE_FAILURES_THRESHOLD = 3 # Failures before re-checking connection
CONNECTION_WAIT_TIMEOUT = 1000 # Max seconds to wait for connection recovery

# Other Settings
WAIT_BETWEEN = 2 # Seconds to wait between detached (GUI) sends
TIMEOUT = 15 # HTTP request timeout
```

> **Exponential backoff**: With base delay of 2s and 3 retries, delays are: 2s → 4s → 8s

---

## Paste File Format

Your file must contain lines like:

```txt
- https://fuckingfast.co/5jaujd0c3qef#Nobody_Wants_to_Die_--_fitgirl-repacks.site_--_.part01.rar
- https://fuckingfast.co/ntd5eex141lw#Nobody_Wants_to_Die_--_fitgirl-repacks.site_--_.part02.rar
```

> The filename after `#` is **ignored** — only the base URL is used.

---

## Output & Statistics

After processing, you'll see a detailed summary:

```
==================================================
 DOWNLOAD SUMMARY
==================================================
 Sent to downloader: 25/25
 Skipped (already completed): 0
 Extraction failures: 0
 Send failures: 0
 Total time: 87s
==================================================
```

If there are failures:
```
 Failed URLs logged to: /path/to/python-downloader/failed_downloads.txt
 Use --resume flag to retry or continue from where you left off
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

## Troubleshooting

### No Download Manager Found
- **Symptom**: "No download manager detected automatically."
- **Fix**: Enter a full path when prompted, or run `python fitgirl_downloader.py --set-downloader "/path/to/manager"`
- **Temporary choice**: `FG_DOWNLOADER_PATH=/path/to/manager python fitgirl_downloader.py paste.txt`
- **Nothing installed?** Install `wget`/`aria2` — or use `--dry-run` to resolve links and hand them to anything manually

### Connection Issues
- **Symptom**: "No internet connection detected!"
- **Solution**: The app automatically waits for connection restoration (max 1000s by default)
- **Override**: Use `--connection-timeout 300` for shorter wait time
- **Abort**: Press `Ctrl+C` during connection wait to abort

### Repeated Failures
- **Symptom**: Multiple consecutive failures
- **Behavior**: After 3 consecutive failures, the app re-checks connection and waits if needed
- **Action**: Check `failed_downloads.txt` for error patterns
- **Retry**: Use `--resume` to continue from the last successful download

### Resume Not Working
- **Issue**: URLs already completed are processed again
- **Cause**: Missing `--resume` flag
- **Fix**: Always use `python fitgirl_downloader.py paste.txt --resume` for continuing sessions

### Clear Old Sessions
- **Issue**: Want to start fresh without old logs
- **Fix**: Use `--clear-log` flag to delete completed and failed logs before starting

## Why Not Use a Browser?

Because it's **unnecessary**:
- The `/go` endpoint resolves the link with **one POST + a browser User-Agent**
- No page content, cookies, or interaction are required
- Cloudflare tolerates plain clients for this endpoint (but rejects requests without any `User-Agent`)
- **Faster, lighter, scriptable**
- **Better error handling** with retries and connection monitoring

This app does **one thing perfectly**: extract the direct URL and hand it to your download manager with maximum reliability.

---

## License

MIT License — free to use, modify, and share.
