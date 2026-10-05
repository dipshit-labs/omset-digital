import type { Config } from "payload";

type SeedParameters = Parameters<NonNullable<Config["onInit"]>>[0];

export const seed = async (payload: SeedParameters): Promise<void> => {
  const store1 = await payload.create({
    collection: "stores",
    draft: false,
    data: {
      name: "Store 1",
      customDomain: "trial.localhost",
      slug: "trial",
      subscription: { status: "trial" },
      theme: "default",
      originAddress: {
        cityId: "501",
        cityName: "Yogyakarta",
        cityType: "Kota",
        postalCode: "55171",
        provinceId: "5",
        provinceName: "DI Yogyakarta",
        streetAddress: "Jl. Malioboro No. 12",
        subdistrictId: "574",
        subdistrictName: "Kotagede",
      },
    },
  });

  await payload.create({
    collection: "storeCredentials",
    draft: false,
    data: {
      paymentProvider: "none",
      shippingProvider: "none",
      store: store1.id,
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
