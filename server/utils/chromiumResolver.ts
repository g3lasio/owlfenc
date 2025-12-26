import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';

let cachedPath: string | null = null;
let detectionAttempted = false;
let usingSparticuz = false;

// Static fallback paths (avoid hardcoding Nix hashes - they differ between dev/prod)
const KNOWN_PATHS = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser', 
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/opt/google/chrome/chrome',
  '/snap/bin/chromium',
];

/**
 * Priority 1: Use `which chromium` - works reliably in both dev and production
 * This is the most reliable method on Replit as it resolves Nix symlinks correctly
 */
function findViaWhich(): string | null {
  try {
    // Try chromium first (most common on Replit/Nix)
    const result = execSync(
      'which chromium 2>/dev/null || which chromium-browser 2>/dev/null || which google-chrome 2>/dev/null',
      { encoding: 'utf8', timeout: 5000 }
    ).trim().split('\n')[0];
    if (result && fs.existsSync(result)) {
      console.log(`✅ [CHROMIUM] Found via which: ${result}`);
      return result;
    }
  } catch {}
  return null;
}

/**
 * Priority 2: Search Nix store dynamically (handles different hashes between dev/prod)
 */
function findInNixStore(): string | null {
  try {
    const result = execSync(
      'ls -1d /nix/store/*/bin/chromium 2>/dev/null | head -1',
      { encoding: 'utf8', timeout: 5000 }
    ).trim();
    if (result && fs.existsSync(result)) {
      console.log(`✅ [CHROMIUM] Found in Nix store: ${result}`);
      return result;
    }
  } catch {}
  return null;
}

/**
 * Priority 3: Check Puppeteer cache
 */
function findInPuppeteerCache(): string | null {
  const homeDirs = [
    process.env.HOME,
    '/home/runner',
    '/root',
  ].filter(Boolean) as string[];

  for (const home of homeDirs) {
    const cacheDir = path.join(home, '.cache/puppeteer/chrome');
    if (!fs.existsSync(cacheDir)) continue;

    try {
      const versions = fs.readdirSync(cacheDir)
        .filter(d => d.startsWith('linux-'))
        .sort()
        .reverse();

      for (const version of versions) {
        const paths = [
          path.join(cacheDir, version, 'chrome-linux64', 'chrome'),
          path.join(cacheDir, version, 'chrome-linux', 'chrome'),
        ];
        for (const p of paths) {
          if (fs.existsSync(p)) {
            try {
              fs.accessSync(p, fs.constants.X_OK);
              console.log(`✅ [CHROMIUM] Found in Puppeteer cache: ${p}`);
              return p;
            } catch {}
          }
        }
      }
    } catch {}
  }
  return null;
}

export function getChromiumExecutablePath(): string | undefined {
  // Return cached path if still valid
  if (cachedPath && fs.existsSync(cachedPath)) {
    return cachedPath;
  }

  // Only attempt detection once per process lifetime
  if (detectionAttempted && !cachedPath) {
    return undefined;
  }

  detectionAttempted = true;
  console.log('🔍 [CHROMIUM] Starting executable detection...');

  // Priority 0: Environment variables (explicit configuration)
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    cachedPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    console.log(`✅ [CHROMIUM] Using env PUPPETEER_EXECUTABLE_PATH: ${cachedPath}`);
    return cachedPath;
  }

  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    cachedPath = process.env.CHROME_BIN;
    console.log(`✅ [CHROMIUM] Using env CHROME_BIN: ${cachedPath}`);
    return cachedPath;
  }

  // Priority 1: `which chromium` - MOST RELIABLE for Replit (works in both dev and production)
  // This resolves Nix symlinks correctly regardless of the Nix store hash
  const whichPath = findViaWhich();
  if (whichPath) {
    cachedPath = whichPath;
    return cachedPath;
  }

  // Priority 2: Dynamic Nix store search (handles different hashes)
  const nixPath = findInNixStore();
  if (nixPath) {
    cachedPath = nixPath;
    return cachedPath;
  }

  // Priority 3: Puppeteer cache (if installed)
  const puppeteerPath = findInPuppeteerCache();
  if (puppeteerPath) {
    cachedPath = puppeteerPath;
    return cachedPath;
  }

  // Priority 4: Known static paths (unlikely on Replit but fallback)
  for (const p of KNOWN_PATHS) {
    if (fs.existsSync(p)) {
      try {
        fs.accessSync(p, fs.constants.X_OK);
        cachedPath = p;
        console.log(`✅ [CHROMIUM] Found at known path: ${cachedPath}`);
        return cachedPath;
      } catch {}
    }
  }

  console.log('⚠️ [CHROMIUM] No executable found - PDF generation may fail');
  return undefined;
}

export async function launchBrowser(options: any = {}): Promise<any> {
  const baseArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-plugins',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--font-render-hinting=none',
  ];

  const executablePath = getChromiumExecutablePath();
  const mergedArgs = Array.from(new Set([...baseArgs, ...(options.args || [])]));
  
  // Strategy 1: Use detected Chromium path (works in both dev and production)
  if (executablePath) {
    const launchOptions = {
      headless: true,
      ...options,
      args: mergedArgs,
      executablePath,
    };

    try {
      console.log(`🚀 [BROWSER] Launching with: ${executablePath}`);
      const browser = await puppeteer.launch(launchOptions);
      console.log('✅ [BROWSER] Launched successfully');
      usingSparticuz = false;
      return browser;
    } catch (error: any) {
      console.error(`❌ [BROWSER] Failed with detected path: ${error.message}`);
      // Don't throw yet - try bundled browser
    }
  }

  // Strategy 2: Let Puppeteer use its bundled browser (fallback)
  try {
    console.log('🔄 [BROWSER] Using Puppeteer bundled browser...');
    const browser = await puppeteer.launch({
      headless: true,
      args: mergedArgs,
    });
    console.log('✅ [BROWSER] Launched with Puppeteer bundled browser');
    usingSparticuz = false;
    return browser;
  } catch (bundledError: any) {
    console.error(`❌ [BROWSER] Bundled browser failed: ${bundledError.message}`);
    // Continue to Strategy 3
  }

  // Strategy 3: Use @sparticuz/chromium as last resort (for production environments)
  // This is slower but more reliable in serverless/container environments
  try {
    console.log('🔄 [BROWSER] Attempting @sparticuz/chromium fallback for production...');
    const chromium = await import('@sparticuz/chromium');
    
    // Configure for minimal download and fast startup
    chromium.default.setGraphicsMode = false;
    
    const sparticuzPath = await chromium.default.executablePath();
    console.log(`📍 [BROWSER] @sparticuz/chromium path: ${sparticuzPath}`);
    
    const browser = await puppeteerCore.launch({
      headless: 'shell',
      args: [...chromium.default.args, ...mergedArgs],
      executablePath: sparticuzPath,
      defaultViewport: { width: 1200, height: 1600 },
    });
    
    console.log('✅ [BROWSER] Launched with @sparticuz/chromium');
    usingSparticuz = true;
    return browser;
  } catch (sparticuzError: any) {
    console.error(`❌ [BROWSER] @sparticuz/chromium failed: ${sparticuzError.message}`);
    throw new Error(`Failed to launch browser. All strategies exhausted. Last error: ${sparticuzError.message}`);
  }
}

export function clearChromiumCache(): void {
  cachedPath = null;
  detectionAttempted = false;
}

export function getChromiumInfo(): { path: string | null; method: string; usingSparticuz: boolean } {
  const chromePath = getChromiumExecutablePath();
  return { 
    path: chromePath || null, 
    method: chromePath ? 'local' : 'sparticuz',
    usingSparticuz,
  };
}
