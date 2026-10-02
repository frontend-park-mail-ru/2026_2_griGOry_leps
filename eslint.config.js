import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        history: "readonly",
        location: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        Headers: "readonly",
        HTMLElement: "readonly",
        HTMLAnchorElement: "readonly",
      },
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", "docs/**"],
  },
];