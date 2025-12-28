import { createRequire } from "module";
const require = createRequire(import.meta.url);

export default {
  plugins: {
    "postcss-import": {
      resolve: (id) => {
        if (id.startsWith("@agentxjs/")) {
          return require.resolve(id);
        }
        return id;
      },
    },
    tailwindcss: {},
    autoprefixer: {},
  },
};
