/**
 * Cucumber configuration for devtools BDD tests
 */

import { createCucumberConfig } from "../src/bdd/cucumber.config.ts";

export default createCucumberConfig({
  paths: ["bdd/journeys/**/*.feature"],
  import: ["bdd/steps/**/*.ts"],
});
