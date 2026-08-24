"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AdminTemanActions({ profileId, isActive, displayName }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleToggleActive = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/teman", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: profileId, is_active: !isActive }),
      });
      if (!res.ok) throw new Error("Gagal memperbarui status");
      toast.success(`Profil ${displayName} berhasil di-${!isActive ? "aktifkan" : "nonaktifkan"}.`);
      router.refresh();
    } catch (e) {
      toast.error(e.message || "Gagal mengubah status");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Hapus profil ${displayName} permanen?`)) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/teman?id=${profileId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menghapus profil");
      toast.success(`Profil ${displayName} berhasil dihapus.`);
      router.refresh();
    } catch (e) {
      toast.error(e.message || "Gagal menghapus");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleToggleActive}
        disabled={loading}
        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50 ${
          isActive
            ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/50 dark:text-amber-300"
            : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
        }`}
      >
        {isActive ? "Nonaktifkan" : "Aktifkan"}
      </button>

      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 transition-all active:scale-95 disabled:opacity-50"
      >
        Hapus
      </button>
    </div>
  );
}
