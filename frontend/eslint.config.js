import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores(["dist/", "coverage/"]),
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: { complexity: ["error", { max: 15 }] },
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended, jsxA11y.flatConfigs.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["vite.config.ts", "eslint.config.js"],
    languageOptions: { globals: globals.node },
  },
);
