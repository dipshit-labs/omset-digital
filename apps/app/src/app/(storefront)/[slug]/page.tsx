import config from "@payload-config";
import { RichText } from "@payloadcms/richtext-lexical/react";
import { toClientThemeManifest } from "@repo/payload-plugin-themes/utilities";
import { draftMode, headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import type { ReactElement } from "react";

import { LivePreviewListener } from "@/components/LivePreviewListener";
import { StorefrontCanvas } from "@/components/StorefrontCanvas";
import { resolvePageStorefront } from "@/lib/storefront";

export interface CustomPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

const CustomPage = async ({
  params,
  searchParams,
}: CustomPageProps): Promise<ReactElement> => {
  const { slug } = await params;
  const { isEnabled: draft } = await draftMode();
  const headersList = await headers();
  const host = headersList.get("host");
  const query = searchParams ? await searchParams : {};
  const storeSlug = typeof query.store === "string" ? query.store : undefined;

  const payload = await getPayload({ config });
  const context = await resolvePageStorefront({
    draft,
    host,
    payload,
    slug,
    storeSlug,
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
      <StorefrontCanvas context={context}>
        {context.page.content ? (
          <main className="container mx-auto px-4 py-8">
            <RichText data={context.page.content} />
          </main>
        ) : null}
      </StorefrontCanvas>
    </>
  );
};

export default CustomPage;
