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

export {
  createCucumberConfig,
  type CucumberConfigOptions,
} from "./cucumber.config";

export {
  launchBrowser,
  getPage,
  resetPage,
  closePage,
  closeBrowser,
  waitForUrl,
  type BrowserOptions,
} from "./playwright";

export {
  startDevServer,
  stopDevServer,
  getDevServer,
  type DevServerOptions,
} from "./dev-server";

export {
  paths,
  getMonorepoPath,
  getPackagePath,
  getBddPath,
  getFixturesPath,
  getTempPath,
  ensureDir,
  resetPaths,
} from "./paths";

export {
  agentUiTester,
  type UiTestResult,
  type UiTesterOptions,
} from "./agent-ui-tester";

export {
  agentDocTester,
  type DocTestResult,
  type DocTesterOptions,
} from "./agent-doc-tester";
