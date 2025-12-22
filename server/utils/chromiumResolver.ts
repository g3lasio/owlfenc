import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';

let cachedPath: string | null = null;
let detectionAttempted = false;
let usingSparticuz = false;

const KNOWN_PATHS = [
  '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser', 
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/opt/google/chrome/chrome',
  '/snap/bin/chromium',
];

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
              return p;
            } catch {}
          }
        }
      }
    } catch {}
  }
  return null;
}

function findInNixStore(): string | null {
  try {
    const result = execSync(
      'ls -1d /nix/store/*/bin/chromium 2>/dev/null | head -1',
      { encoding: 'utf8', timeout: 5000 }
    ).trim();
    if (result && fs.existsSync(result)) {
      return result;
    }
  } catch {}
  return null;
}

function findViaWhich(): string | null {
  try {
    const result = execSync(
      'which chromium chromium-browser google-chrome 2>/dev/null | head -1',
      { encoding: 'utf8', timeout: 3000 }
    ).trim();
    if (result && fs.existsSync(result)) {
      return result;
    }
  } catch {}
  return null;
}

export function getChromiumExecutablePath(): string | undefined {
  if (cachedPath && fs.existsSync(cachedPath)) {
    return cachedPath;
  }

  if (detectionAttempted && !cachedPath) {
    return undefined;
  }

  detectionAttempted = true;

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

  const puppeteerPath = findInPuppeteerCache();
  if (puppeteerPath) {
    cachedPath = puppeteerPath;
    console.log(`✅ [CHROMIUM] Found in Puppeteer cache: ${cachedPath}`);
    return cachedPath;
  }

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

  const nixPath = findInNixStore();
  if (nixPath) {
    cachedPath = nixPath;
    console.log(`✅ [CHROMIUM] Found in Nix store: ${cachedPath}`);
    return cachedPath;
  }

  const whichPath = findViaWhich();
  if (whichPath) {
    cachedPath = whichPath;
    console.log(`✅ [CHROMIUM] Found via which: ${cachedPath}`);
    return cachedPath;
  }

  console.log('⚠️ [CHROMIUM] No local executable found - will use @sparticuz/chromium');
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
  
  if (executablePath) {
    const mergedArgs = Array.from(new Set([...baseArgs, ...(options.args || [])]));
    const launchOptions = {
      headless: true,
      ...options,
      args: mergedArgs,
      executablePath,
    };

    try {
      console.log(`🚀 [BROWSER] Launching with local path: ${executablePath}`);
      const browser = await puppeteer.launch(launchOptions);
      console.log('✅ [BROWSER] Launched successfully with local Chromium');
      usingSparticuz = false;
      return browser;
    } catch (error: any) {
      console.log(`⚠️ [BROWSER] Local Chromium failed: ${error.message}`);
      console.log('🔄 [BROWSER] Falling back to @sparticuz/chromium...');
    }
  }

  try {
    console.log('🚀 [BROWSER] Launching with @sparticuz/chromium (production mode)...');
    const chromium = await import('@sparticuz/chromium');
    
    const sparticuzPath = await chromium.default.executablePath();
    console.log(`📍 [BROWSER] @sparticuz/chromium path: ${sparticuzPath}`);
    
    const sparticuzArgs = [
      ...chromium.default.args,
      ...baseArgs,
      ...(options.args || []),
    ];
    const uniqueArgs = Array.from(new Set(sparticuzArgs));

    const browser = await puppeteerCore.launch({
      headless: true,
      executablePath: sparticuzPath,
      args: uniqueArgs,
      defaultViewport: { width: 1280, height: 720 },
    });

    console.log('✅ [BROWSER] Launched successfully with @sparticuz/chromium');
    usingSparticuz = true;
    return browser;
  } catch (sparticuzError: any) {
    console.error(`❌ [BROWSER] @sparticuz/chromium failed: ${sparticuzError.message}`);
    console.error(`❌ [BROWSER] Stack: ${sparticuzError.stack}`);
    
    try {
      console.log('🔄 [BROWSER] Final fallback: Puppeteer bundled browser...');
      const browser = await puppeteer.launch({
        headless: true,
        args: baseArgs,
      });
      console.log('✅ [BROWSER] Launched with Puppeteer bundled browser');
      usingSparticuz = false;
      return browser;
    } catch (finalError: any) {
      console.error(`❌ [BROWSER] All browser launch attempts failed`);
      throw new Error(`Failed to launch any browser. Last error: ${finalError.message}`);
    }
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
