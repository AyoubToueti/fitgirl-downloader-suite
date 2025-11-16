const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration object for browser and extension settings
const config = {
  browsers: {
    brave: {
      name: 'Brave',
      executablePaths: [
        'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        'C:\\Users\\HP\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'
      ],
      userDataDir: 'C:\\Users\\HP\\AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data',
      profilePath: 'Default'
    },
    edge: {
      name: 'Edge',
      executablePaths: [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Users\\HP\\AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe'
      ],
      userDataDir: 'C:\\Users\\HP\\AppData\\Local\\Microsoft\\Edge\\User Data',
      profilePath: 'Default'
    },
    chrome: {
      name: 'Chrome',
      executablePaths: [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Users\\HP\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
      ],
      userDataDir: 'C:\\Users\\HP\\AppData\\Local\\Google\\Chrome\\User Data',
      profilePath: 'Default'
    }
  },
  extension: {
    id: 'ahmpjcflkgiildlgicmcieglgoilbfdp', // FDM extension ID
    name: 'FDM'
  },
  tempProfileDir: path.join(__dirname, 'temp_profile')
};

class BrowserManager {
  constructor(browserType = 'brave') {
    this.browserType = browserType;
    this.browserConfig = config.browsers[browserType];
    if (!this.browserConfig) {
      throw new Error(`Unsupported browser type: ${browserType}`);
    }
  }

  findExecutable() {
    for (const exePath of this.browserConfig.executablePaths) {
      if (fs.existsSync(exePath)) {
        return exePath;
      }
    }
    return null;
  }

  findExtensionPath() {
    const extensionBasePath = path.join(
      this.browserConfig.userDataDir,
      this.browserConfig.profilePath,
      'Extensions',
      config.extension.id
    );

    if (fs.existsSync(extensionBasePath)) {
      const versions = fs.readdirSync(extensionBasePath).filter(file => 
        fs.statSync(path.join(extensionBasePath, file)).isDirectory() && 
        /^\d+\.\d+\.\d+$/.test(file)
      );

      if (versions.length > 0) {
        versions.sort((a, b) => {
          const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
          const [bMajor, bMinor, bPatch] = b.split('.').map(Number);
          if (aMajor !== bMajor) return bMajor - aMajor;
          if (aMinor !== bMinor) return bMinor - aMinor;
          return bPatch - aPatch;
        });
        return path.join(extensionBasePath, versions[0]);
      }
    }
    return null;
  }

  async copyExtensionToTempProfile() {
    const extensionPath = this.findExtensionPath();
    if (!extensionPath) {
      console.log(`${config.extension.name} extension not found in ${this.browserConfig.name} profile`);
      return null;
    }

    const tempExtensionPath = path.join(
      config.tempProfileDir,
      this.browserConfig.profilePath,
      'Extensions',
      config.extension.id,
      path.basename(extensionPath)
    );

    try {
      fs.mkdirSync(path.dirname(tempExtensionPath), { recursive: true });
      const fse = require('fs-extra');
      fse.copySync(extensionPath, tempExtensionPath);
      console.log(`${config.extension.name} extension copied to temporary profile: ${tempExtensionPath}`);
      return tempExtensionPath;
    } catch (error) {
      console.log(`Failed to copy ${config.extension.name} extension to temporary profile:`, error.message);
      return null;
    }
  }

  async ensureExtensionInTempProfile() {
    const extensionPath = this.findExtensionPath();
    if (!extensionPath) {
      console.log(`${config.extension.name} extension not found in ${this.browserConfig.name} profile`);
      return null;
    }

    const tempExtensionDir = path.join(
      config.tempProfileDir,
      this.browserConfig.profilePath,
      'Extensions',
      config.extension.id
    );

    const existingVersions = fs.readdirSync(tempExtensionDir).filter(file => 
      fs.statSync(path.join(tempExtensionDir, file)).isDirectory() && 
      /^\d+\.\d+\.\d+$/.test(file)
    );

    if (existingVersions.length > 0) {
      existingVersions.sort((a, b) => {
        const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
        const [bMajor, bMinor, bPatch] = b.split('.').map(Number);
        if (aMajor !== bMajor) return bMajor - aMajor;
        if (aMinor !== bMinor) return bMinor - aMinor;
        return bPatch - aPatch;
      });
      return path.join(tempExtensionDir, existingVersions[0]);
    }

    return this.copyExtensionToTempProfile();
  }

  async launchBrowser(useTempProfile = false) {
    const executablePath = this.findExecutable();
    let extensionPath = null;
    let userDataDir = null;

    if (useTempProfile) {
      extensionPath = await this.ensureExtensionInTempProfile();
      userDataDir = config.tempProfileDir;
      console.log(`Using temporary profile for ${this.browserConfig.name}`);
    } else {
      extensionPath = this.findExtensionPath();
      userDataDir = this.browserConfig.userDataDir;
      console.log(`Using main profile for ${this.browserConfig.name}`);
    }

    const args = [
      '--disable-features=site-per-process',
      '--disable-web-security',
      '--allow-running-insecure-content',
      '--no-sandbox',
      '--disable-dev-shm-usage'
    ];

    if (extensionPath) {
      args.push(`--load-extension=${extensionPath}`);
      console.log(`${config.extension.name} extension loaded: ${extensionPath}`);
    }

    const launchOptions = {
      headless: false,
      defaultViewport: null,
      args
    };

    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }

    if (userDataDir) {
      launchOptions.userDataDir = userDataDir;
    }

    return puppeteer.launch(launchOptions);
  }
}

class DownloadManager {
  constructor(browserManager) {
    this.browserManager = browserManager;
  }

 async triggerDownloadMethods(page, url) {
    let downloadTriggered = false;

    // Method 1: Try to find and click download button
    try {
      downloadTriggered = await this.findAndClickDownloadButton(page, downloadTriggered);
    } catch (e) {
      console.log('Button click method failed, trying alternative methods...');
    }

    // Method 2: Direct URL navigation
    if (!downloadTriggered) {
      try {
        downloadTriggered = await this.triggerDownloadFromLinks(page, downloadTriggered);
      } catch (e) {
        console.log('Direct URL method failed:', e.message);
      }
    }

    // Method 3: FDM-specific injection
    if (!downloadTriggered) {
      try {
        await this.injectDownloadScripts(page);
      } catch (e) {
        console.log('FDM-specific injection failed:', e.message);
      }
    }

    // Method 4: Force download using download attribute
    try {
      await this.initiateForceDownload(page);
    } catch (e) {
      console.log('Force download method failed:', e.message);
    }
  }

  async initiateForceDownload(page) {
    await page.evaluate(() => {
      const pageContent = document.body.innerText;
      const urlRegex = /(https?:\/\/[^\s'"]*\.rar|https?:\/\/[^\s'"]*\.zip|https?:\/\/[^\s'"]*download[^\s'"]*)/gi;
      let match;
      while ((match = urlRegex.exec(pageContent)) !== null) {
        const downloadUrl = match[1];
        if (downloadUrl.includes('fuckingfast.co')) {
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.setAttribute('download', '');
          link.style.display = 'none';
          document.body.appendChild(link);

          link.click();

          setTimeout(() => {
            document.body.removeChild(link);
          }, 1000);
          break;
        }
      }
    });
  }

  async injectDownloadScripts(page) {
    console.log('try FDM-specific injection');
    await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      scripts.forEach(script => {
        if (script.textContent.includes('download') && script.textContent.includes('http')) {
          const urlRegex = /(https?:\/\/[^\s'"]*\.rar|https?:\/\/[^\s'"]*download[^\s'"]*)/gi;
          let match;
          while ((match = urlRegex.exec(script.textContent)) !== null) {
            const downloadUrl = match[1];
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.style.display = 'none';
            document.body.appendChild(link);

            const event = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true
            });
            link.dispatchEvent(event);

            setTimeout(() => {
              document.body.removeChild(link);
            }, 2000);
          }
        }
      });

      if (window && typeof window.eval === 'function') {
        const downloadScripts = Array.from(document.querySelectorAll('script'))
          .filter(script => script.textContent.includes('download') || script.textContent.includes('DLPath'));

        downloadScripts.forEach(script => {
          try {
            eval(script.textContent);
          } catch (e) {
            console.log('Script evaluation failed:', e.message);
          }
        });
      }
    });
  }

  async triggerDownloadFromLinks(page, downloadTriggered) {
    console.log('try direct URL navigation');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/dl/"], a[href*="download"]'));
      links.forEach(link => {
        if (link.href && link.href.includes('fuckingfast.co')) {
          const tempLink = document.createElement('a');
          tempLink.href = link.href;
          tempLink.target = '_blank';
          tempLink.style.display = 'none';
          document.body.appendChild(tempLink);

          const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            ctrlKey: true
          });
          tempLink.dispatchEvent(clickEvent);

          setTimeout(() => {
            document.body.removeChild(tempLink);
          }, 1000);
        }
      });

      if (typeof window.startDownload === 'function') {
        window.startDownload();
      } else if (typeof window.download === 'function') {
        window.download();
      }
    });
    downloadTriggered = true;
    return downloadTriggered;
  }

  async findAndClickDownloadButton(page, downloadTriggered) {
    console.log('try to Try to find and click download button');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const downloadBtn = buttons.find(btn => btn.textContent.includes('DOWNLOAD') ||
        btn.className.includes('download') ||
        btn.className.includes('gay-button')
      );
      if (downloadBtn) {
        const event = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
          button: 0
        });
        downloadBtn.dispatchEvent(event);
        return true;
      }
      return false;
    });
    downloadTriggered = true;
    return downloadTriggered;
  }

  async downloadFiles(urls) {
    let browser = null;
    const WaitingTimeBetweenDownloads =  process.env.WAITING_TIME_BETWEEN_DOWNLOADS || 3000; 
    let useTempProfile = false;

    try {
      // Try to launch with main profile first
      try {
        browser = await this.browserManager.launchBrowser(false);
      } catch (error) {
        console.log(`Main profile error: ${error.message}, using temporary profile...`);
        useTempProfile = true;
        browser = await this.browserManager.launchBrowser(true);
      }
    } catch (error) {
      console.log(`Failed to launch ${this.browserManager.browserConfig.name} browser:`, error.message);
      return { successful: 0, failed: urls.length };
    }

    const page = await browser.newPage();
    const downloadsDir = path.join(require('os').homedir(), 'Downloads');
    console.log(`Monitoring downloads directory: ${downloadsDir}`);

    let completedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const filename = this.extractFilename(url);

      try {
        console.log(`\n[${i + 1}/${urls.length}] Downloading: ${filename}`);

        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        await this.triggerDownloadMethods(page, url);

        completedCount++;
        console.log(`✅ Completed: ${filename}`);
      } catch (error) {
        failedCount++;
        console.log(`❌ Failed: ${filename} - ${error.message}`);
      }

      if (i < urls.length - 1) {
        console.log(`Waiting ${WaitingTimeBetweenDownloads / 1000} seconds before next download...`);
        await new Promise(resolve => setTimeout(resolve, WaitingTimeBetweenDownloads));
      }
    }

    console.log('\nKeeping browser open to allow downloads to complete...');
    // Wait until downloads in the Downloads folder have finished (no temp files and sizes stable)
    await (async () => {
      const inProgressExts = ['.crdownload', '.part', '.tmp', '.aria2', '.download', '.opdownload'];
      const checkInterval = 2000; // ms between checks
      const stableTime = 10000; // ms of no size change required to consider downloads finished
      const timeout = parseInt(process.env.DOWNLOAD_WAIT_TIMEOUT || '600000', 10); // default 10 minutes

      const getFilesInfo = (dir) => {
      try {
        return fs.readdirSync(dir)
        .map(name => {
          const full = path.join(dir, name);
          try {
          const st = fs.statSync(full);
          if (st.isFile()) return { name, full, size: st.size, mtimeMs: st.mtimeMs };
          } catch (e) { /* ignore nonexistent */ }
          return null;
        })
        .filter(Boolean);
      } catch (e) {
        return [];
      }
      };

      const now = () => new Date().getTime();
      const start = now();
      let lastChange = now();
      let prevSizes = new Map();

      console.log('Waiting for downloads to complete...');

      while (true) {
      if (now() - start > timeout) {
        console.log('Timeout reached while waiting for downloads. Proceeding to close browser.');
        break;
      }

      const files = getFilesInfo(downloadsDir);
      // detect any in-progress temporary download files
      const hasTemp = files.some(f => inProgressExts.some(ext => f.name.endsWith(ext)));

      // build current sizes map
      const currSizes = new Map(files.map(f => [f.name, f.size]));
      // compare sizes to previous
      let changed = false;
      for (const [name, size] of currSizes) {
        if (!prevSizes.has(name) || prevSizes.get(name) !== size) {
        changed = true;
        break;
        }
      }
      // also consider removed files as change
      if (!changed && prevSizes.size !== currSizes.size) changed = true;

      if (hasTemp) {
        lastChange = now();
        // update prevSizes
        prevSizes = currSizes;
        console.log('Detected temporary download file(s), waiting...');
      } else if (changed) {
        lastChange = now();
        prevSizes = currSizes;
        console.log('Download activity detected (file sizes changing), waiting...');
      } else {
        // no temp files and sizes haven't changed
        if (now() - lastChange >= stableTime) {
        console.log('No download activity detected and files are stable. Downloads appear complete.');
        break;
        } else {
        const remaining = Math.ceil((stableTime - (now() - lastChange)) / 1000);
        console.log(`Files stable, waiting ${remaining}s more to ensure completion...`);
        }
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    })();

    await browser.close();

    return { successful: completedCount, failed: failedCount };
  }

  extractFilename(url) {
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      return url.substring(hashIndex + 1);
    }
    return `download_${Date.now()}.rar`;
  }
}

// Parse the paste file to extract URLs
function parsePasteFile(pasteFilePath) {
  const filePath = path.join(__dirname, pasteFilePath);
  const content = fs.readFileSync(filePath, 'utf8');
  
  const urlPattern = /(?:\[([^\]]+)\]\(([^)]+\))|- (https:\/\/fuckingfast\.co\/[^\s#\)]+))/g;
  const urls = [];
  
  let match;
  while ((match = urlPattern.exec(content)) !== null) {
    let url = null;
    
    if (match[1] && match[2]) {
      url = match[2];
    } else if (match[3]) {
      url = match[3];
    }
    
    if (url && typeof url === 'string' && url.startsWith('https://fuckingfast.co')) {
      urls.push(url.trim());
    }
  }
  
  console.log(`Parsed ${urls.length} URLs from paste file`);
  urls.forEach((url, i) => console.log(`${i + 1}: ${url}`));
  
  return urls;
}

// Main function
async function main() {
  const urls = parsePasteFile("paste-bc03dda029e41067.txt");
  console.log(`Found ${urls.length} download links`);
  
 if (urls.length === 0) {
    console.log('No download links found!');
    return;
  }

  // Configure which browser to use
  const browserType = process.env.BROWSER_TYPE || 'edge'; // Can be 'brave', 'edge', or 'chrome'
  
  try {
    const browserManager = new BrowserManager(browserType);
    const downloadManager = new DownloadManager(browserManager);
    
    const results = await downloadManager.downloadFiles(urls);
    
    console.log(`\n🎉 Download session completed!`);
    console.log(`✅ Successful: ${results.successful}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📁 Check your Downloads folder for files`);
  } catch (error) {
    console.error('Download failed:', error);
    process.exit(1);
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

process.on('SIGINT', async () => {
  console.log('\nDownload interrupted by user');
  process.exit(0);
});

// Start the downloader
if (require.main === module) {
  main().catch(error => {
    console.error('Download failed:', error);
    process.exit(1);
  });
}

module.exports = { main, parsePasteFile, BrowserManager, DownloadManager };
