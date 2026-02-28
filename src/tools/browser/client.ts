import type { Browser, BrowserContext, Page } from 'playwright';
import { existsSync, mkdirSync, cpSync, readdirSync } from 'fs';
import { spawn, execSync, type ChildProcess } from 'child_process';
import { join } from 'path';
import { homedir } from 'os';

/** Common Chrome paths on Windows / macOS / Linux */
const CHROME_PATHS = [
  // Windows
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  `${process.env.LOCALAPPDATA ?? ''}\\Google\\Chrome\\Application\\chrome.exe`,
  // macOS
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  // Linux
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];

/** Directories to skip when copying profile (large caches, not needed for login state) */
const SKIP_DIRS = new Set([
  'Cache',
  'Code Cache',
  'GPUCache',
  'Service Worker',
  'CacheStorage',
  'File System',
  'blob_storage',
  'IndexedDB',
  'DawnCache',
  'GrShaderCache',
  'ShaderCache',
  'optimization_guide_model_store',
  'BrowserMetrics',
  'Crashpad',
  'component_crx_cache',
]);

function findChrome(): string | null {
  for (const p of CHROME_PATHS) {
    if (p && existsSync(p)) return p;
  }
  return null;
}

/** Find the user's real Chrome profile directory */
function findUserDataDir(): string | null {
  const candidates = [
    // Windows
    join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'User Data'),
    // macOS
    join(homedir(), 'Library', 'Application Support', 'Google', 'Chrome'),
    // Linux
    join(homedir(), '.config', 'google-chrome'),
    join(homedir(), '.config', 'chromium'),
  ];
  for (const p of candidates) {
    if (p && existsSync(p)) return p;
  }
  return null;
}

function getCdpPort(cdpUrl: string): number {
  try {
    return parseInt(new URL(cdpUrl).port, 10) || 9222;
  } catch {
    return 9222;
  }
}

/** Check if any Chrome process is currently running */
function isChromeRunning(): boolean {
  try {
    if (process.platform === 'win32') {
      const out = execSync('tasklist /FI "IMAGENAME eq chrome.exe" /NH', {
        encoding: 'utf-8',
        windowsHide: true,
      });
      return out.includes('chrome.exe');
    } else {
      execSync('pgrep -x "chrome|chromium|google-chrome"', { encoding: 'utf-8' });
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Copy user's Chrome profile to our working directory, skipping large cache dirs.
 * This preserves cookies, login state, extensions, etc.
 */
function syncProfile(sourceDir: string, targetDir: string): void {
  mkdirSync(targetDir, { recursive: true });

  // Copy top-level files (Local State, etc.)
  const entries = readdirSync(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const src = join(sourceDir, entry.name);
    const dst = join(targetDir, entry.name);

    if (entry.isFile()) {
      try {
        cpSync(src, dst, { force: true });
      } catch {
        // Some files may be locked, skip them
      }
    } else if (entry.isDirectory()) {
      if (entry.name === 'Default' || entry.name.startsWith('Profile ')) {
        // Copy profile dirs, skipping caches
        syncProfileDir(src, dst);
      } else if (!SKIP_DIRS.has(entry.name)) {
        // Copy other small dirs
        try {
          cpSync(src, dst, { recursive: true, force: true });
        } catch {
          // Skip locked/inaccessible dirs
        }
      }
    }
  }
}

function syncProfileDir(sourceDir: string, targetDir: string): void {
  mkdirSync(targetDir, { recursive: true });

  let entries;
  try {
    entries = readdirSync(sourceDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;

    const src = join(sourceDir, entry.name);
    const dst = join(targetDir, entry.name);

    try {
      if (entry.isFile()) {
        cpSync(src, dst, { force: true });
      } else if (entry.isDirectory()) {
        cpSync(src, dst, { recursive: true, force: true });
      }
    } catch {
      // Skip locked files
    }
  }
}

/**
 * Manages a Playwright CDP connection to the user's Chrome.
 * Auto-launches Chrome with --remote-debugging-port if not already running.
 * Syncs user's Chrome profile to preserve cookies/login state.
 */
export class BrowserClient {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private _page: Page | null = null;
  private cdpUrl: string;
  private chromeProcess: ChildProcess | null = null;

  constructor(cdpUrl: string) {
    this.cdpUrl = cdpUrl;
  }

  async connect(): Promise<void> {
    if (this.browser) return;

    const { chromium } = await import('playwright');

    // Try connecting to existing Chrome with CDP
    try {
      this.browser = await chromium.connectOverCDP(this.cdpUrl);
    } catch {
      // CDP not available — need to (re)launch Chrome
      await this.launchChrome();
      this.browser = await chromium.connectOverCDP(this.cdpUrl);
    }

    const contexts = this.browser.contexts();
    this.context = contexts[0] ?? await this.browser.newContext();

    const pages = this.context.pages();
    this._page = pages[0] ?? await this.context.newPage();
  }

  private async launchChrome(): Promise<void> {
    const chromePath = findChrome();
    if (!chromePath) {
      throw new Error(
        'Chrome not found. Please install Chrome or start it manually with: chrome --remote-debugging-port=9222',
      );
    }

    const port = getCdpPort(this.cdpUrl);

    // If Chrome is already running without CDP, kill it first
    if (isChromeRunning()) {
      console.error('[windows-use] Chrome is running without CDP. Restarting with --remote-debugging-port...');
      try {
        if (process.platform === 'win32') {
          execSync('taskkill /F /IM chrome.exe /T', { windowsHide: true, stdio: 'ignore' });
        } else {
          execSync('pkill -f chrome', { stdio: 'ignore' });
        }
      } catch {
        // May fail if already exited
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    // --user-data-dir is REQUIRED for --remote-debugging-port to work
    const targetDir = join(homedir(), '.windows-use', 'chrome-profile');

    // Sync user's profile to preserve cookies/login state
    const userDir = findUserDataDir();
    if (userDir) {
      console.error('[windows-use] Syncing Chrome profile (cookies, login state)...');
      syncProfile(userDir, targetDir);
      console.error('[windows-use] Profile synced.');
    } else {
      mkdirSync(targetDir, { recursive: true });
    }

    console.error(`[windows-use] Launching Chrome with --remote-debugging-port=${port}`);

    this.chromeProcess = spawn(
      chromePath,
      [
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${targetDir}`,
      ],
      { detached: true, stdio: 'ignore' },
    );
    this.chromeProcess.unref();

    // Wait for CDP to be ready
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`http://localhost:${port}/json/version`);
        if (res.ok) return;
      } catch {
        // Not ready yet
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    throw new Error('Chrome launched but CDP endpoint did not become available within 15s');
  }

  async getPage(): Promise<Page> {
    await this.connect();
    return this._page!;
  }

  /** Create a new tab and switch to it. */
  async newPage(): Promise<Page> {
    await this.connect();
    this._page = await this.context!.newPage();
    return this._page;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
      this.context = null;
      this._page = null;
    }
  }

  get connected(): boolean {
    return this.browser !== null && this.browser.isConnected();
  }
}
