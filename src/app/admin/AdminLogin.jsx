"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Tidak dapat masuk.");
      router.replace("/admin/overview");
      router.refresh();
    } catch (cause) {
      setError(cause.message || "Koneksi gagal. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6faf8] px-4 py-10 text-slate-950">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-lime-100 blur-3xl" />
      <section className="relative w-full max-w-md rounded-[28px] border border-white bg-white/95 p-7 shadow-[0_24px_80px_-35px_rgba(15,80,59,.3)] sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-800 text-white shadow-lg shadow-emerald-900/20">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" />
              <path d="M8 12h8M12 8v8" />
            </svg>
          </span>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[.17em] text-emerald-800">Jual Beli USU · POLMED</p>
            <h1 className="text-xl font-black tracking-tight">Masuk ke panel admin</h1>
          </div>
        </div>
        <p className="mb-6 text-sm leading-relaxed text-slate-500">Gunakan akun admin atau owner yang aksesnya sudah diberikan.</p>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-xs font-bold text-slate-700">
            Email akun
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              placeholder="nama@contoh.com"
            />
          </label>
          <label className="block text-xs font-bold text-slate-700">
            Kata sandi
            <div className="relative mt-1.5">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-12 text-sm font-medium outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                placeholder="Kata sandi akun"
              />
              <button
                type="button"
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-1 grid w-11 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </label>
          {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold leading-relaxed text-rose-700">{error}</p> : null}
          <button disabled={busy} className="flex min-h-12 w-full items-center justify-center rounded-full bg-emerald-800 px-5 text-sm font-extrabold text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60">
            {busy ? "Memeriksa akun…" : "Masuk ke workspace"}
          </button>
        </form>
        <Link href="/" className="mt-6 inline-flex min-h-10 items-center text-xs font-bold text-slate-500 transition hover:text-emerald-800">← Kembali ke beranda</Link>
      </section>
    </main>
  );
}
