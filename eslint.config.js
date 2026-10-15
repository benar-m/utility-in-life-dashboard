import react from "eslint-plugin-react";

export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { react },
    rules: {
      "no-unused-vars": "warn",
      "react/jsx-uses-vars": "error",
    },
  },
];
