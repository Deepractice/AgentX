const common = {
  format: ["progress-bar", "html:reports/cucumber-report.html"],
  formatOptions: { snippetInterface: "async-await" },
  worldParameters: {
    defaultTimeout: 35000, // 35 seconds for steps that call Claude API
  },
};

export default common;

export const agent = {
  ...common,
  import: ["steps/agent/**/*.ts"],
};

export const runtime = {
  ...common,
  import: ["steps/runtime/**/*.ts"],
};
