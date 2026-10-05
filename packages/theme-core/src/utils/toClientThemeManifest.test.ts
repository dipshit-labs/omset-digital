import type { ThemeManifestDefinition } from "../types";

import { describe, expect, it } from "vitest";

import { toClientThemeManifest } from "./toClientThemeManifest";

describe(toClientThemeManifest, () => {
  it("extracts public manifest properties for client consumption", () => {
    const manifest: ThemeManifestDefinition = {
      name: "Default Theme",
      author: "Platform Team",
      description: "Default Storefront Theme",
      sections: [],
      slug: "default",
      version: "1.0.0",
      settings: [
        {
          name: "background",
          type: "color",
          defaultValue: "#ffffff",
          label: "Background",
        },
      ],
    };

    const clientManifest = toClientThemeManifest(manifest);

    expect(clientManifest).toStrictEqual({
      name: "Default Theme",
      slug: "default",
      settings: [
        {
          name: "background",
          type: "color",
          defaultValue: "#ffffff",
          label: "Background",
        },
      ],
    });
  });

  it("returns undefined when manifest is nullish", () => {
    expect(toClientThemeManifest(null)).toBeUndefined();
    expect(toClientThemeManifest()).toBeUndefined();
  });
});
