"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";

const AdminContext = createContext();

export function AdminProvider({ children }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function action(body, okMsg) {
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
    <AdminContext.Provider value={{ busy, action, confirmThen, logout, setToast }}>
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

      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-[60] rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === "err" ? "bg-rose-600" : "bg-gray-900 dark:bg-emerald-600"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
