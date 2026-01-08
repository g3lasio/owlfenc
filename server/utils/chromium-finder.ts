import { execSync } from 'child_process';

/**
 * Find Chromium executable path dynamically
 * Works in Replit and other environments
 */
export function findChromiumPath(): string | undefined {
  try {
    // Try environment variables first
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      return process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    
    if (process.env.CHROME_BIN) {
      return process.env.CHROME_BIN;
    }
    
    // Try to find chromium using 'which' command
    try {
      const chromiumPath = execSync('which chromium', { encoding: 'utf-8' }).trim();
      if (chromiumPath) {
        console.log('✅ [CHROMIUM-FINDER] Found chromium at:', chromiumPath);
        return chromiumPath;
      }
    } catch (e) {
      // chromium not found, try chromium-browser
    }
    
    try {
      const chromiumBrowserPath = execSync('which chromium-browser', { encoding: 'utf-8' }).trim();
      if (chromiumBrowserPath) {
        console.log('✅ [CHROMIUM-FINDER] Found chromium-browser at:', chromiumBrowserPath);
        return chromiumBrowserPath;
      }
    } catch (e) {
      // chromium-browser not found
    }
    
    // Try common paths
    const commonPaths = [
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      '/snap/bin/chromium'
    ];
    
    for (const path of commonPaths) {
      try {
        execSync(`test -f ${path}`, { encoding: 'utf-8' });
        console.log('✅ [CHROMIUM-FINDER] Found chromium at:', path);
        return path;
      } catch (e) {
        // Path doesn't exist
      }
    }
    
    console.log('⚠️ [CHROMIUM-FINDER] Chromium not found, letting Puppeteer auto-detect');
    return undefined;
    
  } catch (error) {
    console.error('❌ [CHROMIUM-FINDER] Error finding Chromium:', error);
    return undefined;
  }
}
