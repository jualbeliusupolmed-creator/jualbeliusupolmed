// Migrasi identitas user dari key LID (@lid) → nomor HP asli (08xxx).
// Dipakai oleh:
//  - webhook bot (src/app/api/wa/baileys/route.js): migrasi 1 LID saat nomornya baru diketahui.
//  - endpoint admin (src/app/api/admin/migrate-lid): pembersihan massal seluruh data lama.
// Semua langkah best-effort & idempotent — nomor jadi satu-satunya identitas user-facing,
// LID cuma tinggal di backend (wa_state) tanpa pernah tampil ke user.
import { formatWa } from "@/lib/constants";

const swallow = (p) => p.then((r) => r, (e) => ({ error: e }));

// Kolom identitas user di seluruh tabel.
const IDENT_TABLES = [
  ["listings", "seller_wa"],
  ["seller_ratings", "seller_wa"],
  ["price_offers", "buyer_wa"],
  ["wanted_listings", "buyer_wa"],
  ["category_subscriptions", "buyer_wa"],
  ["distributor_categories", "seller_wa"],
  ["profile_change_requests", "seller_wa"],
  ["group_posts", "sender_wa"],
  ["wa_conversations", "wa"],
  ["wa_drafts", "wa"],
  ["seller_profiles", "wa"],
];

// Pindahkan SATU lidDigits → phoneWa di semua tabel. Aman diulang (idempotent).
export async function migrateLidToPhone(supa, lidDigits, phoneWa) {
  if (!lidDigits || !phoneWa || lidDigits === phoneWa) return;
  // 1. Tabel anak yang TIDAK terikat FK ke seller_profiles → aman dipindah kapan saja.
  const freeMoves = [
    ["seller_ratings", "seller_wa"],
    ["price_offers", "buyer_wa"],
    ["wanted_listings", "buyer_wa"],
    ["category_subscriptions", "buyer_wa"],
    ["profile_change_requests", "seller_wa"],
    ["group_posts", "sender_wa"],
    ["wa_conversations", "wa"],
    ["wa_drafts", "wa"],
  ];
  for (const [t, c] of freeMoves) {
    await swallow(supa.from(t).update({ [c]: phoneWa }).eq(c, lidDigits));
  }

  // 2. Profil penjual + tabel ber-FK (listings, distributor_categories).
  const { data: lidProf } = await supa.from("seller_profiles").select("*").eq("wa", lidDigits).maybeSingle();
  const { data: phoneProf } = await supa.from("seller_profiles").select("wa").eq("wa", phoneWa).maybeSingle();
  if (lidProf && !phoneProf) {
    // Rename PK: listings.seller_wa ikut otomatis via ON UPDATE CASCADE.
    const { error } = await supa.from("seller_profiles").update({ wa: phoneWa }).eq("wa", lidDigits);
    if (error) {
      // Fallback bila ada FK tanpa cascade (mis. distributor_categories):
      // buat baris nomor (tanpa referral_code agar tak bentrok unique), pindahkan anak, hapus lama.
      const { wa: _w, referral_code: _r, created_at: _c, ...rest } = lidProf;
      await swallow(supa.from("seller_profiles").insert({ ...rest, wa: phoneWa }));
      await swallow(supa.from("listings").update({ seller_wa: phoneWa }).eq("seller_wa", lidDigits));
      await swallow(supa.from("distributor_categories").update({ seller_wa: phoneWa }).eq("seller_wa", lidDigits));
      await swallow(supa.from("seller_profiles").delete().eq("wa", lidDigits));
    }
  } else {
    // Nomor sudah punya profil (atau tak ada profil sama sekali) → cukup repoint anak ber-FK.
    await swallow(supa.from("listings").update({ seller_wa: phoneWa }).eq("seller_wa", lidDigits));
    await swallow(supa.from("distributor_categories").update({ seller_wa: phoneWa }).eq("seller_wa", lidDigits));
    if (lidProf) await swallow(supa.from("seller_profiles").delete().eq("wa", lidDigits));
  }
}

// Baca peta lid→nomor dari wa_state (semua session_id), kembalikan Map<lidDigits, phone08>.
export async function loadLidPhoneMap(supa) {
  const map = new Map();
  const { data } = await supa.from("wa_state").select("data").eq("key", "lid_resolution_map");
  for (const row of data || []) {
    for (const [lidJid, phoneJid] of Object.entries(row?.data || {})) {
      const lidDigits = String(lidJid).split("@")[0].replace(/:\d+$/, "");
      const phone = formatWa(phoneJid);
      if (phone) map.set(lidDigits, phone);
    }
  }
  return map;
}

// Pindai seluruh tabel → temukan nilai identitas yang masih LID (formatWa gagal),
// klasifikasi convertible (punya nomor di peta) vs unresolved (belum tahu nomornya).
export async function scanLidRows(supa) {
  const lid2phone = await loadLidPhoneMap(supa);
  const bad = new Map(); // lidDigits → { hits:{table:count}, convertible, phone }
  const perTable = {};
  for (const [table, col] of IDENT_TABLES) {
    // Kandidat = nilai yang tak diawali '0' (nomor valid selalu 08xxx). Kurangi data ditarik.
    const { data, error } = await supa.from(table).select(col).not(col, "like", "0%").limit(50000);
    if (error) { perTable[table] = { error: error.message }; continue; }
    let rows = 0;
    for (const r of data || []) {
      const v = r[col];
      if (!v || formatWa(v) !== "") continue; // nomor valid / kosong → lewati
      const digits = String(v).split("@")[0].replace(/:\d+$/, "");
      rows++;
      const rec = bad.get(digits) || { hits: {} };
      rec.hits[table] = (rec.hits[table] || 0) + 1;
      rec.convertible = lid2phone.has(digits);
      rec.phone = lid2phone.get(digits) || null;
      bad.set(digits, rec);
    }
    perTable[table] = { badRows: rows };
  }
  const list = [...bad.entries()].map(([digits, r]) => ({ digits, ...r }));
  return {
    mapSize: lid2phone.size,
    perTable,
    total: list.length,
    convertible: list.filter((x) => x.convertible),
    unresolved: list.filter((x) => !x.convertible),
  };
}

// Pindai + (opsional) eksekusi migrasi semua LID yang punya nomor. Kembalikan laporan.
export async function cleanupAllLids(supa, { apply = false } = {}) {
  const scan = await scanLidRows(supa);
  const report = {
    applied: apply,
    lidMapSize: scan.mapSize,
    totalLidUnik: scan.total,
    bisaDimigrasi: scan.convertible.length,
    belumAdaNomor: scan.unresolved.length,
    perTable: scan.perTable,
    contohBelumAdaNomor: scan.unresolved.slice(0, 20).map((x) => ({ lid: x.digits, di: x.hits })),
    contohMigrasi: scan.convertible.slice(0, 20).map((x) => ({ lid: x.digits, nomor: x.phone })),
  };
  if (!apply) return report;

  let ok = 0, fail = 0;
  for (const item of scan.convertible) {
    try { await migrateLidToPhone(supa, item.digits, item.phone); ok++; }
    catch (e) { fail++; }
  }
  return { ...report, migrasiSukses: ok, migrasiGagal: fail };
}
