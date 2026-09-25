import { getTenantFromCookie } from "@payloadcms/plugin-multi-tenant/utilities";
import { type FieldHook, ValidationError, type Where } from "payload";
import { getCollectionIDType, getUserStoreIDs } from "@/payload/lib/ids";

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

  const selectedStore = getTenantFromCookie(
    req.headers,
    getCollectionIDType({ collectionSlug: "stores", payload: req.payload })
  );

  if (selectedStore) {
    constraints.push({
      "stores.store": {
        equals: selectedStore,
      },
    });
  }

  const findDuplicateUsers = await req.payload.find({
    collection: "users",
    depth: 0,
    overrideAccess: true,
    select: { stores: true },
    where: {
      and: constraints,
    },
  });

  if (findDuplicateUsers.docs.length > 0 && req.user) {
    const storeIDs = getUserStoreIDs(req.user);

    // if the user is an admin or has access to more than 1 store
    // provide a more specific error message
    if (req.user.roles?.includes("super-admin") || storeIDs.length > 1) {
      const store = await req.payload.findByID({
        collection: "stores",
        depth: 0,
        // @ts-expect-error - selectedStore will match DB ID type
        id: selectedStore,
        overrideAccess: true,
        select: { name: true },
      });

      throw new ValidationError({
        errors: [
          {
            message: `The "${store.name}" store already has a user with the username "${value}". Usernames must be unique per store.`,
            path: "username",
          },
        ],
      });
    }

    throw new ValidationError({
      errors: [
        {
          message: `A user with the username ${value} already exists. Usernames must be unique per store.`,
          path: "username",
        },
      ],
    });
  }

  return value;
};

export { ensureUniqueUsername };
