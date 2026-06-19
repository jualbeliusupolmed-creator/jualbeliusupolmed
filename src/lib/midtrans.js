import QRCode from 'qrcode';

// Fungsi untuk menghitung CRC-16 (CCITT) untuk QRIS
function crc16(str) {
  let crc = 0xFFFF;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  let hex = (crc & 0xFFFF).toString(16).toUpperCase();
  return hex.padStart(4, '0');
}

export async function createQrisTransaction({
  orderId,
  amount,
  customerName,
  customerWa,
  itemName,
}) {
  // BYPASS MIDTRANS SECARA TOTAL
  // Kita menggunakan string raw QRIS Statis Anda dan menginjeksi nominal ke dalamnya 
  // agar berubah menjadi QRIS Dinamis yang terisi otomatis saat di-scan!

  const RAW_QRIS = "00020101021126570011ID.DANA.WWW011893600915398927140902099892714090303UMI51440014ID.CO.QRIS.WWW0215ID10254318141650303UMI5204504553033605802ID5916Usaha Biiznillah6010Kota Medan6105201536304F974";

  // 1. Buang CRC lama di akhir string (4 karakter)
  let noCrc = RAW_QRIS.slice(0, -4);
  
  // 2. Ubah tipe dari Statis (010211) menjadi Dinamis (010212)
  let dynamicBase = noCrc.replace("010211", "010212");
  
  // 3. Buang penanda CRC (6304) di akhir string sementara
  let before6304 = dynamicBase.slice(0, -4);
  
  // 4. Siapkan format Nominal (Tag 54) -> 54 + Panjang Karakter Nominal + Nominal
  let amountStr = Math.round(amount).toString();
  let tag54 = "54" + amountStr.length.toString().padStart(2, '0') + amountStr;
  
  // 5. Gabungkan kembali: Base + Tag 54 + Penanda CRC (6304)
  let newPayload = before6304 + tag54 + "6304";
  
  // 6. Hitung ulang CRC dan gabungkan
  let finalQrisString = newPayload + crc16(newPayload);

  // 7. Ubah Teks QRIS Dinamis menjadi Gambar (Base64 Data URI)
  const dataUrl = await QRCode.toDataURL(finalQrisString, { 
    width: 500, 
    margin: 2,
    color: {
      dark: '#000000',  // Hitam
      light: '#ffffff' // Putih
    }
  });

  return {
    token: orderId,
    redirect_url: dataUrl, // Gambar QRIS Dinamis langsung dirender di browser
    order_id: orderId,
    qr_string: finalQrisString 
  };
}
