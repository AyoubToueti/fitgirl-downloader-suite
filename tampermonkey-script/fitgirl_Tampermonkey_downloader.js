// ==UserScript==
// @name         FitGirl FDM Downloader
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Automatically detect and download FitGirl fuckingfast.co links
// @author       Your Name
// @match        https://fitgirl-repacks.site/*
// @match        https://*.fitgirl-repacks.site/*
// @match        http://fitgirl-repacks.site/*
// @match        http://*.fitgirl-repacks.site/*
// @match        https://fuckingfast.co/*
// @match        https://*.fuckingfast.co/*
// @match        http://fuckingfast.co/*
// @match        http://*.fuckingfast.co/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @grant        GM_openInTab
// @grant        GM_log
// @connect      fuckingfast.co
// @connect      fitgirl-repacks.site
// @run-at       document-start
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        WAIT_BETWEEN: 2000,
        MAX_RETRIES_EXTRACTION: 3,
        MAX_RETRIES_FDM: 2,
        RETRY_BASE_DELAY_EXTRACTION: 2000,
        RETRY_BASE_DELAY_FDM: 1000,
        CONSECUTIVE_FAILURES_THRESHOLD: 3
    };

    // Storage keys
    const COMPLETED_URLS_KEY = 'completed_urls';
    const FAILED_URLS_KEY = 'failed_urls';

    class FitGirlDownloader {
        constructor() {
            this.completedUrls = new Set(JSON.parse(GM_getValue(COMPLETED_URLS_KEY, '[]')));
            this.failedUrls = new Set(JSON.parse(GM_getValue(FAILED_URLS_KEY, '[]')));
            this.isProcessing = false;
            this.currentPage = window.location.href;
            this.initialized = false;
            
            GM_log('FitGirl Downloader: Script loaded for ' + this.currentPage);
            this.init();
        }

        async init() {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.start());
            } else {
                this.start();
            }
        }

        start() {
            GM_log('FitGirl Downloader: Starting initialization');
            
            // Try multiple times in case page loads slowly
            this.tryInitialize();
            
            // Also set up observer for dynamic content
            this.setupMutationObserver();
        }

        tryInitialize(attempt = 1) {
            GM_log(`FitGirl Downloader: Initialization attempt ${attempt}`);
            
            if (this.isFitGirlPage()) {
                if (this.processFitGirlPage()) {
                    this.initialized = true;
                    GM_log('FitGirl Downloader: Successfully initialized on FitGirl page');
                } else if (attempt < 5) {
                    // Retry after delay
                    setTimeout(() => this.tryInitialize(attempt + 1), 1000 * attempt);
                }
            } else if (this.isFuckingFastPage()) {
                this.processFuckingFastPage();
                this.initialized = true;
                GM_log('FitGirl Downloader: Successfully initialized on fuckingfast page');
            }
            
            if (!this.initialized && attempt === 1) {
                this.createControlPanel();
            }
        }

        setupMutationObserver() {
            const observer = new MutationObserver((mutations) => {
                if (!this.initialized) {
                    this.tryInitialize();
                }
                
                // Check for new download links being added dynamically
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            if (node.querySelector && (
                                node.querySelector('a[href*="fuckingfast.co"]') ||
                                node.textContent.includes('Download links') ||
                                node.id === 'plaintext'
                            )) {
                                GM_log('FitGirl Downloader: New download content detected');
                                this.tryInitialize();
                            }
                        }
                    });
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        isFitGirlPage() {
            return window.location.hostname.includes('fitgirl-repacks.site');
        }

        isFuckingFastPage() {
            return window.location.hostname.includes('fuckingfast.co');
        }

        processFitGirlPage() {
            const downloadSection = this.findDownloadSection();
            
            if (downloadSection) {
                GM_log('FitGirl Downloader: Found download section, adding button');
                this.addBulkDownloadButton(downloadSection);
                return true;
            }
            
            return false;
        }

        findDownloadSection() {
            // Method 1: Look for specific ID
            let section = document.getElementById('plaintext');
            if (section) {
                GM_log('FitGirl Downloader: Found #plaintext section');
                return section;
            }

            // Method 2: Look for download links heading
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            for (const heading of headings) {
                if (heading.textContent.toLowerCase().includes('download link')) {
                    GM_log('FitGirl Downloader: Found download links heading');
                    // Find the nearest list container
                    let container = heading.parentElement;
                    for (let i = 0; i < 3; i++) {
                        const lists = container.querySelectorAll('ul, ol');
                        if (lists.length > 0) {
                            return container;
                        }
                        container = container.parentElement;
                        if (!container) break;
                    }
                    return heading.parentElement;
                }
            }

            // Method 3: Look for fuckingfast.co links anywhere
            const links = document.querySelectorAll('a[href*="fuckingfast.co"]');
            if (links.length > 0) {
                GM_log(`FitGirl Downloader: Found ${links.length} fuckingfast.co links`);
                return links[0].closest('div, section, article') || document.body;
            }

            GM_log('FitGirl Downloader: No download section found yet');
            return null;
        }

        addBulkDownloadButton(container) {
            // Remove existing button if any
            const existingBtn = container.querySelector('.fg-bulk-download-btn');
            if (existingBtn) {
                existingBtn.remove();
            }

            const button = document.createElement('button');
            button.innerHTML = '🚀 Download All Parts via FDM';
            button.className = 'fg-bulk-download-btn';
            button.style.cssText = `
                display: block;
                margin: 15px 0;
                padding: 12px 24px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                transition: all 0.3s ease;
            `;

            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-2px)';
                button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
            });

            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translateY(0)';
                button.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            });

            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.startBulkDownload();
            });

            // Insert at the top of the container
            container.insertBefore(button, container.firstChild);
            
            GM_log('FitGirl Downloader: Bulk download button added');
        }

        getAllDownloadLinks() {
            const links = [];
            const linkElements = document.querySelectorAll('a[href*="fuckingfast.co"]');
            
            for (const element of linkElements) {
                const url = element.href;
                if (url && !url.includes('optional')) { // Skip optional files
                    links.push({
                        url: url,
                        element: element,
                        text: element.textContent.trim()
                    });
                }
            }
            
            GM_log(`FitGirl Downloader: Found ${links.length} download links`);
            return links;
        }

        async startBulkDownload() {
            if (this.isProcessing) {
                this.showNotification('⚠️ Busy', 'Download process already running');
                return;
            }

            const links = this.getAllDownloadLinks();
            
            if (links.length === 0) {
                this.showNotification('❌ No Links', 'No download links found on this page');
                return;
            }

            this.isProcessing = true;
            this.updateStatus(`📥 Starting download of ${links.length} files...`);

            let success = 0;
            let failures = 0;
            let consecutiveFailures = 0;

            for (let i = 0; i < links.length; i++) {
                const link = links[i];
                this.updateStatus(`[${i + 1}/${links.length}] Processing: ${this.getFilenameFromUrl(link.url)}`);

                this.highlightLink(link.element, 'processing');

                try {
                    let downloadUrl = link.url;
                    
                    // If it's not a direct download link, extract it
                    if (!downloadUrl.includes('/dl/')) {
                        downloadUrl = await this.extractRealDownloadUrl(link.url);
                    }
                    
                    if (downloadUrl) {
                        await this.sendToFDM(downloadUrl);
                        this.highlightLink(link.element, 'success');
                        success++;
                        consecutiveFailures = 0;
                    } else {
                        this.highlightLink(link.element, 'failed');
                        failures++;
                        consecutiveFailures++;
                    }
                } catch (error) {
                    GM_log(`FitGirl Downloader: Failed to process ${link.url}: ${error}`);
                    this.highlightLink(link.element, 'failed');
                    this.logFailure(link.url, error.message);
                    failures++;
                    consecutiveFailures++;
                }

                if (consecutiveFailures >= CONFIG.CONSECUTIVE_FAILURES_THRESHOLD) {
                    this.showNotification('⚠️ Warning', 'Multiple consecutive failures detected. Pausing...');
                    const shouldContinue = confirm(`Multiple failures detected. Continue with remaining ${links.length - i - 1} files?`);
                    if (!shouldContinue) break;
                    consecutiveFailures = 0;
                }

                if (i < links.length - 1) {
                    await this.delay(CONFIG.WAIT_BETWEEN);
                }
            }

            this.updateStatus(`✅ Complete: ${success} successful, ${failures} failed`);
            this.showNotification('📊 Download Complete', `Processed ${links.length} files: ${success} successful, ${failures} failed`);
            this.isProcessing = false;
        }

        highlightLink(element, status) {
            const colors = {
                processing: '#ffeb3b',
                success: '#4caf50',
                failed: '#f44336'
            };
            
            element.style.transition = 'background-color 0.3s ease';
            element.style.backgroundColor = colors[status] || 'transparent';
            
            let icon = element.querySelector('.fg-status-icon');
            if (!icon) {
                icon = document.createElement('span');
                icon.className = 'fg-status-icon';
                icon.style.marginLeft = '8px';
                element.appendChild(icon);
            }
            
            const icons = {
                processing: '⏳',
                success: '✅',
                failed: '❌'
            };
            
            icon.textContent = icons[status] || '';
        }

        getFilenameFromUrl(url) {
            const match = url.match(/([^\/#]+)(?=#|$)/);
            return match ? match[1] : 'unknown';
        }

        processFuckingFastPage() {
            GM_log('FitGirl Downloader: Processing fuckingfast.co page');
            
            if (this.currentPage.includes('/dl/')) {
                this.addDirectDownloadButton();
            } else {
                this.addExtractButton();
            }
        }

        addDirectDownloadButton() {
            const button = document.createElement('button');
            button.innerHTML = '🚀 Send to FDM';
            button.style.cssText = `
                position: fixed;
                top: 50%;
                right: 20px;
                background: #e67e22;
                color: white;
                border: none;
                padding: 15px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                font-weight: bold;
                z-index: 9999;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;

            button.addEventListener('click', () => {
                this.sendToFDM(window.location.href);
            });

            document.body.appendChild(button);
            GM_log('FitGirl Downloader: Direct download button added');
        }

        addExtractButton() {
            const button = document.createElement('button');
            button.innerHTML = '🔍 Extract Download Link';
            button.style.cssText = `
                position: fixed;
                top: 50%;
                right: 20px;
                background: #3498db;
                color: white;
                border: none;
                padding: 15px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                font-weight: bold;
                z-index: 9999;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;

            button.addEventListener('click', () => {
                this.extractAndDownload(window.location.href);
            });

            document.body.appendChild(button);
            GM_log('FitGirl Downloader: Extract button added');
        }

        async extractRealDownloadUrl(pageUrl) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: pageUrl,
                    timeout: 15000,
                    onload: (response) => {
                        if (response.status === 200) {
                            const match = response.responseText.match(/window\.open\(["']([^"']+\/dl\/[^"']+)["']/);
                            if (match) {
                                resolve(match[1]);
                            } else {
                                reject(new Error('No /dl/ URL found in page'));
                            }
                        } else {
                            reject(new Error(`HTTP ${response.status}`));
                        }
                    },
                    onerror: (error) => reject(error),
                    ontimeout: () => reject(new Error('Timeout'))
                });
            });
        }

        async sendToFDM(downloadUrl) {
            try {
                GM_download({
                    url: downloadUrl,
                    name: this.generateFilename(downloadUrl),
                    onload: () => {
                        this.logSuccess(downloadUrl);
                        this.showNotification('✅ Sent to FDM', 'Download started successfully');
                    },
                    onerror: (error) => {
                        this.fallbackToFDM(downloadUrl);
                    }
                });
            } catch (error) {
                this.fallbackToFDM(downloadUrl);
            }
        }

        fallbackToFDM(downloadUrl) {
            navigator.clipboard.writeText(downloadUrl).then(() => {
                this.showNotification('📋 URL Copied', 'Download URL copied to clipboard. Paste it in FDM.');
                this.logSuccess(downloadUrl);
            }).catch(() => {
                GM_openInTab(downloadUrl, { active: false });
                this.showNotification('🌐 Opened in Tab', 'Download page opened in new tab for FDM to catch.');
                this.logSuccess(downloadUrl);
            });
        }

        async extractAndDownload(pageUrl) {
            if (this.completedUrls.has(pageUrl)) {
                this.showNotification('⏭️ Skipped', 'URL already processed');
                return;
            }

            this.updateStatus('🔍 Extracting download link...');

            try {
                const realUrl = await this.retryWithBackoff(
                    () => this.extractRealDownloadUrl(pageUrl),
                    CONFIG.MAX_RETRIES_EXTRACTION,
                    CONFIG.RETRY_BASE_DELAY_EXTRACTION
                );

                if (realUrl) {
                    this.updateStatus('🚀 Sending to FDM...');
                    await this.retryWithBackoff(
                        () => this.sendToFDM(realUrl),
                        CONFIG.MAX_RETRIES_FDM,
                        CONFIG.RETRY_BASE_DELAY_FDM
                    );
                }
            } catch (error) {
                this.logFailure(pageUrl, error.message);
                this.updateStatus('❌ Extraction failed');
                this.showNotification('❌ Failed', `Extraction failed: ${error.message}`);
            }
        }

        createControlPanel() {
            const panel = document.createElement('div');
            panel.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: #2c3e50;
                color: white;
                padding: 15px;
                border-radius: 8px;
                z-index: 10000;
                font-family: Arial, sans-serif;
                font-size: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                min-width: 250px;
                max-width: 300px;
            `;

            panel.innerHTML = `
                <div style="margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid #34495e; padding-bottom: 5px;">
                    🎮 FitGirl Downloader
                </div>
                <div style="margin-bottom: 8px;">
                    <strong>Completed:</strong> <span id="fg-completed-count">${this.completedUrls.size}</span>
                </div>
                <div style="margin-bottom: 8px;">
                    <strong>Failed:</strong> <span id="fg-failed-count">${this.failedUrls.size}</span>
                </div>
                <div style="margin-bottom: 10px;">
                    <button id="fg-clear-logs" style="width: 100%; padding: 5px; background: #e74c3c; color: white; border: none; border-radius: 3px; cursor: pointer; margin-bottom: 5px;">🗑️ Clear Logs</button>
                </div>
                <div id="fg-status" style="font-size: 11px; color: #bdc3c7; margin-top: 5px; word-break: break-word;">Ready</div>
            `;

            document.body.appendChild(panel);

            document.getElementById('fg-clear-logs').addEventListener('click', () => this.clearLogs());
            GM_log('FitGirl Downloader: Control panel created');
        }

        generateFilename(url) {
            const timestamp = new Date().getTime();
            const match = url.match(/([^\/#]+)(?=#|$)/);
            const name = match ? match[1] : 'download';
            return `fitgirl_${name}_${timestamp}.file`;
        }

        async retryWithBackoff(operation, maxRetries, baseDelay) {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    return await operation();
                } catch (error) {
                    if (attempt < maxRetries) {
                        const delay = baseDelay * Math.pow(2, attempt - 1);
                        this.updateStatus(`🔄 Retry ${attempt}/${maxRetries} after ${delay}ms`);
                        await this.delay(delay);
                    } else {
                        throw error;
                    }
                }
            }
        }

        logSuccess(url) {
            this.completedUrls.add(url);
            this.saveCompletedUrls();
            this.updateCounters();
        }

        logFailure(url, error) {
            this.failedUrls.add(`${url}|${error}`);
            this.saveFailedUrls();
            this.updateCounters();
        }

        saveCompletedUrls() {
            GM_setValue(COMPLETED_URLS_KEY, JSON.stringify(Array.from(this.completedUrls)));
        }

        saveFailedUrls() {
            GM_setValue(FAILED_URLS_KEY, JSON.stringify(Array.from(this.failedUrls)));
        }

        clearLogs() {
            this.completedUrls.clear();
            this.failedUrls.clear();
            GM_setValue(COMPLETED_URLS_KEY, '[]');
            GM_setValue(FAILED_URLS_KEY, '[]');
            this.updateCounters();
            this.updateStatus('🗑️ Logs cleared');
            this.showNotification('🗑️ Cleared', 'All logs have been cleared');
        }

        updateCounters() {
            const completedEl = document.getElementById('fg-completed-count');
            const failedEl = document.getElementById('fg-failed-count');
            if (completedEl) completedEl.textContent = this.completedUrls.size;
            if (failedEl) failedEl.textContent = this.failedUrls.size;
        }

        updateStatus(message) {
            const statusEl = document.getElementById('fg-status');
            if (statusEl) {
                statusEl.textContent = message;
            }
        }

        showNotification(title, message) {
            GM_notification({
                title: title,
                text: message,
                timeout: 4000,
                silent: false
            });
        }

        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    // Handle URL changes for single-page apps
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            GM_log('FitGirl Downloader: URL changed to ' + url);
            setTimeout(() => new FitGirlDownloader(), 1000);
        }
    }).observe(document, { subtree: true, childList: true });

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new FitGirlDownloader();
        });
    } else {
        new FitGirlDownloader();
    }

})();