import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

let cachedPath: string | null = null;

export function getChromiumExecutablePath(): string {
  if (cachedPath && fs.existsSync(cachedPath)) {
    return cachedPath;
  }

  const candidatePaths: string[] = [];

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    candidatePaths.push(process.env.PUPPETEER_EXECUTABLE_PATH);
  }
  if (process.env.CHROME_BIN) {
    candidatePaths.push(process.env.CHROME_BIN);
  }

  try {
    const puppeteerCacheDirs = [
      '/home/runner/.cache/puppeteer/chrome',
      path.join(process.env.HOME || '/home/runner', '.cache/puppeteer/chrome'),
    ];

    for (const cacheDir of puppeteerCacheDirs) {
      if (fs.existsSync(cacheDir)) {
        const versions = fs.readdirSync(cacheDir).filter(d => d.startsWith('linux-'));
        for (const version of versions.sort().reverse()) {
          const chromePath = path.join(cacheDir, version, 'chrome-linux64', 'chrome');
          if (fs.existsSync(chromePath)) {
            candidatePaths.push(chromePath);
          }
          const chromePathAlt = path.join(cacheDir, version, 'chrome-linux', 'chrome');
          if (fs.existsSync(chromePathAlt)) {
            candidatePaths.push(chromePathAlt);
          }
        }
      }
    }
  } catch (e) {
    console.log('[CHROMIUM] Error scanning puppeteer cache:', e);
  }

  candidatePaths.push(
    '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  );

  for (const p of candidatePaths) {
    if (p && fs.existsSync(p)) {
      try {
        fs.accessSync(p, fs.constants.X_OK);
        console.log(`✅ [CHROMIUM] Found executable at: ${p}`);
        cachedPath = p;
        return p;
      } catch {
        console.log(`⚠️ [CHROMIUM] Path exists but not executable: ${p}`);
      }
    }
  }

  try {
    const whichResult = execSync('which chromium chromium-browser google-chrome 2>/dev/null | head -1', { 
      encoding: 'utf8',
      timeout: 5000 
    }).trim();
    if (whichResult && fs.existsSync(whichResult)) {
      console.log(`✅ [CHROMIUM] Found via which: ${whichResult}`);
      cachedPath = whichResult;
      return whichResult;
    }
  } catch {
  }

  try {
    const nixSearch = execSync(
      'ls -1d /nix/store/*/bin/chromium 2>/dev/null | head -1',
      { encoding: 'utf8', timeout: 10000 }
    ).trim();
    if (nixSearch && fs.existsSync(nixSearch)) {
      console.log(`✅ [CHROMIUM] Found in nix store: ${nixSearch}`);
      cachedPath = nixSearch;
      return nixSearch;
    }
  } catch {
  }

  console.error('❌ [CHROMIUM] No Chromium executable found in any location');
  console.error('❌ [CHROMIUM] Searched paths:', candidatePaths);
  throw new Error('Chromium executable not found. Please ensure Chromium is installed.');
}

export function clearChromiumCache(): void {
  cachedPath = null;
}

export function getChromiumInfo(): { path: string | null; method: string } {
  try {
    const chromePath = getChromiumExecutablePath();
    return { path: chromePath, method: 'detected' };
  } catch {
    return { path: null, method: 'not_found' };
  }
}
