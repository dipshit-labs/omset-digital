import type { ReactElement } from "react";
import type { TemplateType } from "@repo/theme-core/types";

import config from "@payload-config";
import { draftMode, headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPayload } from "payload";

import { LivePreviewListener } from "@/components/LivePreviewListener";
import { StorefrontCanvas } from "@/components/StorefrontCanvas";
import { resolveStorefront } from "@/lib/storefront";
import { toClientThemeManifest } from "@repo/theme-core";

export interface HomePageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

const resolveTemplateType = (
  params: Record<string, string | string[] | undefined>
): TemplateType => {
  let raw: string | undefined;

  if (typeof params.templateType === "string") {
    raw = params.templateType;
  } else if (typeof params.template === "string") {
    raw = params.template;
  }
  if (raw === "product" || raw === "collection" || raw === "page") {
    return raw;
  }

  return "home";
};

const Home = async ({ searchParams }: HomePageProps): Promise<ReactElement> => {
  const { isEnabled: draft } = await draftMode();
  const headersList = await headers();
  const host = headersList.get("host");
  const params = searchParams ? await searchParams : {};
  const storeSlug = typeof params.store === "string" ? params.store : undefined;
  const templateType = resolveTemplateType(params);
  const rawTheme = params.theme ?? params.themeSlug;
  const themeParam = typeof rawTheme === "string" ? rawTheme : undefined;

  const payload = await getPayload({ config });
  const context = await resolveStorefront({
    draft,
    host,
    payload,
    storeSlug,
    templateType,
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

export default Home;
