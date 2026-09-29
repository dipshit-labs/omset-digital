import { describe, expect, it } from "vitest";

import type { ThemeManifestDefinition } from "../types";
import { toClientThemeManifest } from "./toClientThemeManifest";

describe(toClientThemeManifest, () => {
  it("extracts public manifest properties for client consumption", () => {
    const manifest: ThemeManifestDefinition = {
      author: "Platform Team",
      description: "Default Storefront Theme",
      name: "Default Theme",
      sections: [],
      slug: "default",
      version: "1.0.0",
      settings: [
        {
          defaultValue: "#ffffff",
          label: "Background",
          name: "background",
          type: "color",
        },
      ],
    };

    const clientManifest = toClientThemeManifest(manifest);

    expect(clientManifest).toStrictEqual({
      name: "Default Theme",
      slug: "default",
      settings: [
        {
          defaultValue: "#ffffff",
          label: "Background",
          name: "background",
          type: "color",
        },
      ],
    });
  });

  it("returns undefined when manifest is nullish", () => {
    expect(toClientThemeManifest(null)).toBeUndefined();
    expect(toClientThemeManifest()).toBeUndefined();
  });
});
