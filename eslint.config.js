import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import security from "eslint-plugin-security";
import tseslint from "typescript-eslint";

// ─────────────────────────────────────────────────────────────────────────────
// ESLint config — production-grade audit (2026-05)
//
// Scope split:
//  • src/**           → React/Vite browser code (strict, security-aware)
//  • supabase/**      → Deno edge functions (Deno runtime, own typings/style)
//  • scripts/**       → One-off Node scripts (looser, no console rule)
//  • netlify/**       → Netlify edge functions (Deno-like)
//
// Rule severity rationale:
//  • Real security rules (eslint-plugin-security) → enforced on src/** as warn
//    (warns surface in CI without breaking build; can be promoted to error
//    after the codebase is audited file-by-file).
//  • `no-explicit-any` kept as **warn** on src/** — it is a code-quality
//    rule, NOT a security rule, and ~400 historical occurrences live across
//    100+ files. Mass-converting to error blocks CI without security gain.
//    Tracked for incremental tightening. typescript-eslint's own
//    `recommended` preset ships this as warn.
//  • Deno edge functions are excluded from browser ESLint — they have
//    their own lint pass via `deno lint` and use APIs (`Deno.env`,
//    non-null assertions on guaranteed env vars) that conflict with
//    browser-TS conventions.
// ─────────────────────────────────────────────────────────────────────────────

export default tseslint.config(
  {
    ignores: [
      "dist",
      "build",
      "node_modules",
      "*.config.js",
      // Deno runtimes — linted separately by `deno lint`
      "supabase/functions/**",
      "netlify/edge-functions/**",
      // One-off ops scripts — not shipped to production bundle
      "scripts/**",
      // Generated Supabase types
      "src/integrations/supabase/types.ts",
    ],
  },

  // ── Browser/React source ────────────────────────────────────────────────
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      security,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // Code quality
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "prefer-const": "error",
      "no-var": "error",

      // Real security rules (warn to surface without blocking CI;
      // promote to error per-file after audit)
      "security/detect-eval-with-expression": "error",
      "security/detect-new-buffer": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-pseudo-random-bytes": "error",
      "security/detect-unsafe-regex": "warn",
      "security/detect-buffer-noassert": "warn",
      "security/detect-child-process": "warn",
      "security/detect-disable-mustache-escape": "warn",
      "security/detect-non-literal-fs-filename": "off", // browser code
      "security/detect-non-literal-regexp": "warn",
      "security/detect-non-literal-require": "warn",
      "security/detect-object-injection": "off", // very noisy on legitimate dict access
      "security/detect-possible-timing-attacks": "warn",
    },
  },

  // ── Tailwind / build config (.ts) ───────────────────────────────────────
  {
    files: ["tailwind.config.ts", "vite.config.ts", "vitest.config.ts", "vite-security-plugin.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2020, globals: globals.node },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
