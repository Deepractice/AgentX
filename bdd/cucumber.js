export default {
  import: ["steps/**/*.ts"],
  loader: ["ts-node/esm"],
  format: ["progress-bar", "html:reports/cucumber-report.html"],
  formatOptions: { snippetInterface: "async-await" },
};
