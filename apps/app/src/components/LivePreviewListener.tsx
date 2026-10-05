"use client";

import type { ReactElement } from "react";
import type {
  ThemeClientManifest,
  ThemeManifestDefinition,
} from "@repo/theme-core/types";

import { useRouter } from "next/navigation";

import { ThemeLivePreviewListener } from "@repo/payload-plugin-themes/client";

export interface LivePreviewListenerProps {
  manifest?: ThemeClientManifest | ThemeManifestDefinition;
  serverURL?: string;
}

export const LivePreviewListener = ({
  manifest,
  serverURL,
}: LivePreviewListenerProps): ReactElement => {
  const router = useRouter();

  return (
    <ThemeLivePreviewListener
      manifest={manifest}
      refresh={router.refresh}
      serverURL={serverURL}
    />
  );
};
