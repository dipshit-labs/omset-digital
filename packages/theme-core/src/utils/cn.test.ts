import { describe, expect, it } from "vitest";

import { cn } from "./cn";

describe(cn, () => {
  it("merges conditional class names and resolves tailwind collisions", () => {
    const isHidden = false;
    expect(cn("px-4 py-2", isHidden && "hidden", "opacity-50")).toBe(
      "px-4 py-2 opacity-50"
    );
    expect(cn("p-4", "p-2")).toBe("p-2");
  });
});
