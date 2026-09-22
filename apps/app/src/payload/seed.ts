// biome-ignore-all lint/plugin/no-missing-override-access: seed runs at server init with no request context; overrideAccess is intentionally true

import type { Config } from "payload";

type SeedParameters = Parameters<NonNullable<Config["onInit"]>>[0];

async function seed(payload: SeedParameters): Promise<void> {
  const tenant1 = await payload.create({
    collection: "tenants",
    draft: false,
    data: {
      customDomain: "trial.localhost",
      name: "Tenant 1",
      slug: "trial",
      subscription: { status: "trial" },
      theme: "default",
    },
  });

  await payload.create({
    collection: "users",
    draft: false,
    data: {
      email: "superadmin@omsetdigital.com",
      password: "superadmin",
      roles: ["super-admin"],
    },
  });

  await payload.create({
    collection: "users",
    draft: false,
    data: {
      email: "tenant1@omsetdigital.com",
      password: "demo",
      roles: ["user"],
      tenants: [
        {
          roles: ["owner"],
          tenant: tenant1.id,
        },
      ],
    },
  });

  const defaultTheme = await payload.create({
    collection: "themes",
    draft: false,
    data: {
      isLive: true,
      name: "Modern Clean (Live)",
      templateSlug: "default",
      tenant: tenant1.id,
      settings: {
        backgroundColor: "#ffffff",
        containerMaxWidth: "1280",
        headingFont: "inter",
        primaryColor: "#0f172a",
        secondaryColor: "#3b82f6",
      },
    },
  });

  await payload.create({
    collection: "pages",
    draft: false,
    data: {
      slug: "home",
      templateType: "home",
      tenant: tenant1.id,
      theme: defaultTheme.id,
      title: "Home",
      sections: [
        {
          badgeText: "New Collection Available",
          blockType: "default_hero",
          heading: "Crafted for Indonesian Creators",
          showBadge: true,
          subheading: "Discover high quality goods from independent merchants.",
          variant: "centered",
          blocks: [
            {
              blockType: "default_hero_feature_bullet",
              description: "Shipped nationwide with RajaOngkir integration.",
              title: "Instant Shipping",
            },
          ],
          primaryCta: {
            label: "Explore Products",
            openInNewTab: false,
            url: "/products",
          },
        },
        {
          blockType: "default_featured_products",
          columns: "3",
          heading: "Trending This Week",
          limit: 6,
          showAddToCart: true,
        },
      ],
    },
  });

  await payload.create({
    collection: "storeSettings",
    draft: false,
    data: {
      activeTheme: defaultTheme.id,
      publicEmail: "support@tenant1.com",
      publicPhone: "+6281234567890",
      storeName: "Tenant 1 Store",
      tagline: "High quality goods direct from Indonesian creators",
      tenant: tenant1.id,
      socialLinks: [
        { platform: "instagram", url: "https://instagram.com/tenant1" },
        { platform: "whatsapp", url: "https://wa.me/6281234567890" },
      ],
    },
  });
}

export { seed };
