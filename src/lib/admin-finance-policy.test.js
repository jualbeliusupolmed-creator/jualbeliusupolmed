import { describe, expect, it } from "vitest";
import {
  ADMIN_PAYMENT_STATUSES,
  canSettleAdminPaymentType,
  SETTLEABLE_PAYMENT_TYPES,
} from "./admin-finance-policy";

describe("admin finance settlement policy", () => {
  it("allows only payment types with a manual activation path", () => {
    for (const type of SETTLEABLE_PAYMENT_TYPES) expect(canSettleAdminPaymentType(type)).toBe(true);
    for (const type of ["wanted", "bulk_iklan", "unknown", null]) expect(canSettleAdminPaymentType(type)).toBe(false);
  });

  it("accepts only known payment status values", () => {
    expect(ADMIN_PAYMENT_STATUSES).toEqual(["pending", "paid", "failed", "expired"]);
  });
});
