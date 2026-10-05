import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";
import vitest from "ultracite/oxlint/vitest";

export default defineConfig({
  extends: [core, react, next, vitest, shadcn, antiSlop],
  jsPlugins: [...(shadcn.jsPlugins ?? []), "eslint-plugin-perfectionist"],
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    "**/.agents/**",
    "apps/app/src/app/(payload)/**",
    "apps/app/src/migrations/**",
    "packages/types/src/payload/generated.ts",
    "packages/ui/src/components/ui/**",
  ],

  overrides: [
    {
      files: ["apps/app/src/payload/**/*.{ts,tsx}"],
      rules: {
        "shadcn/no-arbitrary-values": "off",
        "shadcn/no-inline-styles": "off",
        "shadcn/no-raw-colors": "off",
        "shadcn/no-restyle": "off",
        "shadcn/no-unknown-classes": "off",
        "shadcn/require-static-classes": "off",
      },
    },
    {
      plugins: ["vitest"],
      files: [
        "**/*.{test,spec,test-d,spec-d}.{ts,tsx,js,jsx}",
        "**/__tests__/**/*.{ts,tsx,js,jsx}",
      ],
      rules: {
        "anti-slop/no-unknown-parameters": "off",
        "anti-slop/no-unsafe-dictionary-type": "off",
        "anti-slop/require-safety-comment-for-type-assertion": "off",
        "vitest/no-standalone-expect": "off",
        "vitest/prefer-importing-vitest-globals": "off",
      },
    },
    {
      files: ["**/scripts/**/*.{ts,js,mjs,cjs}"],
      rules: {
        "unicorn/filename-case": [
          "error",
          {
            cases: {
              kebabCase: true,
            },
          },
        ],
      },
    },
  ],

  rules: {
    "anti-slop/no-conditional-empty-object-spread": "off",
    "anti-slop/no-module-mocking": "off",
    "anti-slop/no-runtime-typeof": "off",
    "anti-slop/no-unknown-parameters": "off",
    "anti-slop/no-unknown-returns": "off",

    "no-warning-comments": "off",

    "sort-keys": "off",
    "perfectionist/sort-objects": [
      "error",
      {
        type: "natural",
        ignoreCase: true,
        order: "asc",
        specialCharacters: "keep",

        partitionByComment: true,
        partitionByNewLine: true,

        groups: ["top", "unknown", "method", "multiline-member"],
        customGroups: [
          {
            elementNamePattern: "^(?:id|key|name|type)$",
            groupName: "top",
            selector: "property",
          },
        ],

        useConfigurationIf: {
          objectType: "non-destructured",
        },
      },
      {
        type: "unsorted",
      },
    ],

    "perfectionist/sort-exports": ["error", { type: "natural", order: "asc" }],
    "perfectionist/sort-named-exports": [
      "error",
      { type: "natural", order: "asc" },
    ],
    "perfectionist/sort-named-imports": [
      "error",
      { type: "natural", order: "asc" },
    ],

    "unicorn/filename-case": [
      "error",
      {
        cases: {
          camelCase: true,
          pascalCase: true,
        },
      },
    ],
  },
});
