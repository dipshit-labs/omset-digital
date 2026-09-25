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

  rules: {
    "anti-slop/no-conditional-empty-object-spread": "off",
    "anti-slop/no-module-mocking": "off",
    "anti-slop/no-unknown-parameters": "off",
    "anti-slop/no-unknown-returns": "off",

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
        },
      },
    ],
  },
});
