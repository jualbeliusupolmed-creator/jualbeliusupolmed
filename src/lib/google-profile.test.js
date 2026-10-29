import { describe, expect, it } from "vitest";
import { isGoogleSellerProfile } from "./google-profile";

describe("isGoogleSellerProfile", () => {
  it("accepts a Google callback profile even if the optional email field is missing", () => {
    expect(
      isGoogleSellerProfile("google_user_ab123", {
        wa: "google_user_ab123",
        email_google: null,
        auth_provider: null,
      })
    ).toBe(true);
  });

  it("accepts an existing profile with a recorded Google identity", () => {
    expect(
      isGoogleSellerProfile("email_account_1234", {
        wa: "email_account_1234",
        email_google: "user@example.com",
        auth_provider: "wa_google",
      })
    ).toBe(true);
  });

  it("does not accept an unrelated email-only account", () => {
    expect(
      isGoogleSellerProfile("email_account_1234", {
        wa: "email_account_1234",
        email_google: null,
        auth_provider: "email",
      })
    ).toBe(false);
  });

  it("does not accept a profile other than the signed-in identity", () => {
    expect(
      isGoogleSellerProfile("google_user_ab123", {
        wa: "google_someone_else_xy9",
        auth_provider: "google",
      })
    ).toBe(false);
  });
});
