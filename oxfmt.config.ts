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
});
