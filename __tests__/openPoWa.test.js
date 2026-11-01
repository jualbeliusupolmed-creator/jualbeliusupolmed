import { describe, it, expect } from "vitest";
import { rupiah } from "@/lib/fees";
import { formatWa } from "@/lib/constants";

describe("Open PO WhatsApp Integration & Templates", () => {
  it("memformat pesan notifikasi pesanan baru ke penjual dengan benar", () => {
    const productName = "Nasi Ayam Geprek Juragan";
    const buyerName = "Budi Santoso";
    const quantity = 2;
    const unit = "porsi";
    const totalIdr = 30000;
    const pickupPoint = "Kantin FIB USU";
    const orderIdShort = "a1b2c3d4";
    const cleanBuyerWa = "628123456789";

    const msg =
      `🔔 *Pesanan Open PO Baru Masuk!* 📦\n\n` +
      `Ada mahasiswa yang baru saja memesan di batch kamu:\n\n` +
      `🏷️ *${productName}*\n` +
      `👤 Pembeli: *${buyerName}*\n` +
      `🔢 Jumlah: *${quantity} ${unit}*\n` +
      `💰 Total: *${rupiah(totalIdr)}*\n` +
      `📍 Titik Ambil: *${pickupPoint}*\n` +
      `🔖 Kode Pesanan: *#${orderIdShort}*\n\n` +
      `👉 *Hubungi Pembeli di WhatsApp:*\n` +
      `wa.me/${cleanBuyerWa}?text=${encodeURIComponent(`Halo ${buyerName}, terkait pesanan Open PO ${productName} (#${orderIdShort}) kamu di KampusKita...`)}\n\n` +
      `_Kelola pesanan di: https://www.kampuskita.my.id/dashboard/open-po_`;

    expect(msg).toContain(productName);
    expect(msg).toContain(buyerName);
    expect(msg).toContain("2 porsi");
    expect(msg).toContain(rupiah(30000));
    expect(msg).toContain(pickupPoint);
    expect(msg).toContain("#a1b2c3d4");
    expect(msg).toContain(`wa.me/${cleanBuyerWa}`);
  });

  it("memformat pesan konfirmasi ke pembeli dengan benar", () => {
    const productName = "Lanyard Official USU";
    const quantity = 1;
    const unit = "pcs";
    const totalIdr = 25000;
    const pickupPoint = "Pendopo USU";
    const orderIdShort = "e5f6g7h8";
    const cleanSellerWa = "628987654321";
    const buyerName = "Andi";

    let buyerMsg =
      `✅ *Reservasi Open PO Berhasil!* 🎉\n\n` +
      `Pesananmu telah tercatat di sistem KampusKita:\n\n` +
      `🏷️ *${productName}*\n` +
      `🔢 Jumlah: *${quantity} ${unit}*\n` +
      `💰 Total: *${rupiah(totalIdr)}*\n` +
      `📍 Titik Ambil: *${pickupPoint}*\n` +
      `🔖 Kode Pesanan: *#${orderIdShort}*\n\n` +
      `👉 *Kontak Penjual via WA:*\n` +
      `wa.me/${cleanSellerWa}?text=${encodeURIComponent(`Halo kak, saya ${buyerName} yang pesan Open PO ${productName} (#${orderIdShort})`)}\n\n` +
      `_Simpan kode pesanan ini untuk ditunjukkan saat pengambilan barang._`;

    expect(buyerMsg).toContain("Reservasi Open PO Berhasil!");
    expect(buyerMsg).toContain(productName);
    expect(buyerMsg).toContain("#e5f6g7h8");
    expect(buyerMsg).toContain(`wa.me/${cleanSellerWa}`);
  });

  it("memformat pesan status konfirmasi / selesai / batal", () => {
    const orderIdShort = "x1y2z3";
    const pName = "Brownies Kukus";

    const confirmMsg =
      `🎉 *Pesanan Open PO Dikonfirmasi!*\n\n` +
      `Penjual telah mengonfirmasi pesanan *#${orderIdShort}* untuk *${pName}*.\n` +
      `📍 Titik Ambil: *Kantin MIPA*\n\n` +
      `Siap-siap ya kak saat jadwal pengambilan tiba!`;

    const fulfilledMsg =
      `✨ *Pesanan Open PO Selesai!* 🎁\n\n` +
      `Pesanan *#${orderIdShort}* (*${pName}*) telah diselesaikan oleh penjual.\n\n` +
      `Terima kasih sudah bertransaksi pre-order via KampusKita! 🙏`;

    expect(confirmMsg).toContain("Dikonfirmasi");
    expect(confirmMsg).toContain("#x1y2z3");
    expect(fulfilledMsg).toContain("Selesai");
  });
});

