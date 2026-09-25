import { defineConfig } from "oxlint";

// @ts-expect-error file extension is required
import baseConfig from "../../oxlint.config.ts";

export default defineConfig({
  extends: [baseConfig],
  ignorePatterns: [
    ...(baseConfig.ignorePatterns ?? []),
    "src/app/(payload)/**/*",
  ],

  overrides: [
    {
      files: ["**/src/payload/**/*.{ts,tsx}"],
      rules: {
        "shadcn/no-arbitrary-values": "off",
        "shadcn/no-inline-styles": "off",
        "shadcn/no-raw-colors": "off",
        "shadcn/no-restyle": "off",
        "shadcn/no-unknown-classes": "off",
        "shadcn/require-static-classes": "off",
      },
    },
  ],
});
