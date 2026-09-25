import { defineConfig } from "oxlint";

// @ts-expect-error file extension is required
import baseConfig from "../../oxlint.config.ts";

export default defineConfig({
  extends: [baseConfig],

  overrides: [
    {
      files: ["**/components/ui/**/*.{ts,tsx}"],
      rules: {
        "func-style": "off",
        "react/function-component-definition": "off",
      },
    },
  ],
});
