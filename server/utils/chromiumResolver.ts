import { execSync } from 'child_process';
import fs from 'fs';

let cachedPath: string | null = null;

export function getChromiumExecutablePath(): string {
  if (cachedPath) {
    return cachedPath;
  }

  const possiblePaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
    '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
  ];

  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      console.log(`✅ [CHROMIUM] Found at: ${p}`);
      cachedPath = p;
      return p;
    }
  }

  try {
    const whichResult = execSync('which chromium 2>/dev/null || which chromium-browser 2>/dev/null || which google-chrome 2>/dev/null', { encoding: 'utf8' }).trim();
    if (whichResult && fs.existsSync(whichResult)) {
      console.log(`✅ [CHROMIUM] Found via which: ${whichResult}`);
      cachedPath = whichResult;
      return whichResult;
    }
  } catch {
  }

  try {
    const nixPath = execSync('find /nix/store -maxdepth 2 -name "chromium" -type f 2>/dev/null | head -1', { encoding: 'utf8' }).trim();
    if (nixPath && fs.existsSync(nixPath)) {
      console.log(`✅ [CHROMIUM] Found in nix store: ${nixPath}`);
      cachedPath = nixPath;
      return nixPath;
    }
  } catch {
  }

  try {
    const nixBinPath = execSync('find /nix/store -path "*/bin/chromium" -type f 2>/dev/null | head -1', { encoding: 'utf8' }).trim();
    if (nixBinPath && fs.existsSync(nixBinPath)) {
      console.log(`✅ [CHROMIUM] Found chromium binary in nix: ${nixBinPath}`);
      cachedPath = nixBinPath;
      return nixBinPath;
    }
  } catch {
  }

  const fallback = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
  console.log(`⚠️ [CHROMIUM] Using fallback path: ${fallback}`);
  cachedPath = fallback;
  return fallback;
}

export function clearChromiumCache(): void {
  cachedPath = null;
}
