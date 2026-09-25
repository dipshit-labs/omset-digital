import type { User } from "@repo/types";
import type { Access, FieldAccess } from "payload";

const isSuperAdminAccess: Access & FieldAccess = ({ req }): boolean =>
  isSuperAdmin(req.user);

const isSuperAdmin = (user: User | null): boolean =>
  Boolean(user?.roles?.includes("super-admin"));

export { isSuperAdmin, isSuperAdminAccess };
