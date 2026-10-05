import type { ReactElement } from "react";

import config from "@payload-config";
import { draftMode, headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPayload } from "payload";

import { LivePreviewListener } from "@/components/LivePreviewListener";
import { StorefrontCanvas } from "@/components/StorefrontCanvas";
import { resolveStorefront } from "@/lib/storefront";
import { toClientThemeManifest } from "@repo/theme-core";

export interface CollectionsPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

const CollectionsPage = async ({
  searchParams,
}: CollectionsPageProps): Promise<ReactElement> => {
  const { isEnabled: draft } = await draftMode();
  const headersList = await headers();
  const host = headersList.get("host");
  const params = searchParams ? await searchParams : {};
  const storeSlug = typeof params.store === "string" ? params.store : undefined;
  const rawTheme = params.theme ?? params.themeSlug;
  const themeParam = typeof rawTheme === "string" ? rawTheme : undefined;

  const payload = await getPayload({ config });
  const context = await resolveStorefront({
    draft,
    host,
    payload,
    storeSlug,
    templateType: "collection",
    themeParam,
  });

  if (!context) {
    notFound();
  }

  return (
    <>
      {draft ? (
        <LivePreviewListener
          manifest={toClientThemeManifest(context.manifest)}
        />
      ) : null}
      <StorefrontCanvas context={context} />
    </>
  );
};

export default CollectionsPage;
