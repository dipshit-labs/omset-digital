import type { Config } from "payload";

type SeedParameters = Parameters<NonNullable<Config["onInit"]>>[0];

export const seed = async (payload: SeedParameters): Promise<void> => {
  const store1 = await payload.create({
    collection: "stores",
    draft: false,
    data: {
      customDomain: "trial.localhost",
      name: "Store 1",
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
      email: "store1@omsetdigital.com",
      password: "demo",
      roles: ["user"],
      stores: [
        {
          roles: ["owner"],
          store: store1.id,
        },
      ],
    },
  });
};
