// BrowserManager.js
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const config = require('./config');

class BrowserManager {
  constructor(browserType = 'edge') {
    if (!config.browsers[browserType]) {
      throw new Error(`Unsupported browser type: ${browserType}`);
    }
    this.browserConfig = config.browsers[browserType];
    this.tempProfileDir = null; // will hold path if temp profile is used
  }

  async launchBrowser(useTempProfile = false) {
    const options = {
      headless: false,
      defaultViewport: null,
      args: ['--start-minimized'],
    };

    let executablePath = null;
    for (const candidate of this.browserConfig.executablePaths) {
      if (fs.existsSync(candidate)) {
        executablePath = candidate;
        break;
      }
    }

    if (!executablePath) {
      throw new Error(`No valid executable found for ${this.browserConfig.name}`);
    }

    options.executablePath = executablePath;

    if (!useTempProfile) {
      const userDataDir = path.join(this.browserConfig.userDataDir, this.browserConfig.profilePath);
      if (!fs.existsSync(userDataDir)) {
        throw new Error(`User data directory not found: ${userDataDir}`);
      }
      options.userDataDir = userDataDir;
      this.tempProfileDir = null;
    } else {
      // Use and remember temp dir
      this.tempProfileDir = config.tempProfileDir;
      if (fs.existsSync(this.tempProfileDir)) {
        fs.rmSync(this.tempProfileDir, { recursive: true, force: true });
      }
      fs.mkdirSync(this.tempProfileDir, { recursive: true });
      options.userDataDir = this.tempProfileDir;
    }

    console.log(`Launching ${this.browserConfig.name} ${useTempProfile ? '(temp profile)' : '(main profile)'}`);
    return await puppeteer.launch(options);
  }

  cleanupTempProfile() {
    if (this.tempProfileDir && fs.existsSync(this.tempProfileDir)) {
      try {
        fs.rmSync(this.tempProfileDir, { recursive: true, force: true });
        console.log(`🧹 Temp profile cleaned: ${this.tempProfileDir}`);
      } catch (err) {
        console.warn(`⚠️ Failed to clean temp profile: ${err.message}`);
      }
    }
  }
}

module.exports = BrowserManager;