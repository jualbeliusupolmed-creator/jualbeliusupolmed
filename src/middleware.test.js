import { describe, expect, it } from "vitest";
import { isAdminWorkspacePath } from "@/middleware";

describe("admin workspace middleware routes", () => {
  it("allows the Sumut operational guide through the workspace middleware", () => {
    expect(isAdminWorkspacePath("/admin/operasional-sumut")).toBe(true);
    expect(isAdminWorkspacePath("/admin/operasional-sumut/review")).toBe(true);
  });

  it("keeps unknown legacy admin routes out of the new workspace", () => {
    expect(isAdminWorkspacePath("/admin/broadcast_grup")).toBe(false);
  });
});
