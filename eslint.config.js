import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.browser,
    },
    rules: {
      eqeqeq: "error",
      "no-var": "error",
      "prefer-const": "error",
      "no-console": "warn",
    },
  },
  {
    files: ["src/lib/logger.js"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["*.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },
  },
];
