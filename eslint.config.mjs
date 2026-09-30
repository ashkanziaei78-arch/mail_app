import js from "@eslint/js";
import tseslint from "typescript-eslint";
import next from "@next/eslint-plugin-next";

/**
 * پیکربندی ESLint.
 *
 * عمداً کوچک نگه داشته شده: فقط قاعده‌هایی که خطای واقعی می‌گیرند، نه سلیقه
 * قالب‌بندی. هدف این است که CI سبز بماند و هشدارها معنا داشته باشند.
 */
export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "public/**", "src/generated/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "@next/next": next },
    rules: {
      ...next.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
);
