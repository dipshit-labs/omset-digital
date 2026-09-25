import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    "apps/app/src/app/(payload)/**/*",
    "packages/types/src/payload/generated.ts",
    "**/*.md",
  ],
});
