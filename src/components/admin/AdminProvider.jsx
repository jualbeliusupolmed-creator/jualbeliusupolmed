"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";
import { useModeDemo } from "./basis";

const AdminContext = createContext();

export function AdminProvider({ children }) {
  const router = useRouter();
  const demo = useModeDemo();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function action(body, okMsg) {
    // Di /admin-demo tombolnya tetap ada, tetap bisa ditekan, dan tetap
    // memberi tahu apa yang AKAN terjadi — tapi tidak ada permintaan yang
    // dikirim. Dua lapis, dan yang ini yang pertama: rutenya sendiri tetap
    // menuntut isAdmin(), jadi seandainya lapisan ini bocor pun tidak ada yang
    // berubah di database.
    if (demo) {
      setToast({ type: "err", msg: `Panel demo — "${okMsg || "aksi ini"}" tidak dijalankan.` });
      return false;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Aksi gagal");
      if (data.warning) setToast({ type: "err", msg: data.warning });
      else setToast({ type: "ok", msg: okMsg || "Berhasil" });
      router.refresh();
      return true;
    } catch (e) {
      setToast({ type: "err", msg: e.message });
      return false;
    } finally {
      setBusy(false);
    }
  }

  function confirmThen(opts, fn) {
    setConfirmState({ ...opts, onConfirm: fn });
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.refresh();
  }

  return (
    <AdminContext.Provider value={{ busy, action, confirmThen, logout, setToast, demo }}>
      {children}
      
      <ConfirmModal
        open={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        danger={confirmState?.danger}
        confirmLabel={confirmState?.confirmLabel}
        onConfirm={() => confirmState?.onConfirm?.()}
        onClose={() => setConfirmState(null)}
      />

      {/* Roti bakar Google: kotak gelap di KIRI bawah, bukan kanan — di sana
          ia tidak menutupi tombol aksi yang biasanya duduk di kanan bawah. */}
      {toast && <div className={`g-toast${toast.type === "err" ? " is-bad" : ""}`}>{toast.msg}</div>}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
