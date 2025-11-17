const fs = require('fs');
const path = require('path');

// Parse the paste file to extract URLs
function parsePasteFile(fileDir = __dirname, pasteFile = "paste.txt") {
  const filePath = path.join(fileDir, pasteFile);
  const content = fs.readFileSync(filePath, 'utf8');
  const urlRegex = /-\s+(https:\/\/fuckingfast\.co\/[^\s#]+)/g;
  const urls = [];
  let match;
  while ((match = urlRegex.exec(content)) !== null) {
    urls.push(match[1]); // Only the base URL (without #filename)
  }
  console.log(`Parsed ${urls.length} URLs from paste file`);
  urls.forEach((url, i) => console.log(`${i + 1}: ${url}`));
  return urls;
}

module.exports = { parsePasteFile };
