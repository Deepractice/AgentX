/**
 * Manual Test Suite for @deepractice-ai/agentx-logger
 *
 * Run with: pnpm test:manual
 *
 * Note: Decorator tests are skipped due to tsx/esbuild limitations.
 * Use LoggerFactory for now. Decorators work fine with tsc compilation.
 */

// import "./01-decorator-basic"; // Skip - tsx doesn't support legacy decorators well
import "./02-factory-basic";
import "./03-log-levels";
import "./04-custom-logger";
import "./05-createLogger-api";

console.log("\n✅ All manual tests completed!\n");
