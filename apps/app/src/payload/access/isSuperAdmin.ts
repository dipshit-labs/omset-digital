import type { Access, FieldAccess } from "payload";
import type { User } from "../payload-types";

const isSuperAdminAccess: Access & FieldAccess = ({ req }): boolean =>
  isSuperAdmin(req.user);

const isSuperAdmin = (user: User | null): boolean =>
  Boolean(user?.roles?.includes("super-admin"));

export { isSuperAdmin, isSuperAdminAccess };
