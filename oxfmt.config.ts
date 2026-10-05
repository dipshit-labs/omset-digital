import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    "**/.agents/**",
    "apps/app/src/app/(payload)/**",
    "apps/app/src/migrations/**",
    "packages/types/src/payload/generated.ts",
    "packages/ui/src/components/ui/**",
    "**/CONTEXT.md",
  ],

  sortImports: {
    internalPattern: ["~/", "@/", "#", "@repo/"],
    newlinesBetween: false,
    order: "asc",
    partitionByComment: true,
    groups: [
      "type-import",
      ["type-internal", "type-parent", "type-sibling", "type-index"],
      { newlinesBetween: true },
      "value-builtin",
      "value-external",
      { newlinesBetween: true },
      "value-internal",
      ["value-parent", "value-sibling", "value-index"],
      "side_effect",
      "unknown",
    ],
  },
});
