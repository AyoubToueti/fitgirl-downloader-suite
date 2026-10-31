#!/usr/bin/env python3
"""FitGirl Downloader — a zero-dependency terminal app.

Resolves direct download URLs for fuckingfast.co file links with a single
POST (no browser, no page fetch, no captcha — just a standard
User-Agent) and hands them to whatever download manager the user has:

  * auto-detected GUI download managers (launched detached), or
  * CLI download managers (aria2c, wget, curl — run attached so you can
    watch progress), or
  * any binary the user points at with --downloader-path

Python standard library only — nothing to pip-install.
"""

import os
import re
import sys
import time
import shutil
import socket
import argparse
import subprocess
import json
from pathlib import Path
from datetime import datetime
from functools import wraps
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request, build_opener, install_opener, HTTPError, URLError

# --- CONFIG ---
WAIT_BETWEEN = 2
TIMEOUT = 15
MAX_RETRIES_EXTRACTION = 3
MAX_RETRIES_FDM = 2
RETRY_BASE_DELAY_EXTRACTION = 2
RETRY_BASE_DELAY_FDM = 1
CONNECTIVITY_CHECK_TIMEOUT = 5
CONSECUTIVE_FAILURES_THRESHOLD = 3
CONNECTION_WAIT_TIMEOUT = 1000

# Log and config files (in script directory)
SCRIPT_DIR = Path(__file__).parent
COMPLETED_LOG = SCRIPT_DIR / "completed_downloads.log"
FAILED_LOG = SCRIPT_DIR / "failed_downloads.txt"
CONFIG_FILE = SCRIPT_DIR / "config.json"

# A browser User-Agent is the only thing the /f/<id>/go endpoint requires —
# verified live: no cookies, no Origin/Referer, no HX headers, no scraping
# library. A request without any User-Agent gets rejected with 403.
BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)

# Non-file routes on fuckingfast.co that look like single-segment paths
FUCKINGFAST_SITE_ROUTES = {
    "index", "speedtest", "help", "privacy", "terms", "contact", "login",
    "logout", "register", "account", "upload", "faq", "about", "api",
}

# --- Download manager registry (argv templates; "{path}"/"{url}" substituted) ---
# attached=True  -> run synchronously in the terminal (CLI download managers);
#                   progress and errors are visible, completion is tracked.
# attached=False -> launch detached (GUI download managers pick the URL up in
#                   their own queue; we optimistically count it as sent.
LAUNCHERS = {
    "fdm": {
        "display": "download manager",
        "args": ["{path}", "{url}"],
        "attached": False,
        "known_paths": [
            r"C:\Program Files\Softdeluxe\Free Download Manager\fdm.exe",
            r"C:\Program Files (x86)\Softdeluxe\Free Download Manager\fdm.exe",
            "/usr/bin/fdm",
            "/opt/fdm/fdm",
            "/Applications/Free Download Manager.app/Contents/MacOS/fdm",
        ],
    },
    "xdm-open": {
        "display": "download manager",
        "args": ["{path}", "{url}"],
        "attached": False,
        "known_paths": ["/usr/bin/xdm-open"],
    },
    "persepolis": {
        "display": "download manager",
        "args": ["{path}", "{url}"],
        "attached": False,
        "known_paths": ["/usr/bin/persepolis"],
    },
    "uget-gtk": {
        "display": "download manager",
        "args": ["{path}", "{url}"],
        "attached": False,
        "known_paths": ["/usr/bin/uget-gtk"],
    },
    "aria2c": {
        "display": "terminal download manager (aria2)",
        "args": ["{path}", "{url}"],
        "attached": True,
        "known_paths": [],
    },
    "wget": {
        "display": "terminal downloader (wget)",
        "args": ["{path}", "-c", "{url}"],
        "attached": True,
        "known_paths": [],
    },
    "curl": {
        "display": "terminal downloader (curl)",
        "args": ["{path}", "-L", "-O", "{url}"],
        "attached": True,
        "known_paths": [],
    },
}

_opener = build_opener()
install_opener(_opener)

# --- ANSI helpers (degrade gracefully when not a TTY) ---
_ANSI = sys.stdout.isatty() and os.environ.get("TERM", "") != "dumb"


def paint(text, code):
    return f"\x1b[{code}m{text}\x1b[0m" if _ANSI else text


def paint_ok(text):
    return paint(text, "32")


def paint_fail(text):
    return paint(text, "31")


def paint_warn(text):
    return paint(text, "33")


def paint_info(text):
    return paint(text, "36")


def paint_head(text):
    return paint(text, "1;95")


def check_internet_connection(timeout=CONNECTIVITY_CHECK_TIMEOUT):
    """Check internet connectivity by testing DNS servers."""
    dns_servers = [("8.8.8.8", 53), ("1.1.1.1", 53)]

    for server, port in dns_servers:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            sock.connect((server, port))
            sock.close()
            return True
        except (socket.timeout, socket.error):
            continue

    return False


def wait_for_connection(max_wait=CONNECTION_WAIT_TIMEOUT):
    """Wait for internet connection to be restored."""
    print()
    print(paint_warn("🔌  No internet connection detected!"))
    print(f"⏳  Waiting for connection (max {max_wait}s)... Press Ctrl+C to abort.")

    start_time = time.time()
    check_interval = 10

    while True:
        elapsed = int(time.time() - start_time)

        if elapsed >= max_wait:
            print(f"\n{paint_fail('❌  Connection timeout after {}s. Aborting.'.format(elapsed))}")
            return False

        try:
            if check_internet_connection(timeout=3):
                print(f"\n{paint_ok('✅  Connection restored after {}s!'.format(elapsed))}")
                return True

            remaining = max_wait - elapsed
            print(f"  ⏳  Still waiting... ({elapsed}s elapsed, {remaining}s remaining)")
            time.sleep(check_interval)

        except KeyboardInterrupt:
            print(f"\n{paint_warn('⚠️  User aborted connection wait.')}")
            return False


def retry_with_backoff(max_retries, base_delay, exceptions=(Exception,)):
    """Decorator to retry a function with exponential backoff."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as exc:
                    if attempt < max_retries:
                        delay = base_delay * (2 ** (attempt - 1))
                        print(f"  🔄  Retry {attempt}/{max_retries} after {delay}s: {type(exc).__name__}")
                        time.sleep(delay)
                    else:
                        print(f"  ❌  Failed after {max_retries} attempts: {exc}")
                        raise
            return None
        return wrapper
    return decorator


def load_completed_urls():
    """Load completed URLs from log file."""
    if not COMPLETED_LOG.exists():
        return set()

    completed = set()
    with open(COMPLETED_LOG, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line and " | " in line:
                # Format: timestamp | url
                parts = line.split(" | ", 1)
                if len(parts) == 2:
                    completed.add(parts[1])

    return completed


def save_completed_url(url):
    """Save a completed URL to log file with timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(COMPLETED_LOG, "a", encoding="utf-8") as handle:
        handle.write(f"{timestamp} | {url}\n")


def save_failed_url(url, error):
    """Save a failed URL to log file with timestamp and error."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(FAILED_LOG, "a", encoding="utf-8") as handle:
        handle.write(f"{timestamp} | {url} | {error}\n")


def parse_paste_file(filepath):
    with open(filepath, "r", encoding="utf-8") as handle:
        content = handle.read()
    urls = re.findall(r"- (https://fuckingfast\.co/[^\s#]+)", content)
    if not urls:
        urls = re.findall(r"(https://fuckingfast\.co/[^\s#]+)", content)
    print(f"✅ Parsed {len(urls)} URLs from {filepath}")
    return urls


def extract_file_id(page_url):
    """Derive the fuckingfast.co file id from a file link.

    Accepts links like https://fuckingfast.co/<id>#<filename> (the usual
    paste format). Rejects site pages (login, speedtest, ...) and anything
    with extra path segments or paths under dl.fuckingfast.co.
    """
    try:
        parts = urlsplit(page_url)
    except ValueError:
        return None

    host = (parts.hostname or "").lower()
    if host == "dl.fuckingfast.co" or (
        host != "fuckingfast.co" and not host.endswith(".fuckingfast.co")
    ):
        return None

    if parts.path.startswith("/dl/"):
        return None

    segments = [s for s in parts.path.split("/") if s]
    if len(segments) != 1:
        return None

    file_id = segments[0]
    if file_id.lower() in FUCKINGFAST_SITE_ROUTES or not re.fullmatch(r"[A-Za-z0-9_-]{6,}", file_id):
        return None

    return file_id


@retry_with_backoff(
    max_retries=MAX_RETRIES_EXTRACTION,
    base_delay=RETRY_BASE_DELAY_EXTRACTION,
    exceptions=(HTTPError, URLError, socket.error, TimeoutError)
)
def extract_real_download_url(page_url):
    """Resolve the direct download URL for a fuckingfast.co file link.

    The endpoint stores the direct download link in an HX-Redirect response
    header; no page fetch, no captcha, no scraping library — a browser
    User-Agent alone is enough.
    """
    file_id = extract_file_id(page_url)
    if not file_id:
        raise ValueError(f"Not a file link: {page_url}")

    page_only = urlunsplit(urlsplit(page_url))
    post_url = f"https://fuckingfast.co/f/{file_id}/go"

    request = Request(
        post_url,
        data=b"",
        method="POST",
        headers={
            "User-Agent": BROWSER_UA,
            "Accept": "*/*",
            "Content-Type": "application/x-www-form-urlencoded",
            "HX-Request": "true",
            "HX-Current-URL": page_only,
            "HX-Target": "body",
        }
    )

    try:
        resp = _opener.open(request, timeout=TIMEOUT)
    except HTTPError as exc:
        # The header can ride on non-2xx responses too
        redirect = (exc.headers.get("HX-Redirect") or exc.headers.get("Location") or "").strip()
        if redirect:
            return redirect
        raise

    with resp:
        redirect = (resp.headers.get("HX-Redirect") or resp.headers.get("Location") or "").strip()
        if redirect:
            return redirect

    return None


def make_launcher(key, path):
    spec = LAUNCHERS[key]
    return {
        "key": key,
        "display": spec["display"],
        "path": path,
        "args": spec["args"],
        "attached": spec["attached"],
    }


def load_config():
    try:
        data = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        if isinstance(data, dict) and isinstance(data.get("launcher"), dict):
            return data["launcher"]
    except (OSError, ValueError):
        pass
    return None


def save_config(launcher):
    try:
        CONFIG_FILE.write_text(
            json.dumps({"launcher": launcher}, indent=2),
            encoding="utf-8",
        )
    except OSError as exc:
        print(paint_warn(f"⚠️  Could not save config: {exc}"))


def detect_launcher_by_path(path):
    """Map an explicit path to a registry entry when the binary name matches."""
    name = Path(path).name.lower()
    if name.endswith(".exe"):
        name = name[:-4]
    if name == "xdm" and os.path.isfile(path):
        return make_launcher("xdm-open", path)
    for key in LAUNCHERS:
        if name == key:
            return make_launcher(key, path)
    return {
        "key": "custom",
        "display": f"custom download manager ({Path(path).name})",
        "path": path,
        "args": ["{path}", "{url}"],
        "attached": False,
    }


def auto_detect_launcher():
    """Search the registry for installed download managers (first hit wins)."""
    for key, spec in LAUNCHERS.items():
        for candidate in spec["known_paths"]:
            if os.path.isfile(candidate):
                return make_launcher(key, candidate)
        found = shutil.which(key)
        if found:
            return make_launcher(key, found)
    return None


def prompt_for_launcher():
    """Ask the user for a path interactively; Enter accepts the terminal fallback."""
    print(paint_info("👉  Paste the full path to your download manager executable,"))
    print(paint_info("    or press Enter to download straight into this terminal."))
    sys.stdout.write("> ")
    sys.stdout.flush()
    try:
        answer = input().strip().strip('"').strip("'")
    except (EOFError, KeyboardInterrupt):
        return None
    if not answer:
        key = "curl" if shutil.which("curl") else "wget"
        path = shutil.which(key)
        if not path:
            print(paint_warn("⚠️  No terminal downloader available on this system."))
            return None
        return make_launcher(key, path)
    if not os.path.isfile(answer):
        print(paint_fail(f"❌  Path not found: {answer}"))
        return None
    return detect_launcher_by_path(answer)


def resolve_launcher(user_path=None, remember=True):
    """Resolve a download manager: flag > env var > config > auto-detect > prompt."""
    if user_path:
        if not os.path.isfile(user_path):
            print(paint_fail(f"❌  --set-downloader path not found: {user_path}"))
            return None
        launcher = detect_launcher_by_path(os.path.abspath(user_path))
        if remember:
            save_config({"path": launcher["path"], "key": launcher["key"]})
        return launcher

    env_path = os.environ.get("FG_DOWNLOADER_PATH", "").strip()
    if env_path and os.path.isfile(env_path):
        return detect_launcher_by_path(os.path.abspath(env_path))

    stored = load_config()
    if stored and stored.get("path") and os.path.isfile(stored["path"]):
        stored_key = stored.get("key")
        stored_path = os.path.abspath(stored["path"])
        if stored_key == "custom" or stored_key not in LAUNCHERS:
            return detect_launcher_by_path(stored_path)
        return make_launcher(stored_key, stored_path)

    launcher = auto_detect_launcher()
    if launcher:
        return launcher

    if sys.stdin.isatty():
        launcher = prompt_for_launcher()
        if launcher and remember:
            save_config({"path": launcher["path"], "key": launcher["key"]})
        return launcher

    return None


def launcher_argv(launcher, url):
    argv = []
    for token in launcher["args"]:
        token = token.replace("{path}", launcher["path"]).replace("{url}", url)
        argv.append(token)
    return argv


def send_to_downloader(launcher, download_url, dry_run=False):
    """Hand a resolved URL to the chosen download manager.

    Returns True on success, False on failure. Detached launches are
    optimistic (the manager owns the download from here).
    """
    if dry_run:
        print(f"  🔗  {download_url}")
        print(paint_info("  ↑  Resolved link (dry-run: nothing was launched)"))
        return True

    argv = launcher_argv(launcher, download_url)
    if launcher["attached"]:
        print(f"  ⬇️   Downloading with {launcher['display']} ...")
        try:
            result = subprocess.run(argv)
        except (OSError, KeyboardInterrupt):
            print(f"  🛑  {launcher['display']} stopped.")
            raise
        if result.returncode == 0:
            print(paint_ok(f"  ✅  {launcher['display']} finished"))
            return True
        print(paint_fail(f"  ❌  {launcher['display']} exited with code {result.returncode}"))
        return False

    try:
        subprocess.Popen(argv, shell=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except OSError as exc:
        print(paint_fail(f"  ❌  Could not launch {launcher['display']}: {exc}"))
        return False
    print(f"  🚀  Sent to {launcher['display']}")
    return True


def find_paste_files():
    """Scan common directories for paste files (text files with links)."""
    candidates = {}
    for directory in [SCRIPT_DIR, Path.cwd(), Path.home() / "Downloads"]:
        try:
            for handle in sorted(directory.glob("*.txt")):
                try:
                    if handle.stat().st_size > 2_000_000:
                        continue
                    if "fuckingfast.co" in handle.read_text(encoding="utf-8", errors="ignore"):
                        candidates[str(handle.resolve())] = handle
                except OSError:
                    continue
        except OSError:
            continue
    return list(candidates.values())


def choose_paste_file():
    files = find_paste_files()
    if not files:
        print(paint_fail("❌  No paste files found (looked for *.txt with file links)."))
        return None
    print(paint_info("Found paste files:"))
    for index, handle in enumerate(files, 1):
        print(f"  [{index}] {handle}")
    sys.stdout.write("Choose a file [1]: ")
    sys.stdout.flush()
    try:
        answer = input().strip()
    except (EOFError, KeyboardInterrupt):
        return None
    index = int(answer) - 1 if answer.isdigit() and 1 <= int(answer) <= len(files) else 0
    return files[index]


def process_urls(urls, launcher, args, dry_run=False, resume=False):
    """Shared download loop used by both CLI and interactive modes."""
    completed_urls = set()
    if resume:
        completed_urls = load_completed_urls()
        if completed_urls:
            print(f"📋 Resume mode: {len(completed_urls)} URLs already completed")

    urls_to_process = [url for url in urls if url not in completed_urls]
    skipped_count = len(urls) - len(urls_to_process)

    if skipped_count > 0:
        print(f"⏭️ Skipping {skipped_count} already completed URLs")

    if not urls_to_process:
        print(paint_ok("✅ All URLs already completed!"))
        return

    if not launcher and not dry_run:
        print(paint_fail("❌ No download manager available. Use --list-paste/--set-downloader first."))
        sys.exit(1)

    mode = paint_info("dry-run (links only)") if dry_run else launcher["display"]
    print(f"\n📥 Starting ({mode}) for {len(urls_to_process)} files...\n")

    start_time = time.time()
    success = 0
    extraction_failures = 0
    send_failures = 0
    consecutive_failures = 0
    last_was_attached = False

    for index, base_url in enumerate(urls_to_process, 1):
        print(f"\n[{index}/{len(urls_to_process)}]")

        try:
            real_url = extract_real_download_url(base_url)

            if real_url:
                try:
                    ok = send_to_downloader(launcher, real_url, dry_run=dry_run)
                    if ok:
                        if not dry_run:
                            save_completed_url(base_url)
                        success += 1
                        consecutive_failures = 0
                    else:
                        if not dry_run:
                            save_failed_url(base_url, f"{launcher['display']} exited with an error")
                        send_failures += 1
                        consecutive_failures += 1
                except KeyboardInterrupt:
                    print(f"\n🛑 Operation aborted by user.")
                    break
                except Exception as exc:
                    print(f"  ❌ Send failed after retries: {exc}")
                    save_failed_url(base_url, f"Send error: {exc}")
                    send_failures += 1
                    consecutive_failures += 1
            else:
                print(paint_warn("  ⚠️ Skipped (no URL extracted)"))
                if not dry_run:
                    save_failed_url(base_url, "No direct URL resolved")
                extraction_failures += 1
                consecutive_failures += 1

        except Exception as exc:
            print(f"  ❌ Extraction failed after retries: {exc}")
            if not dry_run:
                save_failed_url(base_url, f"Extraction error: {exc}")
            extraction_failures += 1
            consecutive_failures += 1

        if consecutive_failures >= CONSECUTIVE_FAILURES_THRESHOLD:
            print(f"\n{paint_warn('⚠️  {} consecutive failures detected'.format(consecutive_failures))}")
            print("🔌 Re-checking internet connection...")
            if not check_internet_connection():
                if not wait_for_connection(args.connection_timeout):
                    print("\n❌ Connection lost. Aborting remaining downloads.")
                    break
            consecutive_failures = 0

        if index < len(urls_to_process) and not last_was_attached and not dry_run:
            if launcher and not launcher["attached"]:
                print(f"⏳ Waiting {WAIT_BETWEEN} sec...")
                time.sleep(WAIT_BETWEEN)

        last_was_attached = bool(launcher and launcher["attached"])

    elapsed_time = int(time.time() - start_time)

    print(f"\n{'=' * 50}")
    print(paint_head("📊  DOWNLOAD SUMMARY"))
    print(f"{'=' * 50}")
    status = "🔗 Links resolved" if dry_run else "🚀 Sent to downloader"
    print(f"{status}: {success}/{len(urls_to_process)}")
    if skipped_count > 0:
        print(f"⏭️ Skipped (already completed): {skipped_count}")
    if extraction_failures > 0:
        print(f"❌ Extraction failures: {extraction_failures}")
    if send_failures > 0:
        print(f"❌ Send failures: {send_failures}")
    print(f"⏱️  Total time: {elapsed_time}s")
    if extraction_failures + send_failures > 0:
        print(f"\n⚠️ Failed URLs logged to: {FAILED_LOG}")
        print("💡 Use --resume flag to retry or continue from where you left off")
    print(f"{'=' * 50}")


def print_banner(launcher):
    print(paint_head("\n🎮  FitGirl Downloader"))
    if launcher:
        status = "in-terminal" if launcher["attached"] else "launched (GUI)"
        print(paint_ok(f"✅ Downloader: {launcher['display']} — {launcher['path']} ({status})"))
    else:
        print(paint_warn("⚠️  Downloader: none — resolves links only (dry-run mode)."))
    print()


def main():
    parser = argparse.ArgumentParser(
        prog="fitgirl_downloader.py",
        description=(
            "Resolve direct download links for paste files and hand them to "
            "your download manager (auto-detected, or set with --downloader-path)."
        ),
        epilog="No third-party dependencies: Python 3 standard library only.",
    )
    parser.add_argument(
        "paste_file", nargs="?", default=None,
        help="Paste file with download links (optional; opens a menu if omitted)",
    )
    parser.add_argument(
        "--downloader-path", metavar="PATH",
        help="Path to your download manager executable (verifies + saves for next runs)",
    )
    parser.add_argument(
        "--set-downloader", dest="set_downloader", metavar="PATH",
        help="Persist the downloader path and run",
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Resolve and print direct links without launching anything")
    parser.add_argument("--list-paste", action="store_true",
                        help="List detected paste files and exit")
    parser.add_argument("--resume", action="store_true",
                        help="Skip URLs already completed in previous sessions")
    parser.add_argument("--clear-log", action="store_true",
                        help="Clear completed and failed logs before starting")
    parser.add_argument(
        "--connection-timeout", type=int, default=CONNECTION_WAIT_TIMEOUT,
        help=f"Max seconds to wait for connection recovery (default: {CONNECTION_WAIT_TIMEOUT})",
    )
    args = parser.parse_args()

    if args.clear_log:
        for path in (COMPLETED_LOG, FAILED_LOG):
            if path.exists():
                path.unlink()
                print(f"🗑️  Cleared {path.name}")

    if args.list_paste:
        files = find_paste_files()
        if not files:
            print("No paste files detected.")
            return
        print(paint_info("Detected paste files:"))
        for handle in files:
            print(f"  - {handle}")
        return

    # Resolve the launch command for the download manager before anything else
    wanted_path = args.set_downloader or args.downloader_path
    launcher = None
    if wanted_path:
        launcher = resolve_launcher(wanted_path)
        if launcher is None:
            sys.exit(1)
    elif not args.dry_run:
        launcher = resolve_launcher()
        if launcher:
            print_banner(launcher)

    # Internet gate
    print("🔌 Checking internet connection...")
    if not check_internet_connection():
        if not wait_for_connection(args.connection_timeout):
            print(paint_fail("❌ Cannot proceed without an internet connection."))
            sys.exit(1)
    else:
        print(paint_ok("✅ Internet connection OK"))

    # Standalone action: only register a downloader and exit
    if args.set_downloader and not args.paste_file:
        return

    paste_path = args.paste_file

    # Interactive session when no paste file was passed
    if paste_path is None:
        if not sys.stdin.isatty():
            parser.print_usage()
            print(paint_warn("\nℹ️  Pass a paste file or run interactively in a terminal."))
            return

        if launcher is None and not args.dry_run:
            launcher = resolve_launcher()
            if launcher:
                print_banner(launcher)
            else:
                print(paint_warn("⚠️  Running in dry-run-only mode until a downloader is set (--downloader-path)."))

        while True:
            print(paint_head("🎮  FitGirl Downloader — menu"))
            print("  [1] Download from a paste file")
            print("  [2] Set download manager path")
            print("  [3] Dry-run (print resolved links only)")
            print("  [4] Exit")
            sys.stdout.write("> ")
            sys.stdout.flush()
            try:
                choice = input().strip()
            except (EOFError, KeyboardInterrupt):
                print()
                return

            if choice == "1":
                if launcher is None and not args.dry_run:
                    print(paint_warn("⚠️  No download manager set. Use menu [2] first, or set --downloader-path."))
                    continue
                paste_path = choose_paste_file()
                if not paste_path:
                    continue
                process_urls(parse_paste_file(paste_path), launcher, args, dry_run=args.dry_run, resume=args.resume)
                paste_path = None
            elif choice == "2":
                old_path = launcher["path"] if launcher else None
                new_path = prompt_for_launcher()
                if new_path:
                    launcher = new_path
                    save_config({"path": launcher["path"], "key": launcher["key"]})
                    if old_path:
                        print(paint_ok("✅ Downloader updated and saved."))
                    else:
                        print(paint_ok("✅ Downloader set and saved."))
            elif choice == "3":
                paste_path = choose_paste_file()
                if not paste_path:
                    continue
                process_urls(parse_paste_file(paste_path), launcher, args, dry_run=True, resume=args.resume)
                paste_path = None
            elif choice == "4":
                return
            else:
                print(paint_warn("Please pick 1-4."))

    if not Path(paste_path).exists():
        print(paint_fail(f"❌ File not found: {paste_path}"))
        sys.exit(1)

    urls = parse_paste_file(paste_path)
    if not urls:
        print(paint_warn("⚠️ No URLs found!"))
        return

    if args.dry_run or launcher is None:
        process_urls(urls, launcher, args, dry_run=True, resume=args.resume)
        return

    process_urls(urls, launcher, args, dry_run=False, resume=args.resume)


if __name__ == "__main__":
    main()
