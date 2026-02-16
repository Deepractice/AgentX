/**
 * Playwright utilities for BDD testing
 *
 * Uses system Chrome to avoid downloading Chromium.
 * Install: PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 bun add -d @playwright/test
 *
 * Browser lifecycle:
 * - Single browser instance for all tests
 * - Single page (tab) reused across scenarios
 * - resetPage() clears state between scenarios
 */

import { type Browser, chromium, type Page } from "@playwright/test";

export interface BrowserOptions {
  headless?: boolean;
  slowMo?: number;
}

let browser: Browser | null = null;
let page: Page | null = null;

/**
 * Launch browser using system Chrome (singleton)
 */
export async function launchBrowser(options: BrowserOptions = {}): Promise<Browser> {
  if (browser) return browser;

  const headless = options.headless ?? process.env.CI === "true";

  browser = await chromium.launch({
    channel: "chrome",
    headless,
    slowMo: options.slowMo,
  });

  return browser;
}

/**
 * Get or create a page (singleton, reused across scenarios)
 */
export async function getPage(): Promise<Page> {
  if (page && !page.isClosed()) return page;

  const b = await launchBrowser();
  page = await b.newPage();
  return page;
}

/**
 * Reset page state between scenarios (without closing)
 * Use this instead of closePage() for faster tests
 */
export async function resetPage(): Promise<void> {
  try {
    if (page && !page.isClosed()) {
      const context = page.context();
      await context.clearCookies();
      await page.goto("about:blank");
    }
  } catch {
    // Browser may have crashed, will recreate on next getPage()
    page = null;
  }
}

/**
 * Close current page
 * @deprecated Use resetPage() for faster tests. Only use closePage() if you need full isolation.
 */
export async function closePage(): Promise<void> {
  if (page) {
    await page.close();
    page = null;
  }
}

/**
 * Close browser and cleanup
 */
export async function closeBrowser(): Promise<void> {
  if (page && !page.isClosed()) {
    await page.close();
    page = null;
  }
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * Wait for a URL to be accessible
 */
export async function waitForUrl(url: string, timeout = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}
