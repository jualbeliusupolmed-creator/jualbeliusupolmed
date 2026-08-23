"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLogin() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(e) {
    e.preventDefault();
    if (!pw) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setErr(data.error || "Kata sandi salah. Coba lagi.");
      }
    } catch {
      setErr("Koneksi gagal. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      {/* Subtle Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-400/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl p-7 sm:p-8 shadow-2xl shadow-slate-200/50 dark:shadow-none">
          
          {/* Brand Header */}
          <div className="mb-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 dark:from-white dark:to-slate-200 text-white dark:text-slate-900 mx-auto flex items-center justify-center shadow-lg shadow-slate-900/10 mb-3">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Admin Console
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Kampusfess Marketplace &amp; Media Komunitas USU-POLMED
            </p>
          </div>

          {/* Form */}
          <form onSubmit={login} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Kata Sandi Admin
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={(e) => {
                    setPw(e.target.value);
                    if (err) setErr("");
                  }}
                  placeholder="Masukkan password admin..."
                  autoFocus
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white dark:focus:bg-slate-800 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  tabIndex={-1}
                  aria-label={showPw ? "Sembunyikan" : "Tampilkan"}
                >
                  {showPw ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {err && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{err}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !pw}
              className="flex w-full items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 active:scale-98 transition-all disabled:opacity-50"
            >
              {busy ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Memeriksa…
                </span>
              ) : (
                "Masuk ke Admin Console"
              )}
            </button>
          </form>
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/"
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            ← Kembali ke Halaman Utama
          </Link>
        </div>
      </div>
    </div>
  );
}
