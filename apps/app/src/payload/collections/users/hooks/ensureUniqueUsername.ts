import { getTenantFromCookie } from "@payloadcms/plugin-multi-tenant/utilities";
import { type FieldHook, ValidationError, type Where } from "payload";
import { getCollectionIDType, getUserTenantIDs } from "@/payload/lib/ids";

const ensureUniqueUsername: FieldHook = async ({ originalDoc, req, value }) => {
  if (originalDoc.username === value) {
    return value;
  }

  const constraints: Where[] = [
    {
      username: {
        equals: value,
      },
    },
  ];

  const selectedTenant = getTenantFromCookie(
    req.headers,
    getCollectionIDType({ collectionSlug: "tenants", payload: req.payload })
  );

  if (selectedTenant) {
    constraints.push({
      "tenants.tenant": {
        equals: selectedTenant,
      },
    });
  }

  const findDuplicateUsers = await req.payload.find({
    collection: "users",
    depth: 0,
    overrideAccess: true,
    select: { tenants: true },
    where: {
      and: constraints,
    },
  });

  if (findDuplicateUsers.docs.length > 0 && req.user) {
    const tenantIDs = getUserTenantIDs(req.user);

    // if the user is an admin or has access to more than 1 tenant
    // provide a more specific error message
    if (req.user.roles?.includes("super-admin") || tenantIDs.length > 1) {
      const tenant = await req.payload.findByID({
        collection: "tenants",
        depth: 0,
        // @ts-expect-error - selectedTenant will match DB ID type
        id: selectedTenant,
        overrideAccess: true,
        select: { name: true },
      });

      throw new ValidationError({
        errors: [
          {
            message: `The "${tenant.name}" tenant already has a user with the username "${value}". Usernames must be unique per tenant.`,
            path: "username",
          },
        ],
      });
    }

    throw new ValidationError({
      errors: [
        {
          message: `A user with the username ${value} already exists. Usernames must be unique per tenant.`,
          path: "username",
        },
      ],
    });
  }

  return value;
};

export { ensureUniqueUsername };
