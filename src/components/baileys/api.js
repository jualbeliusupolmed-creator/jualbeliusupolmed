"use client";
import { useState, useCallback, useEffect } from "react";

export function useApi(endpoint, autoFetch = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch_ = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/baileys?endpoint=${endpoint}&_t=${Date.now()}`);
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
  const res = await fetch(`/api/admin/baileys?endpoint=${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function apiDelete(endpoint, body = {}) {
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
