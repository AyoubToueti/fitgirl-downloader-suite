require('dotenv').config();

// Configuration object for browser and extension settings
const config = {
  browsers: {
    brave: {
      name: 'Brave',
      executablePaths: [
        process.env.BROWSER_PATH || 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        'C:\\Users\\HP\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'
      ],
      userDataDir: process.env.USER_DATA_DIR || 'C:\\Users\\HP\\AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data',
      profilePath: 'Default'
    },
    edge: {
      name: 'Edge',
      executablePaths: [
        process.env.BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Users\\HP\\AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe'
      ],
      userDataDir: process.env.USER_DATA_DIR || 'C:\\Users\\HP\\AppData\\Local\\Microsoft\\Edge\\User Data',
      profilePath: 'Default'
    },
    chrome: {
      name: 'Chrome',
      executablePaths: [
        process.env.BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Users\\HP\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
      ],
      userDataDir: process.env.USER_DATA_DIR || 'C:\\Users\\HP\\AppData\\Local\\Google\\Chrome\\User Data',
      profilePath: 'Default'
    }
  },
  extension: {
    id: process.env.EXTENSION_ID || 'ahmpjcflkgiildlgicmcieglgoilbfdp', // FDM extension ID
    name: process.env.EXTENSION_NAME || 'FDM'
  },
  tempProfileDir: require('path').join(__dirname, process.env.TEMP_PROFILE_DIR || 'temp_profile'),
  downloadSettings: {
    waitingTimeBetweenDownloads: parseInt(process.env.WAITING_TIME_BETWEEN_DOWNLOADS || '3000'),
    downloadWaitTimeout: parseInt(process.env.DOWNLOAD_WAIT_TIMEOUT || '60000'),
    pageLoadTimeout: parseInt(process.env.PAGE_LOAD_TIMEOUT || '30000'),
    initialWaitTime: parseInt(process.env.INITIAL_WAIT_TIME || '200')
  },
  fdm: {
    path: process.env.FDM_PATH || 'C:\\Program Files\\Softdeluxe\\Free Download Manager\\fdm.exe'
  }
};

module.exports = config;
