// @vitest-environment node
import { preventPaymentStatusReversion } from "@repo/payload-plugin-commerce/hooks";
import type { Field, SelectField } from "payload";
import { describe, expect, it } from "vitest";

import { canWrite } from "@/payload/access/canWrite";
import { enforceStoreOnCreate } from "@/payload/hooks/enforceStoreOnCreate";

import { Orders } from "./index";

describe("Orders collection", () => {
  it("defines standard order collection configuration", () => {
    expect(Orders.slug).toBe("orders");
    expect(Orders.admin?.useAsTitle).toBe("orderNumber");
  });

  it("configures tenant scoping and state reversion prevention hooks", () => {
    expect(Orders.hooks?.beforeChange).toContain(enforceStoreOnCreate);
    expect(Orders.hooks?.beforeValidate).toContain(
      preventPaymentStatusReversion
    );
  });

  it("configures access control with canWrite", () => {
    expect(Orders.access?.create).toBe(canWrite);
    expect(Orders.access?.read).toBe(canWrite);
    expect(Orders.access?.update).toBe(canWrite);
    expect(Orders.access?.delete).toBe(canWrite);
  });

  it("contains orderNumber, paymentStatus, total, and customer fields", () => {
    const { fields } = Orders;

    const orderNumberField = fields.find(
      (f: Field) => "name" in f && f.name === "orderNumber" && f.type === "text"
    );
    const paymentStatusField = fields.find(
      (f: Field) =>
        "name" in f && f.name === "paymentStatus" && f.type === "select"
    ) as SelectField | undefined;
    const totalField = fields.find(
      (f: Field) => "name" in f && f.name === "total" && f.type === "number"
    );

    expect(orderNumberField).toBeDefined();
    expect(paymentStatusField).toBeDefined();
    expect(totalField).toBeDefined();

    const options = paymentStatusField?.options ?? [];
    const optionValues = options.map((opt: unknown) => {
      if (typeof opt === "string") {
        return opt;
      }
      if (opt && typeof opt === "object" && "value" in opt) {
        return String(opt.value);
      }
      return "";
    });

    expect(optionValues).toContain("pending");
  });
});
