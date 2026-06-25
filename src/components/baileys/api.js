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

export function normalizeJid(input) {
  if (!input) return "";
  if (input.includes("@")) return input;
  let num = input.replace(/[^0-9]/g, "");
  if (num.startsWith("0")) num = "62" + num.slice(1);
  return num + "@s.whatsapp.net";
}
