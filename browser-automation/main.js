// browser-automation/main.js
const config = require('./config');
const BrowserManager = require('./BrowserManager');
const DownloadManager = require('./DownloadManager');
const { parsePasteFile } = require('./url-parser');
const path = require('path');

// Graceful error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});
process.on('SIGINT', () => {
  console.log('\n🛑 Interrupted by user');
  process.exit(0);
});

async function main() {
  // Accept paste file as first CLI argument
  const pasteFile = process.argv[2];
  if (!pasteFile) {
    console.error('❌ Usage: node main.js <paste-file.txt>');
    process.exit(1);
  }

  const fileDir = path.dirname(path.resolve(pasteFile));
  const filename = path.basename(pasteFile);

  console.log(`📄 Parsing: ${pasteFile}`);
  const urls = parsePasteFile(fileDir, filename);
  if (urls.length === 0) {
    console.error('❌ No valid URLs found in paste file');
    process.exit(1);
  }
  console.log(`✅ Found ${urls.length} links`);

  const browserType = process.env.BROWSER_TYPE || 'edge';

  try {
    const browserManager = new BrowserManager(browserType);
    const downloadManager = new DownloadManager(browserManager);
    const results = await downloadManager.downloadFiles(urls);

    console.log(`\n🎉 Session complete!`);
    console.log(`✅ Successful: ${results.successful}`);
    console.log(`❌ Failed: ${results.failed}`);
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}