// QRIS EMV parser & dynamic QR builder
// Mengubah QRIS Statis menjadi Dinamis per transaksi dengan nominal unik

function crc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function parseQris(str) {
  const fields = {};
  let i = 0;
  while (i < str.length - 4) {
    const tag = str.substr(i, 2);
    const len = parseInt(str.substr(i + 2, 2), 10);
    const value = str.substr(i + 4, len);
    fields[tag] = value;
    i += 4 + len;
  }
  return fields;
}

function buildQris(fields) {
  const order = ["00", "01", "26", "51", "52", "53", "54", "58", "59", "60", "61", "62"];
  let result = "";
  for (const tag of order) {
    if (fields[tag] == null) continue;
    const val = String(fields[tag]);
    result += tag + val.length.toString().padStart(2, "0") + val;
  }
  result += "6304";
  result += crc16(result);
  return result;
}

/**
 * Buat QRIS dinamis dari QRIS statis dengan nominal unik.
 * @param {string} staticQris - QRIS string statis dari dashboard DANA
 * @param {number} baseAmount - nominal asli transaksi (Rp)
 * @param {string} orderId - order ID untuk referensi (max 20 karakter)
 * @returns {{ qrisString: string, finalAmount: number, suffix: number }}
 */
export function makeDynamicQris(staticQris, baseAmount, orderId) {
  const fields = parseQris(staticQris);

  // Ubah ke dinamis
  fields["01"] = "12";

  // Nominal unik: tambah 0-99 acak agar setiap transaksi bisa dibedakan
  const suffix = Math.floor(Math.random() * 100);
  const finalAmount = baseAmount + suffix;
  fields["54"] = String(finalAmount);

  // Referensi order di tag 62 subtag 05
  const ref = orderId.replace(/[^A-Za-z0-9]/g, "").slice(0, 20);
  fields["62"] = "05" + ref.length.toString().padStart(2, "0") + ref;

  return {
    qrisString: buildQris(fields),
    finalAmount,
    suffix,
  };
}
