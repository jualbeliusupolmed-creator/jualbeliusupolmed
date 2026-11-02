import { describe, expect, it, vi } from "vitest";
import { findOrInviteOwner } from "./admin-owner-invite";

function mockAdmin({ users = [], listError = null, inviteResult } = {}) {
  return {
    auth: { admin: {
      listUsers: vi.fn().mockResolvedValue({ data: { users }, error: listError }),
      inviteUserByEmail: vi.fn().mockResolvedValue(inviteResult || { data: { user: { id: "invited-user" } }, error: null }),
    } },
  };
}

describe("findOrInviteOwner", () => {
  it("uses an existing Auth account without sending another invitation", async () => {
    const user = { id: "existing-user", email: "admin@example.edu" };
    const admin = mockAdmin({ users: [user] });

    await expect(findOrInviteOwner(admin, " Admin@Example.edu ", "Admin", "https://example.edu"))
      .resolves.toEqual({ user, invitationSent: false });
    expect(admin.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("sends a one-time activation invite for an email not in Auth", async () => {
    const admin = mockAdmin();

    await expect(findOrInviteOwner(admin, "admin@example.edu", "Admin", "https://example.edu/"))
      .resolves.toEqual({ user: { id: "invited-user" }, invitationSent: true });
    expect(admin.auth.admin.inviteUserByEmail).toHaveBeenCalledWith("admin@example.edu", {
      data: { display_name: "Admin" },
      redirectTo: "https://example.edu/auth/callback?admin_invite=1&next=%2Fadmin%2Foverview",
    });
  });

  it("does not invite when Auth lookup fails or the email is invalid", async () => {
    const admin = mockAdmin({ listError: new Error("unavailable") });
    await expect(findOrInviteOwner(admin, "admin@example.edu", "Admin", "https://example.edu"))
      .rejects.toThrow("Daftar akun Auth gagal diperiksa.");
    await expect(findOrInviteOwner(admin, "invalid-email", "Admin", "https://example.edu"))
      .rejects.toThrow("Masukkan alamat email yang valid.");
    expect(admin.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("does not risk a duplicate invitation when Auth search reaches its safety limit", async () => {
    const admin = mockAdmin();
    admin.auth.admin.listUsers.mockResolvedValue({ data: { users: Array.from({ length: 1000 }, (_, index) => ({ id: String(index) })) }, error: null });

    await expect(findOrInviteOwner(admin, "admin@example.edu", "Admin", "https://example.edu"))
      .rejects.toThrow("Pencarian akun melewati batas aman.");
    expect(admin.auth.admin.listUsers).toHaveBeenCalledTimes(10);
    expect(admin.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
  });
});
