// biome-ignore-all lint/plugin/no-missing-override-access: seed runs at server init with no request context; overrideAccess is intentionally true

import type { Config } from "payload";

type SeedParameters = Parameters<NonNullable<Config["onInit"]>>[0];

async function seed(payload: SeedParameters): Promise<void> {
  const store1 = await payload.create({
    collection: "stores",
    draft: false,
    data: {
      customDomain: "trial.localhost",
      name: "Tenant 1 Store",
      publicEmail: "support@tenant1.com",
      publicPhone: "+6281234567890",
      slug: "trial",
      subscription: { status: "trial" },
      tagline: "High quality goods direct from Indonesian creators",
      socialLinks: [
        { platform: "instagram", url: "https://instagram.com/tenant1" },
        { platform: "whatsapp", url: "https://wa.me/6281234567890" },
      ],
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
          tenant: store1.id,
        },
      ],
    },
  });

  // Creating a theme triggers:
  // 1. handleLiveTheme hooks (marks isLive = true)
  // 2. seedThemeTemplatesAfterChange hook (creates Home, Product, Collection, and Page templates)
  const defaultTheme = await payload.create({
    collection: "themes",
    draft: false,
    data: {
      isLive: true,
      name: "Modern Clean (Live)",
      templateSlug: "default",
      tenant: store1.id,
      settings: {
        backgroundColor: "#ffffff",
        containerMaxWidth: "1280",
        headingFont: "inter",
        primaryColor: "#0f172a",
        secondaryColor: "#3b82f6",
      },
    },
  });

  // Find the seeded default page template for creating a sample content page
  const pageTemplates = await payload.find({
    collection: "templates",
    depth: 0,
    select: {
      name: true,
    },
    where: {
      and: [
        { theme: { equals: defaultTheme.id } },
        { type: { equals: "page" } },
      ],
    },
  });

  if (pageTemplates.docs[0]) {
    await payload.create({
      collection: "pages",
      draft: false,
      data: {
        template: pageTemplates.docs[0].id,
        tenant: store1.id,
        title: "About Our Workshop",
      },
    });
  }
}

export { seed };
