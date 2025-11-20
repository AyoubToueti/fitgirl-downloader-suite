# Quick Installation Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Load Extension in Chrome/Edge

1. **Open Extension Management**
   - Chrome: Navigate to `chrome://extensions/`
   - Edge: Navigate to `edge://extensions/`

2. **Enable Developer Mode**
   - Toggle the switch in the top-right corner

3. **Load Unpacked Extension**
   - Click "Load unpacked" button
   - Navigate to and select the `browser-extension` folder
   - Click "Select Folder"

4. **Verify Installation**
   - Extension card appears with "FitGirl FDM Downloader"
   - Purple icon appears in browser toolbar
   - Status shows "Enabled"

### Step 2: Test the Extension

1. **Visit a Test Page**
   - Go to https://fitgirl-repacks.site/
   - Open any game page (e.g., recent repacks)
   - Scroll to the download links section

2. **Look for the UI**
   - Purple download interface should appear automatically
   - May take 1-3 seconds to initialize
   - If not visible, refresh the page (F5)

3. **Test Basic Features**
   - Check/uncheck file selection boxes
   - Click "Select All" / "Deselect All"
   - Try skipping a file (should turn gray)
   - Click "🚀 Start Download" to begin

4. **Check Popup**
   - Click extension icon in toolbar
   - View statistics dashboard
   - Verify all sections are visible

## 🐛 Common Issues

### Issue: "Manifest file is missing or unreadable"
**Solution**: Make sure you're selecting the `browser-extension` folder itself, not a parent folder

### Issue: "Icons missing" warning
**Solution**: Add the required icon files to `icons/` folder (see Step 1)

### Issue: Extension loads but UI doesn't appear
**Solution**: 
1. Refresh the FitGirl page (F5)
2. Check browser console (F12) for errors
3. Verify you're on a page with download links

### Issue: Downloads don't start
**Solution**: 
1. Check browser download settings
2. Allow automatic downloads for the extension
3. Set FDM as default download manager (if using FDM)

### Issue: "Service worker inactive"
**Solution**: Normal behavior - it will restart automatically when needed

## 🔧 Next Steps

Once installed and tested:

1. **Configure Settings** (optional)
   - Edit `shared/config.js` for timing adjustments
   - Edit `content/styles.css` for color customization

2. **Set FDM as Default** (for FDM integration)
   - FDM Settings → Browser Integration
   - Enable browser monitoring
   - Set as default for `.rar`, `.zip`, etc.

3. **Pin Extension** (convenience)
   - Click puzzle icon in Chrome toolbar
   - Click pin 📌 next to FitGirl Downloader

4. **Read Full Documentation**
   - See `README.md` for complete feature guide
   - Learn about pause/resume, retry system, etc.

## 📞 Need Help?

- Check console logs: Right-click page → Inspect → Console
- Background script logs: `chrome://extensions/` → Details → Inspect service worker
- Popup logs: Right-click extension icon → Inspect popup
- **Issues**: [GitHub Issues](https://github.com/AyoubToueti/fitgirl-game-downloader/issues)
- **Discussions**: [GitHub Discussions](https://github.com/AyoubToueti/fitgirl-game-downloader/discussions)

## 🎉 Ready to Use!

You're all set! Navigate to any FitGirl Repacks game page and enjoy automated downloading with pause/resume, file selection, and retry capabilities.
