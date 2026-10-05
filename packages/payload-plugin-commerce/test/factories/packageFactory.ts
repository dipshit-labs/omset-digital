import type { Payload } from "payload";
import type { Package } from "@repo/types";

import { Factory } from "fishery";

export interface PackageTransientParams {
  payload?: Payload;
}

export const packageFactory = Factory.define<Package, PackageTransientParams>(
  ({ onCreate, sequence, transientParams }) => {
    onCreate(async (pkg) => {
      if (!transientParams.payload) {
        throw new Error("Payload instance required");
      }
      const {
        createdAt: _createdAt,
        id: _id,
        updatedAt: _updatedAt,
        ...data
      } = pkg;
      const created = await transientParams.payload.create({
        collection: "packages",
        data,
      });
      // SAFETY: Payload Local API returns persisted document matching Package interface.
      return created as Package;
    });

    return {
      id: sequence,
      createdAt: new Date().toISOString(),
      isDefault: sequence === 1,
      store: 1,
      title: `Box ${sequence}`,
      updatedAt: new Date().toISOString(),
      dimensions: {
        height: 10,
        length: 20,
        width: 15,
      },
      tareWeight: {
        unit: "g",
        value: 100,
      },
    };
  }
);
