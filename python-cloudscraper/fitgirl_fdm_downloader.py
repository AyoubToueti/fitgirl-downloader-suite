import os
import re
import sys
import time
import socket
import argparse
from pathlib import Path
from datetime import datetime
from functools import wraps
import cloudscraper
from requests.exceptions import Timeout, ConnectionError, HTTPError

# --- CONFIG ---
FDM_PATH = r"C:\Program Files\Softdeluxe\Free Download Manager\fdm.exe"
WAIT_BETWEEN = 2
TIMEOUT = 15

# Retry Configuration
MAX_RETRIES_EXTRACTION = 3
MAX_RETRIES_FDM = 2
RETRY_BASE_DELAY_EXTRACTION = 2
RETRY_BASE_DELAY_FDM = 1

# Connection Configuration
CONNECTIVITY_CHECK_TIMEOUT = 5
CONSECUTIVE_FAILURES_THRESHOLD = 3
CONNECTION_WAIT_TIMEOUT = 1000

# Log Files (in script directory)
SCRIPT_DIR = Path(__file__).parent
COMPLETED_LOG = SCRIPT_DIR / "completed_downloads.log"
FAILED_LOG = SCRIPT_DIR / "failed_downloads.txt"

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
    print("\n🔌 No internet connection detected!")
    print(f"⏳ Waiting for connection (max {max_wait}s)... Press Ctrl+C to abort.")
    
    start_time = time.time()
    check_interval = 10
    
    while True:
        elapsed = int(time.time() - start_time)
        
        if elapsed >= max_wait:
            print(f"\n❌ Connection timeout after {elapsed}s. Aborting.")
            return False
        
        try:
            if check_internet_connection(timeout=3):
                print(f"\n✅ Connection restored after {elapsed}s!")
                return True
            
            remaining = max_wait - elapsed
            print(f"  ⏳ Still waiting... ({elapsed}s elapsed, {remaining}s remaining)")
            time.sleep(check_interval)
            
        except KeyboardInterrupt:
            print("\n\n⚠️ User aborted connection wait.")
            return False

def retry_with_backoff(max_retries, base_delay, exceptions=(Exception,)):
    """Decorator to retry a function with exponential backoff."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, max_retries + 1):
                try:
                    result = func(*args, **kwargs)
                    return result
                except exceptions as e:
                    if attempt < max_retries:
                        delay = base_delay * (2 ** (attempt - 1))
                        print(f"  🔄 Retry {attempt}/{max_retries} after {delay}s: {type(e).__name__}")
                        time.sleep(delay)
                    else:
                        print(f"  ❌ Failed after {max_retries} attempts: {e}")
                        raise
            return None
        return wrapper
    return decorator

def load_completed_urls():
    """Load completed URLs from log file."""
    if not COMPLETED_LOG.exists():
        return set()
    
    completed = set()
    with open(COMPLETED_LOG, "r", encoding="utf-8") as f:
        for line in f:
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
    with open(COMPLETED_LOG, "a", encoding="utf-8") as f:
        f.write(f"{timestamp} | {url}\n")

def save_failed_url(url, error):
    """Save a failed URL to log file with timestamp and error."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(FAILED_LOG, "a", encoding="utf-8") as f:
        f.write(f"{timestamp} | {url} | {error}\n")

def parse_paste_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    urls = re.findall(r"- (https://fuckingfast\.co/[^\s#]+)", content)
    print(f"✅ Parsed {len(urls)} URLs from {filepath}")
    return urls

@retry_with_backoff(
    max_retries=MAX_RETRIES_EXTRACTION,
    base_delay=RETRY_BASE_DELAY_EXTRACTION,
    exceptions=(Timeout, ConnectionError, HTTPError, socket.error)
)
def extract_real_download_url(page_url):
    print(f"🔍 Fetching: {page_url}")
    scraper = cloudscraper.create_scraper()
    resp = scraper.get(page_url, timeout=TIMEOUT)
    resp.raise_for_status()

    match = re.search(r'window\.open\(["\']([^"\']+/dl/[^"\']+)["\']', resp.text)
    if match:
        real_url = match.group(1)
        print(f"  ✅ Extracted URL")
        return real_url
    else:
        print("  ❌ No /dl/ URL found")
        return None

@retry_with_backoff(
    max_retries=MAX_RETRIES_FDM,
    base_delay=RETRY_BASE_DELAY_FDM,
    exceptions=(OSError, PermissionError)
)
def send_to_fdm(download_url):
    import subprocess
    subprocess.Popen([FDM_PATH, download_url], shell=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("  🚀 Sent to FDM")
    return True

def main():
    parser = argparse.ArgumentParser(description="FitGirl Downloader — sends fuckingfast.co links to FDM")
    parser.add_argument("paste_file", help="Path to paste file (e.g., paste-bc03dda029e41067.txt)")
    parser.add_argument("--resume", action="store_true", help="Resume from last session (skip completed URLs)")
    parser.add_argument("--clear-log", action="store_true", help="Clear completed and failed logs before starting")
    parser.add_argument("--connection-timeout", type=int, default=CONNECTION_WAIT_TIMEOUT,
                        help=f"Max seconds to wait for connection (default: {CONNECTION_WAIT_TIMEOUT})")
    args = parser.parse_args()

    # Handle --clear-log flag
    if args.clear_log:
        if COMPLETED_LOG.exists():
            COMPLETED_LOG.unlink()
            print("🗑️ Cleared completed log")
        if FAILED_LOG.exists():
            FAILED_LOG.unlink()
            print("🗑️ Cleared failed log")
    
    # Check initial internet connection
    print("🔌 Checking internet connection...")
    if not check_internet_connection():
        if not wait_for_connection(args.connection_timeout):
            print("❌ Cannot proceed without internet connection.")
            sys.exit(1)
    else:
        print("✅ Internet connection OK")
    
    if not Path(args.paste_file).exists():
        print(f"❌ File not found: {args.paste_file}")
        sys.exit(1)

    if not Path(FDM_PATH).exists():
        print(f"❌ FDM not found at: {FDM_PATH}")
        print("👉 Update FDM_PATH in the script if needed.")
        sys.exit(1)

    urls = parse_paste_file(args.paste_file)
    if not urls:
        print("⚠️ No URLs found!")
        return
    
    # Load completed URLs for resume
    completed_urls = set()
    if args.resume:
        completed_urls = load_completed_urls()
        if completed_urls:
            print(f"📋 Resume mode: {len(completed_urls)} URLs already completed")

    # Filter out completed URLs
    urls_to_process = [url for url in urls if url not in completed_urls]
    skipped_count = len(urls) - len(urls_to_process)
    
    if skipped_count > 0:
        print(f"⏭️ Skipping {skipped_count} already completed URLs")
    
    if not urls_to_process:
        print("✅ All URLs already completed!")
        return

    print(f"\n📥 Starting download of {len(urls_to_process)} files...\n")
    
    # Statistics tracking
    start_time = time.time()
    success = 0
    extraction_failures = 0
    fdm_failures = 0
    consecutive_failures = 0

    for i, base_url in enumerate(urls_to_process, 1):
        print(f"\n[{i}/{len(urls_to_process)}]")
        
        try:
            real_url = extract_real_download_url(base_url)
            
            if real_url:
                try:
                    send_to_fdm(real_url)
                    save_completed_url(base_url)
                    success += 1
                    consecutive_failures = 0  # Reset on success
                except Exception as e:
                    print(f"  ❌ FDM send failed after retries: {e}")
                    save_failed_url(base_url, f"FDM error: {e}")
                    fdm_failures += 1
                    consecutive_failures += 1
            else:
                print("  ⚠️ Skipped (no URL extracted)")
                save_failed_url(base_url, "No /dl/ URL found in page")
                extraction_failures += 1
                consecutive_failures += 1
                
        except Exception as e:
            print(f"  ❌ Extraction failed after retries: {e}")
            save_failed_url(base_url, f"Extraction error: {e}")
            extraction_failures += 1
            consecutive_failures += 1
        
        # Check connection after consecutive failures
        if consecutive_failures >= CONSECUTIVE_FAILURES_THRESHOLD:
            print(f"\n⚠️ {consecutive_failures} consecutive failures detected")
            print("🔌 Re-checking internet connection...")
            if not check_internet_connection():
                if not wait_for_connection(args.connection_timeout):
                    print("\n❌ Connection lost. Aborting remaining downloads.")
                    break
            consecutive_failures = 0  # Reset after connection check

        if i < len(urls_to_process):
            print(f"⏳ Waiting {WAIT_BETWEEN} sec...")
            time.sleep(WAIT_BETWEEN)

    # Final statistics
    elapsed_time = int(time.time() - start_time)
    total_processed = success + extraction_failures + fdm_failures
    
    print(f"\n{'='*50}")
    print(f"📊 DOWNLOAD SUMMARY")
    print(f"{'='*50}")
    print(f"✅ Successfully sent to FDM: {success}/{len(urls_to_process)}")
    if skipped_count > 0:
        print(f"⏭️ Skipped (already completed): {skipped_count}")
    if extraction_failures > 0:
        print(f"❌ Extraction failures: {extraction_failures}")
    if fdm_failures > 0:
        print(f"❌ FDM send failures: {fdm_failures}")
    print(f"⏱️ Total time: {elapsed_time}s")
    
    if extraction_failures + fdm_failures > 0:
        print(f"\n⚠️ Failed URLs logged to: {FAILED_LOG}")
        print(f"💡 Use --resume flag to retry or continue from where you left off")
    
    print(f"{'='*50}")

if __name__ == "__main__":
    main()