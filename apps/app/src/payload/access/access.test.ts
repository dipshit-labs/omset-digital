import { describe, expect, it } from "bun:test";
import { validateSlug } from "@/lib/utils";
import {
  canMutateTenant,
  canReadRestrictedField,
  isSuperAdmin,
  isTenantOwner,
} from "./access";

describe("Access Control & Validation Seam", () => {
  describe("validateSlug", () => {
    it("accepts valid lowercase alphanumeric slugs with hyphens", () => {
      expect(validateSlug("warung-kopi")).toBe(true);
      expect(validateSlug("toko123")).toBe(true);
      expect(validateSlug("store-a-1")).toBe(true);
    });

    it("rejects uppercase characters", () => {
      expect(validateSlug("Warung-Kopi")).toBe(
        "Slug must be lowercase alphanumeric characters and hyphens only (no spaces or edge hyphens)"
      );
    });

    it("rejects special characters other than hyphens", () => {
      expect(validateSlug("store_1")).toBe(
        "Slug must be lowercase alphanumeric characters and hyphens only (no spaces or edge hyphens)"
      );
      expect(validateSlug("store.com")).toBe(
        "Slug must be lowercase alphanumeric characters and hyphens only (no spaces or edge hyphens)"
      );
      expect(validateSlug("store 1")).toBe(
        "Slug must be lowercase alphanumeric characters and hyphens only (no spaces or edge hyphens)"
      );
    });

    it("rejects leading or trailing hyphens or empty string", () => {
      expect(validateSlug("-store")).toBe(
        "Slug must be lowercase alphanumeric characters and hyphens only (no spaces or edge hyphens)"
      );
      expect(validateSlug("store-")).toBe(
        "Slug must be lowercase alphanumeric characters and hyphens only (no spaces or edge hyphens)"
      );
      expect(validateSlug(" store ")).toBe(
        "Slug must be lowercase alphanumeric characters and hyphens only (no spaces or edge hyphens)"
      );
    });
  });

  describe("isSuperAdmin", () => {
    it("returns true for user with super-admin role", () => {
      const user = { id: "1", roles: ["super-admin"] };
      expect(isSuperAdmin(user)).toBe(true);
    });

    it("returns false for user without super-admin role", () => {
      const user = { id: "2", roles: ["user"] };
      expect(isSuperAdmin(user)).toBe(false);
      expect(isSuperAdmin(null)).toBe(false);
      expect(isSuperAdmin(undefined)).toBe(false);
    });
  });

  describe("isTenantOwner", () => {
    it("returns true when user is tenant owner for the given tenant ID", () => {
      const user = {
        id: "1",
        roles: ["user"],
        tenants: [
          {
            roles: ["owner"],
            tenant: "tenant-1",
          },
        ],
      };
      expect(isTenantOwner(user, "tenant-1")).toBe(true);
    });

    it("handles populated tenant object in tenants array", () => {
      const user = {
        id: "1",
        roles: ["user"],
        tenants: [
          {
            roles: ["owner"],
            tenant: { id: "tenant-1" },
          },
        ],
      };
      expect(isTenantOwner(user, "tenant-1")).toBe(true);
    });

    it("returns false when user is manager, not owner", () => {
      const user = {
        id: "1",
        roles: ["user"],
        tenants: [
          {
            roles: ["manager"],
            tenant: "tenant-1",
          },
        ],
      };
      expect(isTenantOwner(user, "tenant-1")).toBe(false);
    });

    it("returns false when tenant id does not match", () => {
      const user = {
        id: "1",
        roles: ["user"],
        tenants: [
          {
            roles: ["owner"],
            tenant: "tenant-2",
          },
        ],
      };
      expect(isTenantOwner(user, "tenant-1")).toBe(false);
    });
  });

  describe("canReadRestrictedField", () => {
    it("allows super-admin to read restricted fields", () => {
      const user = { id: "1", roles: ["super-admin"] };
      expect(
        canReadRestrictedField({
          doc: { id: "tenant-1" },
          req: { user } as unknown as Parameters<
            typeof canReadRestrictedField
          >[0]["req"],
        } as Parameters<typeof canReadRestrictedField>[0])
      ).toBe(true);
    });

    it("allows tenant owner to read restricted fields of their tenant", () => {
      const user = {
        id: "2",
        roles: ["user"],
        tenants: [
          {
            roles: ["owner"],
            tenant: "tenant-1",
          },
        ],
      };
      expect(
        canReadRestrictedField({
          doc: { id: "tenant-1" },
          req: { user } as unknown as Parameters<
            typeof canReadRestrictedField
          >[0]["req"],
        } as Parameters<typeof canReadRestrictedField>[0])
      ).toBe(true);
    });
    it("denies non-owner manager or unauthenticated user", () => {
      const manager = {
        id: "3",
        roles: ["user"],
        tenants: [
          {
            roles: ["manager"],
            tenant: "tenant-1",
          },
        ],
      };
      expect(
        canReadRestrictedField({
          doc: { id: "tenant-1" },
          req: { user: manager } as unknown as Parameters<
            typeof canReadRestrictedField
          >[0]["req"],
        } as Parameters<typeof canReadRestrictedField>[0])
      ).toBe(false);
      expect(
        canReadRestrictedField({
          doc: { id: "tenant-1" },
          req: { user: null } as unknown as Parameters<
            typeof canReadRestrictedField
          >[0]["req"],
        } as Parameters<typeof canReadRestrictedField>[0])
      ).toBe(false);
    });
  });
  describe("canMutateTenant (create / delete)", () => {
    it("only allows super-admin to create or delete tenants", () => {
      const admin = { id: "1", roles: ["super-admin"] };
      const owner = {
        id: "2",
        roles: ["user"],
        tenants: [{ roles: ["owner"], tenant: "tenant-1" }],
      };
      expect(
        canMutateTenant({
          req: { user: admin } as unknown as Parameters<
            typeof canMutateTenant
          >[0]["req"],
        } as Parameters<typeof canMutateTenant>[0])
      ).toBe(true);
      expect(
        canMutateTenant({
          req: { user: owner } as unknown as Parameters<
            typeof canMutateTenant
          >[0]["req"],
        } as Parameters<typeof canMutateTenant>[0])
      ).toBe(false);
      expect(
        canMutateTenant({
          req: { user: null } as unknown as Parameters<
            typeof canMutateTenant
          >[0]["req"],
        } as Parameters<typeof canMutateTenant>[0])
      ).toBe(false);
    });
  });
});
