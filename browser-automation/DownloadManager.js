// DownloadManager.js
const path = require('path');
const config = require('./config');

class DownloadManager {
    constructor(browserManager) {
        this.browserManager = browserManager;
    }

    /**
     * Simulates a user clicking the gay-button to trigger download()
     * @param {import('puppeteer').Page} page
     * @returns {Promise<void>}
     */
    async clickDownloadButton(page) {
        await page.evaluate(() => {
            // Find the button with class 'gay-button' (as seen in page.txt)
            const button = document.querySelector('button.gay-button');
            if (button) {
                // Create and dispatch a trusted click event
                const event = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                button.dispatchEvent(event);
            }
        });
        console.log('🖱️ Download button clicked');
    }

    /**
     * Main download loop — only uses button click
     * @param {string[]} urls
     * @returns {Promise<{ successful: number, failed: number }>}
     */
    async downloadFiles(urls) {
        const { waitingTimeBetweenDownloads, pageLoadTimeout, initialWaitTime } = config.downloadSettings;
        let browser = null;

        try {
            // Launch browser (main or temp profile)
            try {
                browser = await this.browserManager.launchBrowser(false);
            } catch (err) {
                console.warn(`Main profile failed (${err.message}), using temp profile...`);
                browser = await this.browserManager.launchBrowser(true);
            }

            const page = await browser.newPage();
            console.log(`📁 Downloads will appear in your browser's default folder (likely intercepted by FDM)`);

            let successful = 0;
            let failed = 0;

            for (let i = 0; i < urls.length; i++) {
                const url = urls[i];
                const filename = this.extractFilename(url);

                try {
                    console.log(`\n[${i + 1}/${urls.length}] Processing: ${filename}`);
                    await page.goto(url, { waitUntil: 'networkidle2', timeout: pageLoadTimeout });
                    await new Promise(r => setTimeout(r, initialWaitTime));

                    await this.clickDownloadButton(page);
                    successful++;
                    console.log(`✅ Triggered via button click: ${filename}`);
                } catch (error) {
                    failed++;
                    console.error(`❌ Failed on ${filename}:`, error.message);
                }

                if (i < urls.length - 1) {
                    console.log(`⏳ Waiting ${waitingTimeBetweenDownloads / 1000} sec before next...`);
                    await new Promise(r => setTimeout(r, waitingTimeBetweenDownloads));
                }
            }

            console.log('\n📥 All download triggers completed. Keeping browser open for active transfers...');
            return { successful, failed };

        } catch (err) {
            console.error('💥 Critical error:', err.message);
            return { successful: 0, failed: urls.length };
        }
    }

    extractFilename(url) {
        const hashIndex = url.indexOf('#');
        return hashIndex !== -1
            ? url.substring(hashIndex + 1)
            : `download_${Date.now()}.rar`;
    }
}

module.exports = DownloadManager;