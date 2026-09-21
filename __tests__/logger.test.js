import { describe, it, expect } from "vitest";
import { maskPhone, maskEmail, sanitizeLogData } from "@/lib/logger";

describe("logger privacy & sanitization", () => {
  it("menyensor nomor telepon dengan aman", () => {
    expect(maskPhone("08123456789")).toBe("0812***789");
    expect(maskPhone("Hubungi 082198765432 untuk COD")).toContain("0821***432");
    expect(maskPhone("6281234567890")).toBe("6281***890");
  });

  it("menyensor alamat email dengan aman", () => {
    expect(maskEmail("budi@gmail.com")).toBe("b***@gmail.com");
    expect(maskEmail("ridho@students.usu.ac.id")).toBe("r***@students.usu.ac.id");
  });

  it("menyensor kunci rahasia dalam objek", () => {
    const payload = {
      user_id: 123,
      email: "mahasiswa@usu.ac.id",
      wa: "08123456789",
      password: "SuperSecretPassword123!",
      pin: "123456",
      token: "jwt.token.here",
      nested: {
        api_key: "sk-live-12345",
        status: "active",
      },
    };

    const sanitized = sanitizeLogData(payload);
    expect(sanitized.password).toBe("[REDACTED]");
    expect(sanitized.pin).toBe("[REDACTED]");
    expect(sanitized.token).toBe("[REDACTED]");
    expect(sanitized.nested.api_key).toBe("[REDACTED]");
    expect(sanitized.email).toBe("m***@usu.ac.id");
    expect(sanitized.wa).toBe("0812***789");
    expect(sanitized.user_id).toBe(123);
  });
});
