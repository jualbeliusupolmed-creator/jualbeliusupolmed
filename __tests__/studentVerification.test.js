import { describe, it, expect } from "vitest";
import {
  detectCampusFromEmail,
  resolveUniversityFromEmail,
  validateNim,
  getStudentBadge,
} from "@/lib/studentVerification";

describe("studentVerification helper", () => {
  describe("detectCampusFromEmail", () => {
    it("mendeteksi domain mahasiswa USU dengan benar", () => {
      expect(detectCampusFromEmail("budi@students.usu.ac.id")).toBe("USU");
      expect(detectCampusFromEmail("dosen@usu.ac.id")).toBe("USU");
      expect(detectCampusFromEmail("BUDI.SITOMPUL@STUDENTS.USU.AC.ID")).toBe("USU");
    });

    it("mendeteksi domain mahasiswa POLMED dengan benar", () => {
      expect(detectCampusFromEmail("ani@students.polmed.ac.id")).toBe("POLMED");
      expect(detectCampusFromEmail("staff@polmed.ac.id")).toBe("POLMED");
      expect(detectCampusFromEmail("ANI@POLMED.AC.ID")).toBe("POLMED");
    });

    it("menolak email umum atau bukan kampus target", () => {
      expect(detectCampusFromEmail("budi@gmail.com")).toBeNull();
      expect(detectCampusFromEmail("budi@yahoo.com")).toBeNull();
      expect(detectCampusFromEmail("budi@students.ui.ac.id")).toBeNull();
      expect(detectCampusFromEmail("")).toBeNull();
      expect(detectCampusFromEmail(null)).toBeNull();
    });
  });

  describe("resolveUniversityFromEmail", () => {
    const mockUniversities = [
      { id: "usu", code: "USU", name: "Universitas Sumatera Utara", email_domains: ["usu.ac.id"] },
      { id: "polmed", code: "POLMED", name: "Politeknik Negeri Medan", email_domains: ["polmed.ac.id"] },
      { id: "ui", code: "UI", name: "Universitas Indonesia", email_domains: ["ui.ac.id"] },
      { id: "inactive-univ", code: "INACT", status: "inactive", email_domains: ["inact.ac.id"] },
    ];

    it("resolves canonical university record from email", () => {
      const usu = resolveUniversityFromEmail("mhs@students.usu.ac.id", mockUniversities);
      expect(usu).not.toBeNull();
      expect(usu.id).toBe("usu");
      expect(usu.code).toBe("USU");

      const ui = resolveUniversityFromEmail("mahasiswa@ui.ac.id", mockUniversities);
      expect(ui).not.toBeNull();
      expect(ui.id).toBe("ui");
    });

    it("ignores inactive universities or unrelated emails", () => {
      expect(resolveUniversityFromEmail("user@inact.ac.id", mockUniversities)).toBeNull();
      expect(resolveUniversityFromEmail("user@gmail.com", mockUniversities)).toBeNull();
      expect(resolveUniversityFromEmail("", mockUniversities)).toBeNull();
    });
  });

  describe("validateNim", () => {
    it("menerima NIM yang sah", () => {
      const res = validateNim("211401001");
      expect(res.valid).toBe(true);
      expect(res.sanitized).toBe("211401001");
    });

    it("membersihkan spasi dan karakter khusus pada NIM", () => {
      const res = validateNim(" 211401-002 ");
      expect(res.valid).toBe(true);
      expect(res.sanitized).toBe("211401002");
    });

    it("menolak NIM yang terlalu pendek atau kosong", () => {
      expect(validateNim("").valid).toBe(false);
      expect(validateNim("123").valid).toBe(false);
      expect(validateNim(null).valid).toBe(false);
    });

    it("menolak NIM yang terlalu panjang", () => {
      expect(validateNim("1234567890123456789012").valid).toBe(false);
    });
  });

  describe("getStudentBadge", () => {
    it("mengembalikan null jika profil tidak memiliki centang biru", () => {
      expect(getStudentBadge(null)).toBeNull();
      expect(getStudentBadge({ student_verified: false })).toBeNull();
      expect(getStudentBadge({ student_verification_status: "pending" })).toBeNull();
    });

    it("menghasilkan badge untuk mahasiswa USU terverifikasi", () => {
      const badge = getStudentBadge({
        student_verified: true,
        student_campus: "USU",
      });
      expect(badge).not.toBeNull();
      expect(badge?.isVerified).toBe(true);
      expect(badge?.campus).toBe("USU");
      expect(badge?.badgeText).toBe("Mahasiswa USU");
    });

    it("menghasilkan badge untuk mahasiswa POLMED terverifikasi", () => {
      const badge = getStudentBadge({
        student_verification_status: "verified",
        student_campus: "POLMED",
      });
      expect(badge).not.toBeNull();
      expect(badge?.isVerified).toBe(true);
      expect(badge?.campus).toBe("POLMED");
      expect(badge?.badgeText).toBe("Mahasiswa POLMED");
    });
  });
});
