// oxlint-disable unicorn/prefer-import-meta-properties
import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { loadEnv } from "payload/node";
import { defineProject } from "vitest/config";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default defineProject(() => {
  loadEnv(path.resolve(dirname));

  return {
    plugins: [react()],
    resolve: {
      tsconfigPaths: true,
    },
    test: {
      css: true,
      environment: "node",
      name: "app",
      projects: [
        {
          test: {
            environment: "node",
            include: ["**/*.test.ts"],
            name: "node",
          },
        },
        {
          test: {
            environment: "jsdom",
            include: ["**/*.test.tsx"],
            name: "jsdom",
          },
        },
      ],
      server: {
        deps: {
          inline: [/@payloadcms\/ui/u, /react-image-crop/u],
        },
      },
    },
  };
});
