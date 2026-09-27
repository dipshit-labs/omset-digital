import config from "@payload-config";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import type { ReactElement } from "react";

import { StorefrontCanvas } from "@/components/StorefrontCanvas";
import { resolveStorefront } from "@/lib/storefront";

export interface HomePageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

const Home = async ({ searchParams }: HomePageProps): Promise<ReactElement> => {
  const headersList = await headers();
  const host = headersList.get("host");
  const params = searchParams ? await searchParams : {};
  const storeSlug = typeof params.store === "string" ? params.store : undefined;

  const payload = await getPayload({ config });
  const context = await resolveStorefront({
    host,
    payload,
    storeSlug,
    templateType: "home",
  });

  if (!context) {
    notFound();
  }

  return <StorefrontCanvas context={context} />;
};

export default Home;
