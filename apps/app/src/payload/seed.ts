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
}

export { seed };
