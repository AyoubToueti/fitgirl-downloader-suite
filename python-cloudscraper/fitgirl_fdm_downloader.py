import os
import re
import sys
import time
import argparse
from pathlib import Path
import cloudscraper

# --- CONFIG ---
FDM_PATH = r"C:\Program Files\Softdeluxe\Free Download Manager\fdm.exe"
WAIT_BETWEEN = 2
TIMEOUT = 15

def parse_paste_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    urls = re.findall(r"- (https://fuckingfast\.co/[^\s#]+)", content)
    print(f"✅ Parsed {len(urls)} URLs from {filepath}")
    return urls

def extract_real_download_url(page_url):
    try:
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
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return None

def send_to_fdm(download_url):
    import subprocess
    try:
        subprocess.Popen([FDM_PATH, download_url], shell=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("  🚀 Sent to FDM")
        return True
    except Exception as e:
        print(f"  ❌ FDM launch failed: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="FitGirl Downloader — sends fuckingfast.co links to FDM")
    parser.add_argument("paste_file", help="Path to paste file (e.g., paste-bc03dda029e41067.txt)")
    args = parser.parse_args()

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

    print(f"\n📥 Starting download of {len(urls)} files...\n")
    success = 0

    for i, base_url in enumerate(urls, 1):
        print(f"\n[{i}/{len(urls)}]")
        real_url = extract_real_download_url(base_url)
        if real_url and send_to_fdm(real_url):
            success += 1
        else:
            print("  ⚠️ Skipped")

        if i < len(urls):
            print(f"⏳ Waiting {WAIT_BETWEEN} sec...")
            time.sleep(WAIT_BETWEEN)

    print(f"\n🎉 Done! {success}/{len(urls)} sent to FDM.")

if __name__ == "__main__":
    main()