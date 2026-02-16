/**
 * BDD utilities for testing AgentX projects
 *
 * @example
 * ```ts
 * import {
 *   createCucumberConfig,
 *   launchBrowser,
 *   startDevServer,
 * } from "@agentxjs/devtools/bdd";
 * ```
 */

export { agentDocTester, type DocTesterOptions, type DocTestResult } from "./agent-doc-tester";
export { agentUiTester, type UiTesterOptions, type UiTestResult } from "./agent-ui-tester";
export { type CucumberConfigOptions, createCucumberConfig } from "./cucumber.config";
export { type DevServerOptions, getDevServer, startDevServer, stopDevServer } from "./dev-server";
export {
  ensureDir,
  getBddPath,
  getFixturesPath,
  getMonorepoPath,
  getPackagePath,
  getTempPath,
  paths,
  resetPaths,
} from "./paths";
export {
  type BrowserOptions,
  closeBrowser,
  closePage,
  getPage,
  launchBrowser,
  resetPage,
  waitForUrl,
} from "./playwright";
