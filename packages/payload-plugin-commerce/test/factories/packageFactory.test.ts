import { describe, expect, it } from "vitest";

import { packageFactory } from "./packageFactory";

describe("package document factory", () => {
  it("builds a package document synchronously with default values", () => {
    const pkg = packageFactory.build();

    expect(pkg.title).toBe("Box 1");
    expect(pkg.isDefault).toBeTruthy();
    expect(pkg.dimensions).toStrictEqual({
      height: 10,
      length: 20,
      width: 15,
    });
    expect(pkg.tareWeight).toStrictEqual({
      unit: "g",
      value: 100,
    });
    expect(pkg.store).toBe(1);
  });

  it("allows overriding specific fields during build", () => {
    const pkg = packageFactory.build({
      isDefault: false,
      title: "Custom Box",
    });

    expect(pkg.title).toBe("Custom Box");
    expect(pkg.isDefault).toBeFalsy();
  });

  it("throws an error when create is called without transient payload", async () => {
    await expect(packageFactory.create()).rejects.toThrow(
      "Payload instance required"
    );
  });
});
