import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

let cachedPath: string | null = null;
let detectionAttempted = false;

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

  console.log('⚠️ [CHROMIUM] No executable found - Puppeteer will use bundled browser');
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
  ];

  const mergedArgs = Array.from(new Set([...baseArgs, ...(options.args || [])]));

  const executablePath = getChromiumExecutablePath();
  
  const launchOptions = {
    headless: true,
    ...options,
    args: mergedArgs,
    ...(executablePath ? { executablePath } : {}),
  };

  try {
    console.log(`🚀 [BROWSER] Launching with path: ${executablePath || 'bundled'}`);
    const browser = await puppeteer.launch(launchOptions);
    console.log('✅ [BROWSER] Launched successfully');
    return browser;
  } catch (firstError: any) {
    console.log(`⚠️ [BROWSER] First attempt failed: ${firstError.message}`);
    
    if (executablePath) {
      try {
        console.log('🔄 [BROWSER] Retrying without custom executablePath...');
        const fallbackOptions = { ...launchOptions };
        delete fallbackOptions.executablePath;
        const browser = await puppeteer.launch(fallbackOptions);
        console.log('✅ [BROWSER] Launched with bundled browser');
        cachedPath = null;
        return browser;
      } catch (secondError: any) {
        console.error(`❌ [BROWSER] Bundled browser also failed: ${secondError.message}`);
      }
    }

    for (const knownPath of KNOWN_PATHS) {
      if (fs.existsSync(knownPath) && knownPath !== executablePath) {
        try {
          console.log(`🔄 [BROWSER] Trying known path: ${knownPath}`);
          const browser = await puppeteer.launch({
            ...launchOptions,
            executablePath: knownPath,
          });
          console.log(`✅ [BROWSER] Launched with: ${knownPath}`);
          cachedPath = knownPath;
          return browser;
        } catch {}
      }
    }

    throw new Error(`Failed to launch browser after all attempts. Original error: ${firstError.message}`);
  }
}

export function clearChromiumCache(): void {
  cachedPath = null;
  detectionAttempted = false;
}

export function getChromiumInfo(): { path: string | null; method: string } {
  const chromePath = getChromiumExecutablePath();
  return { 
    path: chromePath || null, 
    method: chromePath ? 'detected' : 'bundled' 
  };
}
