import { configure } from "@deepracticex/bdd";

await configure({
  features: ["bdd/journeys/**/*.feature"],
  steps: ["bdd/steps/**/*.ts"],
  tags: "(@maintainer or @contributor) and not @pending and not @skip and not @ui and not @slow",
});
