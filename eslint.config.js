import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";

const tsFiles = ["**/*.ts", "**/*.tsx"];

export default [
  {
    ignores: [".next"],
  },
  ...nextCoreWebVitals,
  // TypeScript rules (flat config) - scoped to TS files only
  {
    files: tsFiles,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
      },
    },
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: tsFiles,
  })),
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: tsFiles,
  })),
  ...tseslint.configs.stylisticTypeChecked.map((config) => ({
    ...config,
    files: tsFiles,
  })),
  {
    files: tsFiles,
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      // my rules
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
    },
  },
];
