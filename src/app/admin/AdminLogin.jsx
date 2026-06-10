"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setErr("Password salah.");
  }

  return (
    <div className="mx-auto grid min-h-[60vh] max-w-sm place-items-center px-4">
      <form onSubmit={login} className="card w-full p-6">
        <div className="mb-4 text-center">
          <span className="grid mx-auto h-12 w-12 place-items-center rounded-2xl bg-primary text-white">
            🔒
          </span>
          <h1 className="mt-3 text-xl font-extrabold">Admin Panel</h1>
          <p className="text-sm text-gray-500">Masuk untuk mengelola marketplace</p>
        </div>
        <label className="label">Password</label>
        <input
          type="password"
          className="input"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="••••••••"
          autoFocus
        />
        {err && <p className="mt-2 text-sm text-rose-600">{err}</p>}
        <button disabled={busy} className="btn-primary mt-4 w-full">
          {busy ? "Memeriksa…" : "Masuk"}
        </button>
      </form>
    </div>
  );
}
