"use client";

import { ThemeLivePreviewListener } from "@repo/payload-plugin-themes/client";
import type { ThemeManifestDefinition } from "@repo/payload-plugin-themes/types";
import { useRouter } from "next/navigation";
import type { ReactElement } from "react";

export interface LivePreviewListenerProps {
  manifest?: ThemeManifestDefinition;
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
