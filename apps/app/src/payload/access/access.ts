import type { Access, FieldAccess } from "payload";

export interface UserTenantRole {
  roles?: ("owner" | "manager")[];
  tenant?: string | { id: string | number } | number;
}

export interface AppUser {
  id: string | number;
  roles?: ("super-admin" | "user")[];
  tenants?: UserTenantRole[];
}

export const isSuperAdmin = (user?: unknown): boolean => {
  if (!user || typeof user !== "object") {
    return false;
  }

  const { roles } = user as AppUser;
  return Array.isArray(roles) && roles.includes("super-admin");
};

export const isTenantOwner = (
  user: unknown,
  tenantId: string | number
): boolean => {
  if (!user || typeof user !== "object") {
    return false;
  }

  const { tenants } = user as AppUser;
  if (!Array.isArray(tenants)) {
    return false;
  }

  return tenants.some((item) => {
    const rawTenant = item.tenant;
    const resolvedTenantId =
      typeof rawTenant === "object" && rawTenant !== null
        ? String(rawTenant.id)
        : String(rawTenant);

    const hasOwnerRole =
      Array.isArray(item.roles) && item.roles.includes("owner");
    return resolvedTenantId === String(tenantId) && hasOwnerRole;
  });
};

export const isTenantOwnerOrSuperAdmin = (
  user: unknown,
  tenantId?: string | number
): boolean => {
  if (isSuperAdmin(user)) {
    return true;
  }

  if (!tenantId) {
    return false;
  }

  return isTenantOwner(user, tenantId);
};

export const canMutateTenant: Access = ({ req: { user } }) =>
  isSuperAdmin(user);

export const canReadTenant: Access = ({ req: { user } }) => Boolean(user);

export const canReadRestrictedField: FieldAccess = ({ req: { user }, doc }) => {
  if (isSuperAdmin(user)) {
    return true;
  }

  const tenantId = doc?.id;
  if (!tenantId) {
    return false;
  }

  return isTenantOwner(user, tenantId);
};
