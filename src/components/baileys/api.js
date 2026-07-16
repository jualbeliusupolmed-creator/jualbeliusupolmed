"use client";
import { useState, useCallback, useEffect } from "react";

// Endpoint yang BELUM diimplementasi di bot (wa-bot-usu). Dicegat di sini agar tombol
// panel menampilkan pesan jelas "belum tersedia", bukan error 404 yang membingungkan.
// Hapus dari daftar ini begitu route-nya sudah ada di bot.
const UNSUPPORTED = new Set([
  "session/devices",
  "community/list", "community/create", "community/link-group",
  "check-number", "get-presence", "set-privacy",
  "test-ai", "send-raw", "channel/send",
]);
const NOT_READY = { error: "Fitur ini belum tersedia di bot (belum diimplementasi)." };
const epBase = (ep) => String(ep).split("?")[0];

export function useApi(endpoint, autoFetch = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch_ = useCallback(async () => {
    if (UNSUPPORTED.has(epBase(endpoint))) { setError(NOT_READY.error); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/baileys?endpoint=${encodeURIComponent(endpoint)}&_t=${Date.now()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      setData(json);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [endpoint]);

  useEffect(() => { if (autoFetch) fetch_(); }, [fetch_, autoFetch]);
  return { data, loading, error, refetch: fetch_ };
}

export async function apiPost(endpoint, body = {}) {
  if (UNSUPPORTED.has(epBase(endpoint))) return NOT_READY;
  const res = await fetch(`/api/admin/baileys?endpoint=${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function apiDelete(endpoint, body = {}) {
  if (UNSUPPORTED.has(epBase(endpoint))) return NOT_READY;
  const res = await fetch(`/api/admin/baileys?endpoint=${endpoint}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Konversi input nomor ke JID Baileys (628xxx@s.whatsapp.net)
// Menerima: 628xxx, 08xxx, 8xxx — menolak: nomor acak
export function normalizeJid(input) {
  if (!input) return "";
  if (input.includes("@")) return input; // sudah JID
  let num = input.replace(/[^0-9]/g, "");
  // Normalisasi ke 628xxx
  if (num.startsWith("62")) {
    // sudah format internasional, pastikan digit ke-3 adalah 8
    if (!num.startsWith("628")) return "";
  } else if (num.startsWith("08")) {
    num = "62" + num.slice(1);
  } else if (num.startsWith("8")) {
    num = "62" + num;
  } else {
    return ""; // bukan nomor Indonesia
  }
  // Panjang wajar: 628 + 8–11 digit = 11–14 karakter total
  if (num.length < 11 || num.length > 14) return "";
  return num + "@s.whatsapp.net";
}
