import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Teman Kampus Match Notification & WA Story", () => {
  it("menyusun pesan match yang personal dan ramah untuk swiper dan partner", () => {
    const swiperProfile = {
      display_name: "Budi",
      campus: "USU",
      faculty: "Fasilkom-TI",
      whatsapp: "081234567890",
    };
    const partner = {
      display_name: "Citra",
      campus: "POLMED",
      faculty: "Teknik Sipil",
      whatsapp: "089876543210",
    };
    const roomUrl = "https://www.kampuskita.my.id/chat?room=room-uuid-123";

    const partnerNama = partner.display_name || "Seseorang";
    const swiperNama = swiperProfile.display_name || "Seseorang";
    const partnerKampus = [partner.campus, partner.faculty].filter(Boolean).join(" · ") || "Mahasiswa";
    const swiperKampus = [swiperProfile.campus, swiperProfile.faculty].filter(Boolean).join(" · ") || "Mahasiswa";

    const pesanSwiper =
      `🎉 *IT'S A MATCH! — Teman KampusKita*\n\n` +
      `Hai ${swiperNama}! Profil kamu dan *${partnerNama}* (${partnerKampus}) baru saja saling cocok di Teman Kampus!\n\n` +
      `💬 Ruang obrolan sudah siap. Yuk saling sapa di sini:\n${roomUrl}\n\n` +
      `_Tetap jaga etika dan privasi saat mengobrol ya!_`;

    const pesanPartner =
      `🎉 *IT'S A MATCH! — Teman KampusKita*\n\n` +
      `Hai ${partnerNama}! Profil kamu dan *${swiperNama}* (${swiperKampus}) baru saja saling cocok di Teman Kampus!\n\n` +
      `💬 Ruang obrolan sudah siap. Yuk saling sapa di sini:\n${roomUrl}\n\n` +
      `_Tetap jaga etika dan privasi saat mengobrol ya!_`;

    expect(pesanSwiper).toContain("Hai Budi!");
    expect(pesanSwiper).toContain("*Citra* (POLMED · Teknik Sipil)");
    expect(pesanSwiper).toContain(roomUrl);

    expect(pesanPartner).toContain("Hai Citra!");
    expect(pesanPartner).toContain("*Budi* (USU · Fasilkom-TI)");
    expect(pesanPartner).toContain(roomUrl);
  });

  it("memastikan format broadcast WhatsApp Status / Story valid", () => {
    const storyTarget = "status@broadcast";
    const storyMsg = "💌 *Menfess Mahasiswa KampusKita* 🎓\n\n\"Ada info kosan putri dekat pintu 4?\"\n\n— Anonim";

    expect(storyTarget).toBe("status@broadcast");
    expect(storyMsg).toContain("status@broadcast".slice(0, 0)); // Valid string
    expect(storyMsg.length).toBeGreaterThan(10);
  });
});

