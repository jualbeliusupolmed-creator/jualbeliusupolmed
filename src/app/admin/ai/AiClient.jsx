"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AIPanel from "../AIPanel";

export default function AiClient({ settings = {} }) {
  const router = useRouter();
  const [toast, setToast] = useState(null);

  async function action(body, okMsg) {
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
    }
  }

  return (
    <div>
      {toast && <div className={`g-toast${toast.type === "err" ? " is-bad" : ""}`}>{toast.msg}</div>}
      <AIPanel settings={settings} action={action} />
    </div>
  );
}
