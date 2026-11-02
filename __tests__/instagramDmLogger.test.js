import { describe, it, expect } from "vitest";
import { sanitizeDmMessageText } from "@/lib/instagramDmLogger";

describe("Instagram DM Logger Security - Sensitive Credential Sanitization", () => {
  it("redacts exact 4-8 digit numeric OTPs and PINs", () => {
    expect(sanitizeDmMessageText("123456")).toBe("[REDACTED_OTP]");
    expect(sanitizeDmMessageText("  982143  ")).toBe("[REDACTED_OTP]");
    expect(sanitizeDmMessageText("4432")).toBe("[REDACTED_OTP]");
  });

  it("redacts credentials when session step is a sensitive password/OTP prompt", () => {
    expect(
      sanitizeDmMessageText("rahasiaKampus123!", { step: "jual_ask_password" })
    ).toBe("[REDACTED_CREDENTIAL]");

    expect(
      sanitizeDmMessageText("123456", { step: "jual_ask_otp" })
    ).toBe("[REDACTED_CREDENTIAL]");

    expect(
      sanitizeDmMessageText("myNewP@ssw0rd", { step: "jual_set_password" })
    ).toBe("[REDACTED_CREDENTIAL]");
  });

  it("redacts credentials when isSensitive flag is true in metadata", () => {
    expect(
      sanitizeDmMessageText("kombinasiRahasia", { isSensitive: true })
    ).toBe("[REDACTED_CREDENTIAL]");
  });

  it("masks embedded OTP / PIN phrases in messages", () => {
    expect(sanitizeDmMessageText("Kode OTP saya adalah 567890")).toBe(
      "Kode OTP saya adalah [REDACTED]"
    );
    expect(sanitizeDmMessageText("pin: 1234")).toBe("pin: [REDACTED]");
    expect(sanitizeDmMessageText("password 123456")).toBe("password [REDACTED]");
  });

  it("leaves standard conversational messages unredacted", () => {
    expect(sanitizeDmMessageText("Halo min mau jual laptop")).toBe(
      "Halo min mau jual laptop"
    );
    expect(sanitizeDmMessageText("Buku kalkulus edisi 9")).toBe(
      "Buku kalkulus edisi 9"
    );
    expect(sanitizeDmMessageText("batal")).toBe("batal");
  });

  it("returns null for null or empty text", () => {
    expect(sanitizeDmMessageText("")).toBeNull();
    expect(sanitizeDmMessageText(null)).toBeNull();
  });
});
