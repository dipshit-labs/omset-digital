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
    "apps/app/src/app/(payload)/**/*",
    "packages/types/src/payload/generated.ts",
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
      files: ["packages/ui/src/components/ui/**/*.{ts,tsx}"],
      rules: {
        "func-style": "off",
        "react/function-component-definition": "off",
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
        groups: ["unknown", "method", "multiline-member"],
        order: "asc",
        type: "natural",
      },
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
