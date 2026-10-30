"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function AccountAccessMethods({ profil }) {
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [googleOtp, setGoogleOtp] = useState("");
  const [googleOtpSent, setGoogleOtpSent] = useState(false);
  const hasWhatsApp = !profil?.peran?.tanpaNomor;
  const isGoogleOnly =
    !hasWhatsApp &&
    (profil?.auth_provider === "google" || String(profil?.wa || "").startsWith("google_"));
  const googleEmail = profil?.email_google || (isGoogleOnly ? "Akun Google" : "");

  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get("google_link");
    if (!result) return;

    if (result === "success") toast.success("Akun Google berhasil ditautkan ke profil ini.");
    else if (result === "merge_conflict") {
      toast.error("Akun tidak dapat digabung otomatis karena ada data atau PIN yang berbeda. Hubungi bantuan.");
    } else {
      toast.error("Penautan Google tidak selesai. Sesi WhatsApp tetap aman; coba tautkan kembali.");
    }

    url.searchParams.delete("google_link");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  async function connectGoogle() {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/google-link/send-otp", { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Kode verifikasi gagal dikirim.");
      setGoogleOtpSent(true);
      toast.success("Kode verifikasi WhatsApp dikirim.");
    } catch (error) {
      toast.error(error.message || "Kode verifikasi gagal dikirim.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyAndConnectGoogle() {
    setBusy(true);
    try {
      const verification = await fetch("/api/auth/google-link/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: googleOtp }),
      });
      const verificationResult = await verification.json().catch(() => ({}));
      if (!verification.ok) {
        throw new Error(verificationResult.error || "Kode verifikasi WhatsApp tidak valid.");
      }

      const response = await fetch("/api/auth/google-link/start", { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Tidak dapat menyiapkan tautan Google.");
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?link_google=1`,
          queryParams: { access_type: "offline", prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error.message || "Gagal memverifikasi WhatsApp.");
      setBusy(false);
    }
  }

  async function requestPhoneCode() {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/phone-link/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wa: phone }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Kode verifikasi gagal dikirim.");
      setOtpSent(true);
      toast.success("Kode verifikasi dikirim ke WhatsApp.");
    } catch (error) {
      toast.error(error.message || "Kode verifikasi gagal dikirim.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyPhoneCode() {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/phone-link/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wa: phone, otp }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "WhatsApp belum dapat ditautkan.");
      toast.success("WhatsApp berhasil ditautkan ke profil ini.");
      window.location.reload();
    } catch (error) {
      toast.error(error.message || "WhatsApp belum dapat ditautkan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Kartu
      judul="Metode masuk"
      catatan="Gunakan WhatsApp, Google, atau keduanya untuk masuk ke profil yang sama."
    >
      <div className="divide-y divide-black/[0.05] dark:divide-white/[0.08]">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Icon.MessageCircle className="h-4 w-4 shrink-0 text-emerald-700" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white">WhatsApp</p>
              <p className="truncate text-[11px] text-gray-500 dark:text-slate-400">
                {hasWhatsApp ? profil?.nomor || profil?.wa : "Belum terhubung"}
              </p>
            </div>
          </div>
          <span className="shrink-0 text-[11px] font-semibold text-gray-500 dark:text-slate-400">
            {hasWhatsApp ? "Aktif" : "Tidak ditautkan"}
          </span>
        </div>

        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Icon.Mail className="h-4 w-4 shrink-0 text-blue-600" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white">Google</p>
              <p className="truncate text-[11px] text-gray-500 dark:text-slate-400">
                {googleEmail || "Belum terhubung"}
              </p>
            </div>
          </div>
          {hasWhatsApp && !googleEmail && !googleOtpSent ? (
            <button
              type="button"
              onClick={connectGoogle}
              disabled={busy}
              className="shrink-0 rounded-full border border-black/[0.08] px-4 py-2 text-xs font-bold text-[#1d1d1f] transition-colors hover:bg-black/[0.03] disabled:opacity-50 dark:border-white/[0.12] dark:text-white dark:hover:bg-white/[0.06]"
            >
              {busy ? "Mengirim kode..." : "Kirim kode verifikasi"}
            </button>
          ) : hasWhatsApp && !googleEmail ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={googleOtp}
                onChange={(event) => setGoogleOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Kode OTP WhatsApp"
                aria-label="Kode OTP WhatsApp untuk menautkan Google"
                className="min-w-0 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-emerald-600 dark:border-white/10 dark:bg-[#1c1c1e] dark:text-white"
                disabled={busy}
              />
              <button
                type="button"
                onClick={verifyAndConnectGoogle}
                disabled={busy || googleOtp.length !== 6}
                className="shrink-0 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {busy ? "Memverifikasi..." : "Verifikasi & hubungkan"}
              </button>
              <button
                type="button"
                onClick={connectGoogle}
                disabled={busy}
                className="shrink-0 px-2 py-2 text-[11px] font-semibold text-emerald-700 hover:underline disabled:opacity-50 dark:text-emerald-400"
              >
                Kirim ulang
              </button>
            </div>
          ) : (
            <span className="shrink-0 text-[11px] font-semibold text-gray-500 dark:text-slate-400">
              {googleEmail ? "Aktif" : "Masuk dengan Google"}
            </span>
          )}
        </div>
      </div>
      {!hasWhatsApp && isGoogleOnly && (
        <div className="space-y-2 border-t border-black/[0.05] bg-gray-50/70 px-4 py-3 dark:border-white/[0.08] dark:bg-black/10">
          <p className="text-[11px] leading-relaxed text-gray-500 dark:text-slate-400">
            Masukkan nomor dan kode OTP. Jika nomor memiliki profil lama, data kedua akun akan disatukan ke profil WhatsApp; Google tetap menjadi metode masuk.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                setOtpSent(false);
                setOtp("");
              }}
              placeholder="Nomor WhatsApp (08...)"
              aria-label="Nomor WhatsApp"
              className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-emerald-600 dark:border-white/10 dark:bg-[#1c1c1e] dark:text-white"
              disabled={busy}
            />
            {!otpSent ? (
              <button
                type="button"
                onClick={requestPhoneCode}
                disabled={busy || !phone.trim()}
                className="shrink-0 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {busy ? "Mengirim..." : "Kirim kode"}
              </button>
            ) : (
              <>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Kode 6 digit"
                  aria-label="Kode verifikasi WhatsApp"
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-emerald-600 dark:border-white/10 dark:bg-[#1c1c1e] dark:text-white sm:w-32"
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={verifyPhoneCode}
                  disabled={busy || otp.length !== 6}
                  className="shrink-0 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  {busy ? "Memverifikasi..." : "Verifikasi"}
                </button>
              </>
            )}
          </div>
          {otpSent && (
            <button
              type="button"
              onClick={requestPhoneCode}
              disabled={busy}
              className="text-left text-[11px] font-semibold text-emerald-700 hover:underline disabled:opacity-50 dark:text-emerald-400"
            >
              Kirim ulang kode
            </button>
          )}
        </div>
      )}
    </Kartu>
  );
}

function Kartu({ judul, catatan, children }) {
  return (
    <section className="space-y-2">
      <div className="px-1">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-[#86868b] dark:text-slate-400">
          {judul}
        </h3>
        <p className="mt-0.5 text-[11px] leading-relaxed text-gray-400 dark:text-slate-500">{catatan}</p>
      </div>
      <div className="overflow-hidden rounded-[12px] border border-black/[0.05] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] dark:border-white/[0.08] dark:bg-[#1c1c1e]">
        {children}
      </div>
    </section>
  );
}
