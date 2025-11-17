const puppeteer = require('puppeteer');
const { exec } = require('child_process');
const path = require('path');

// Test script to verify direct FDM launching with URLs
async function testDirectFDM() {
    console.log('Testing direct FDM launch with extracted URLs...');
    
    try {
        // Launch browser to extract URLs (without extensions)
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: [
                '--disable-features=site-per-process',
                '--disable-web-security',
                '--allow-running-insecure-content',
                '--no-sandbox',
                '--disable-dev-shm-usage'
            ]
        });

        const page = await browser.newPage();
        
        // Navigate to a test page
        await page.goto('https://fuckingfast.co/5jaujd0c3qef', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('Page loaded, extracting download URLs...');
        
        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Method 1: Extract URLs from the download button and JavaScript
        const downloadInfo = await page.evaluate(() => {
            const info = {
                directUrls: [],
                buttonUrls: [],
                extractedUrls: []
            };
            
            // Look for direct download links
            const directLinks = Array.from(document.querySelectorAll('a[href*="/dl/"], a[href*="download"]'));
            info.directUrls = directLinks.map(link => link.href).filter(href => href && href.includes('fuckingfast.co'));
            
            // Look for download button
            const downloadBtn = document.querySelector('button.gay-button');
            if (downloadBtn) {
                // Try to find the download function in page scripts
                const scripts = Array.from(document.scripts);
                for (const script of scripts) {
                    const content = script.textContent;
                    // Look for window.open calls with download URLs
                    const matches = content.match(/window\.open\(["']([^"']+)["']/g);
                    if (matches) {
                        for (const match of matches) {
                            const urlMatch = match.match(/window\.open\(["']([^"']+)["']/);
                            if (urlMatch && urlMatch[1]) {
                                info.extractedUrls.push(urlMatch[1]);
                            }
                        }
                    }
                }
            }
            
            // Look for any URLs in the page content
            const pageText = document.body.innerText;
            const urlRegex = /(https?:\/\/[^\s'"]*\.rar|https?:\/\/[^\s'"]*\.zip|https?:\/\/[^\s'"]*download[^\s'"]*)/gi;
            let match;
            while ((match = urlRegex.exec(pageText)) !== null) {
                if (match[1] && match[1].includes('fuckingfast.co')) {
                    info.extractedUrls.push(match[1]);
                }
            }
            
            return info;
        });

        console.log('Extracted URLs:', downloadInfo);
        
        // Close browser after extracting URLs
        await browser.close();
        
        // Now launch FDM directly with the extracted URLs
        const fdmPath = 'C:\\Program Files\\Softdeluxe\\Free Download Manager\\fdm.exe'; // Default FDM installation path
        
        // Check if FDM exists
        const fs = require('fs');
        if (!fs.existsSync(fdmPath)) {
            console.log('FDM not found at default path, trying common locations...');
            const possiblePaths = [
                'C:\\Program Files\\Free Download Manager\\fdm.exe',
                'C:\\Program Files (x86)\\Free Download Manager\\fdm.exe',
                'C:\\Users\\HP\\AppData\\Local\\Free Download Manager\\fdm.exe'
            ];
            
            let foundFDM = false;
            for (const testPath of possiblePaths) {
                if (fs.existsSync(testPath)) {
                    fdmPath = testPath;
                    foundFDM = true;
                    console.log('Found FDM at:', fdmPath);
                    break;
                }
            }
            
            if (!foundFDM) {
                console.log('FDM executable not found. Please install FDM or specify the correct path.');
                return;
            }
        }
        
        // Combine all extracted URLs
        const allUrls = [...new Set([...downloadInfo.directUrls, ...downloadInfo.extractedUrls])];
        
        if (allUrls.length > 0) {
            console.log('Attempting to launch FDM with URLs:', allUrls);
            
            // Method 1: Launch FDM with URLs as command line arguments
            for (const url of allUrls) {
                const cmd = `"${fdmPath}" "${url}"`;
                console.log('Executing:', cmd);
                
                exec(cmd, (error, stdout, stderr) => {
                    if (error) {
                        console.log(`Error launching FDM with URL ${url}:`, error.message);
                        return;
                    }
                    console.log(`FDM launched successfully for URL: ${url}`);
                    if (stdout) console.log('stdout:', stdout);
                    if (stderr) console.log('stderr:', stderr);
                });
                
                // Wait a bit between launching FDM for different URLs
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } else {
            console.log('No URLs found to pass to FDM');
        }
        
        console.log('Direct FDM test completed.');
        
    } catch (error) {
        console.error('Error in direct FDM test:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Alternative method: Function to launch FDM with a single URL
function launchFDMWithUrl(url) {
    return new Promise((resolve, reject) => {
        const fdmPath = 'C:\\Program Files\\Free Download Manager\\fdm.exe';
        
        const fs = require('fs');
        if (!fs.existsSync(fdmPath)) {
            reject('FDM executable not found');
            return;
        }
        
        const cmd = `"${fdmPath}" "${url}"`;
        console.log('Launching FDM with command:', cmd);
        
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.log('Error launching FDM:', error.message);
                reject(error);
                return;
            }
            console.log('FDM launched successfully for URL:', url);
            resolve({ stdout, stderr });
        });
    });
}

// Run the test
testDirectFDM().catch(console.error);

module.exports = { launchFDMWithUrl };
