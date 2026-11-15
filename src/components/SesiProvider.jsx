"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const KUNCI_WA = "seller_wa";
const KUNCI_NAMA = "seller_name";
const JEDA_PERPANJANG_SESI = 12 * 60 * 60 * 1000;

const SesiCtx = createContext(null);

function bacaCermin() {
  if (typeof window === "undefined") return { wa: "", nama: "" };
  try {
    return {
      wa: window.localStorage.getItem(KUNCI_WA) || "",
      nama: window.localStorage.getItem(KUNCI_NAMA) || "",
    };
  } catch {
    return { wa: "", nama: "" };
  }
}

function tulisCermin(wa, nama) {
  if (typeof window === "undefined") return;
  try {
    if (wa) window.localStorage.setItem(KUNCI_WA, wa);
    else window.localStorage.removeItem(KUNCI_WA);
    if (nama) window.localStorage.setItem(KUNCI_NAMA, nama);
    else if (!wa) window.localStorage.removeItem(KUNCI_NAMA);
  } catch {
  }
}

let janjiSesi = null;

function ambilSesi({ paksa = false } = {}) {
  if (paksa) janjiSesi = null;
  if (!janjiSesi) {
    janjiSesi = fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return janjiSesi;
}

export function SesiProvider({ children }) {
  const [sesi, setSesi] = useState({ wa: "", nama: "", siap: false, profil: null });

  const terapkan = useCallback((data) => {
    if (data?.loggedIn && data.wa) {
      const nama = data.name || bacaCermin().nama || "";
      tulisCermin(data.wa, nama);
      setSesi({ wa: data.wa, nama, siap: true, profil: data.profile || null });
    } else {
      tulisCermin("", "");
      setSesi({ wa: "", nama: "", siap: true, profil: null });
    }
  }, []);

  useEffect(() => {
    let hidup = true;
    let pemeriksaanTerakhir = Date.now();

    const cermin = bacaCermin();
    if (cermin.wa) {
      setSesi((prev) => (prev.siap ? prev : { ...prev, wa: cermin.wa, nama: cermin.nama }));
    }

    ambilSesi().then((d) => {
      if (hidup) terapkan(d);
    });

    const periksaLagiJikaPerlu = () => {
      if (
        document.visibilityState === "hidden" ||
        Date.now() - pemeriksaanTerakhir < JEDA_PERPANJANG_SESI
      ) {
        return;
      }

      pemeriksaanTerakhir = Date.now();
      ambilSesi({ paksa: true }).then((d) => {
        if (hidup && d) terapkan(d);
      });
    };

    const interval = window.setInterval(periksaLagiJikaPerlu, JEDA_PERPANJANG_SESI);
    document.addEventListener("visibilitychange", periksaLagiJikaPerlu);

    return () => {
      hidup = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", periksaLagiJikaPerlu);
    };
  }, [terapkan]);

  const segarkan = useCallback(async () => {
    const d = await ambilSesi({ paksa: true });
    terapkan(d);
    return d;
  }, [terapkan]);

  const tunggu = useCallback(async () => {
    const d = await ambilSesi();
    return d?.loggedIn && d.wa ? d.wa : "";
  }, []);

  const keluar = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    } finally {
      janjiSesi = null;
      tulisCermin("", "");
      setSesi({ wa: "", nama: "", siap: true, profil: null });
    }
  }, []);

  return (
    <SesiCtx.Provider value={{ ...sesi, masuk: segarkan, segarkan, keluar, tunggu }}>
      {children}
    </SesiCtx.Provider>
  );
}

export function useSesi() {
  return (
    useContext(SesiCtx) || {
      wa: "",
      nama: "",
      siap: true,
      profil: null,
      masuk: async () => null,
      segarkan: async () => null,
      keluar: async () => {},
      tunggu: async () => "",
    }
  );
}
