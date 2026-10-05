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
      name: "app",
      environment: "node",
      projects: [
        {
          test: {
            name: "unit",
            environment: "node",
            include: ["src/**/*.test.ts", "test/factories/**/*.test.ts"],
          },
        },
        {
          test: {
            name: "ui",
            css: true,
            environment: "jsdom",
            include: ["src/**/*.test.tsx"],
            server: {
              deps: {
                inline: [/@payloadcms\/ui/u, /react-image-crop/u],
              },
            },
          },
        },
        {
          test: {
            name: "integration",
            environment: "node",
            fileParallelism: false,
            hookTimeout: 30_000,
            include: ["test/integrations/*.integration.test.ts"],
            testTimeout: 30_000,
          },
        },
      ],
    },
  };
});
