/**
 * Cucumber configuration for monorepo-level BDD tests
 *
 * Profiles:
 * - default: excludes @pending, @skip, @ui
 * - docs: only documentation tests
 */

import { createCucumberConfig } from "@agentxjs/devtools/bdd";

const base = {
  paths: ["bdd/journeys/**/*.feature"],
  import: ["bdd/steps/**/*.ts"],
};

export default createCucumberConfig({
  ...base,
  tags: "not @pending and not @skip and not @ui",
});

export const docs = createCucumberConfig({
  ...base,
  tags: "@pending and not @skip",
});
