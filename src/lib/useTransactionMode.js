"use client";

import { useEffect, useState } from "react";

let globalMode = null; // in-memory cache
const listeners = new Set();

function notify(mode) {
  globalMode = mode;
  listeners.forEach((fn) => fn(mode));
}

/**
 * Hook untuk membaca mode transaksi aktif ('in_app_chat' atau 'whatsapp').
 * Otomatis sinkron antar komponen saat mode diubah.
 */
export function useTransactionMode() {
  const [mode, setMode] = useState(globalMode || "in_app_chat");
  const [loading, setLoading] = useState(globalMode === null);

  useEffect(() => {
    let mounted = true;

    const handler = (newMode) => {
      if (mounted) {
        setMode(newMode);
        setLoading(false);
      }
    };
    listeners.add(handler);

    if (globalMode === null) {
      fetch("/api/settings/transaction-mode")
        .then((res) => res.json())
        .then((data) => {
          if (mounted && data?.mode) {
            notify(data.mode);
          }
        })
        .catch(() => {
          if (mounted) {
            notify("in_app_chat");
          }
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    } else {
      setMode(globalMode);
      setLoading(false);
    }

    return () => {
      mounted = false;
      listeners.delete(handler);
    };
  }, []);

  const setTransactionMode = async (newMode) => {
    try {
      const res = await fetch("/api/settings/transaction-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah mode");
      notify(newMode);
      return data;
    } catch (err) {
      throw err;
    }
  };

  return {
    mode,
    isWaMode: mode === "whatsapp",
    isChatMode: mode === "in_app_chat",
    loading,
    setTransactionMode,
  };
}
