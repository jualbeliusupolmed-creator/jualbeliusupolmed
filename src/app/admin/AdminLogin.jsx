"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-7 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h1 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-white">
                Admin Console
              </h1>
            </div>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-neutral-400">
              Marketplace USU & POLMED
            </p>
          </div>

          {/* Form */}
          <form onSubmit={login} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-neutral-300">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={(e) => {
                    setPw(e.target.value);
                    if (err) setErr("");
                  }}
                  placeholder="Masukkan kata sandi..."
                  autoFocus
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition placeholder:text-gray-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-white dark:focus:ring-white pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600 dark:text-neutral-400 dark:hover:text-neutral-200"
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
              <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              className="flex w-full items-center justify-center rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {busy ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Memeriksa...
                </span>
              ) : (
                "Masuk"
              )}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <a
            href="/"
            className="text-xs text-gray-500 transition hover:text-gray-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            ← Kembali ke Marketplace
          </a>
        </div>
      </div>
    </div>
  );
}


