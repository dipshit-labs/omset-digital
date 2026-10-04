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
      environment: "node",
      name: "app",
      projects: [
        {
          test: {
            environment: "node",
            include: ["src/**/*.test.ts"],
            name: "unit",
          },
        },
        {
          test: {
            css: true,
            environment: "jsdom",
            include: ["src/**/*.test.tsx"],
            name: "ui",
            server: {
              deps: {
                inline: [/@payloadcms\/ui/u, /react-image-crop/u],
              },
            },
          },
        },
        {
          test: {
            environment: "node",
            fileParallelism: false,
            hookTimeout: 30_000,
            include: ["test/integrations/*.integration.test.ts"],
            name: "integration",
            testTimeout: 30_000,
          },
        },
      ],
    },
  };
});
