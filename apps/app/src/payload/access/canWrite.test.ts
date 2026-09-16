import { describe, expect, it } from "bun:test";
import { canWrite } from "@/payload/access/canWrite";
import type { User } from "@/payload/payload-types";

/**
 * Build a minimal fake PayloadRequest for access rule testing.
 * We only need `req.user`; the access functions don't touch anything else.
 */
function makeReq(user: User | null): Parameters<typeof canWrite>[0] {
  return {
    req: { user },
  } as Parameters<typeof canWrite>[0];
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    createdAt: new Date().toISOString(),
    email: "user@example.com",
    id: "user-1",
    roles: ["user"],
    tenants: [],
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as unknown as User;
}

describe("canWrite", () => {
  it("denies unauthenticated requests", () => {
    const result = canWrite(makeReq(null));
    expect(result).toBe(false);
  });

  it("grants super-admin unrestricted access (true, not a Where clause)", () => {
    const user = makeUser({ roles: ["super-admin"] });
    const result = canWrite(makeReq(user));
    expect(result).toBe(true);
  });

  it("denies a user with no tenant memberships", () => {
    const user = makeUser({ tenants: [] });
    const result = canWrite(makeReq(user));
    expect(result).toBe(false);
  });

  it("returns a Where clause scoped to the user's owner tenant", () => {
    const user = makeUser({
      tenants: [
        {
          id: "row-1",
          roles: ["owner"],
          tenant: "tenant-abc",
        },
      ],
    } as Partial<User>);
    const result = canWrite(makeReq(user));
    expect(result).toMatchObject({
      tenant: { in: ["tenant-abc"] },
    });
  });

  it("returns a Where clause scoped to the user's manager tenant", () => {
    const user = makeUser({
      tenants: [
        {
          id: "row-2",
          roles: ["manager"],
          tenant: "tenant-xyz",
        },
      ],
    } as Partial<User>);
    const result = canWrite(makeReq(user));
    expect(result).toMatchObject({
      tenant: { in: ["tenant-xyz"] },
    });
  });

  it("combines owner and manager tenant IDs in the Where clause", () => {
    const user = makeUser({
      tenants: [
        { id: "row-1", roles: ["owner"], tenant: "tenant-a" },
        { id: "row-2", roles: ["manager"], tenant: "tenant-b" },
      ],
    } as Partial<User>);
    const result = canWrite(makeReq(user)) as {
      tenant: { in: string[] };
    };
    const ids = result.tenant.in;
    expect(ids).toContain("tenant-a");
    expect(ids).toContain("tenant-b");
  });

  it("includes manager-role tenants in the Where clause", () => {
    const user = makeUser({
      tenants: [
        { id: "row-1", roles: ["manager"], tenant: "tenant-only-manager" },
      ],
    } as Partial<User>);
    const result = canWrite(makeReq(user)) as {
      tenant: { in: string[] };
    };
    const ids = result.tenant.in;
    expect(ids).toContain("tenant-only-manager");
  });
});
