import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";

import type { SectionProps, ThemeManifestDefinition } from "../types";
import { toClientThemeManifest } from "./toClientThemeManifest";

const DummyComponent = (_props: SectionProps): ReactElement | null => null;

describe(toClientThemeManifest, () => {
  it("returns undefined when manifest is null or undefined", () => {
    expect(toClientThemeManifest(null)).toBeUndefined();
    expect(toClientThemeManifest()).toBeUndefined();
  });

  it("extracts serializable fields and strips non-serializable section components and functions", () => {
    const rawManifest: ThemeManifestDefinition = {
      author: "Omset Digital",
      description: "A test theme",
      name: "Default Theme",
      slug: "default",
      templates: [],
      version: "1.0.0",
      sections: [
        {
          Component: DummyComponent,
          name: "Hero Section",
          slug: "hero",
        },
      ],
      settings: [
        {
          cssVar: "--theme-primary",
          defaultValue: "#000000",
          label: "Primary Color",
          name: "primaryColor",
          type: "color",
        },
      ],
    };

    const clientManifest = toClientThemeManifest(rawManifest);

    expect(clientManifest).toStrictEqual({
      name: "Default Theme",
      slug: "default",
      settings: [
        {
          cssVar: "--theme-primary",
          defaultValue: "#000000",
          label: "Primary Color",
          name: "primaryColor",
          type: "color",
        },
      ],
    });

    const serialized = JSON.stringify(clientManifest);
    const parsed = JSON.parse(serialized);
    expect(parsed).toStrictEqual(clientManifest);
    expect(clientManifest && "sections" in clientManifest).toBeFalsy();
    expect(clientManifest && "cssVars" in clientManifest).toBeFalsy();
  });
});
