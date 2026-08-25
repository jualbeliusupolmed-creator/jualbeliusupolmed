import { useState, useEffect } from "react";
import { Icon } from "./Icons";
import { PIN_MIN, PIN_MAX, validasiPin } from "@/lib/pinRules";
import { getSupabase } from "@/lib/supabase";

const KELAS_INPUT =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-gray-400 focus:outline-none " +
  "focus:ring-2 focus:ring-gray-900/5 dark:focus:border-slate-500 dark:border-slate-700 " +
  "dark:bg-slate-800 dark:text-white";

// Sandi boleh berisi huruf sekarang, dan sandi berhuruf yang diketik buta di
// keyboard HP itu sumber salah ketik yang tidak kelihatan. Satu tombol lihat/
// sembunyi jauh lebih murah daripada satu akun yang tidak bisa dimasuki.
function KolomSandi({ nilai, onChange, placeholder, autoFocus = false, autoComplete = "current-password" }) {
  const [terlihat, setTerlihat] = useState(false);
  return (
    <div className="relative">
      <input
        type={terlihat ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={nilai}
        onChange={(e) => onChange(e.target.value)}
        className={`${KELAS_INPUT} pr-16`}
        maxLength={PIN_MAX}
        autoFocus={autoFocus}
        required
      />
      <button
        type="button"
        onClick={() => setTerlihat((v) => !v)}
        aria-label={terlihat ? "Sembunyikan sandi" : "Tampilkan sandi"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        {terlihat ? "Sembunyi" : "Lihat"}
      </button>
    </div>
  );
}

export default function OTPModal({ isOpen, onClose, onSuccess, initialWa = "" }) {
  const [loginMode, setLoginMode] = useState("wa"); // "wa" | "email"

  // WA States
  const [wa, setWa] = useState("");
  const [referral, setReferral] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  // 1: nomor WA · 2: OTP + sandi baru (lupa sandi) · 3: masuk pakai sandi
  // · 4: daftar, buat sandi
  const [step, setStep] = useState(1);

  // Email States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailSubMode, setEmailSubMode] = useState("login"); // "login" | "register"
  const [fullName, setFullName] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoginMode("wa");
      setStep(1);
      setWa(initialWa || "");
      setOtp("");
      setPin("");
      setEmail("");
      setPassword("");
      setError("");
      setCountdown(0);
    }
  }, [isOpen, initialWa]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  if (!isOpen) return null;

  function selesai(nomor) {
    localStorage.setItem("seller_wa", nomor);
    onSuccess?.(nomor);
  }

  // Nomor diketik → satu pertanyaan ke server: nomor ini sudah punya akun?
  //   punya sandi          → masuk
  //   belum punya apa-apa  → daftar langsung, tanpa OTP
  //   punya iklan, tanpa sandi → akun lama yang sandinya hilang; itu bukan
  //     pendaftaran melainkan pengembalian akun, dan di situlah OTP masih
  //     diperlukan. Server menolak jalur daftar untuk nomor seperti ini, jadi
  //     layar tidak boleh menawarkannya.
  async function handleCheckWA(e) {
    e.preventDefault();
    setError("");
    if (!wa.trim()) return setError("Nomor WA wajib diisi.");

    setBusy(true);
    try {
      const res = await fetch("/api/auth/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wa }),
      });
      const data = await res.json();
      // Tanpa ini, /check yang galat (data kosong) jatuh ke cabang terakhir dan
      // si pengetik disuruh menunggu OTP untuk nomor yang bahkan belum diperiksa.
      if (!res.ok) throw new Error(data.error || "Gagal mengecek nomor WA.");

      if (data.hasPin) {
        setPin("");
        setStep(3);
      } else if (data.nomorBaru) {
        setPin("");
        setStep(4);
      } else {
        await handleSendOTP(null);
      }
    } catch (err) {
      setError(err.message || "Gagal mengecek nomor WA.");
    } finally {
      setBusy(false);
    }
  }

  // Hanya untuk lupa sandi / akun lama tanpa sandi. Pendaftaran tidak lewat sini.
  async function handleSendOTP(e) {
    if (e) e.preventDefault();
    setError("");
    if (!wa.trim()) return setError("Nomor WA wajib diisi.");

    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wa }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim OTP");

      setOtp("");
      // Tombol "Kirim Ulang" juga lewat sini. Menghapus sandi baru yang sudah
      // diketik di layar yang sama cuma menghukum orang yang kodenya telat.
      if (step !== 2) setPin("");
      setStep(2);
      setCountdown(60); // jeda kirim ulang
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDaftar(e) {
    e.preventDefault();
    setError("");
    const salah = validasiPin(pin);
    if (salah) return setError(salah);

    setBusy(true);
    try {
      const res = await fetch("/api/auth/daftar-langsung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wa, pin, referral }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mendaftar");
      selesai(data.wa || wa);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOTP(e) {
    e.preventDefault();
    setError("");
    if (!otp.trim()) return setError("Kode OTP wajib diisi.");
    const salah = validasiPin(pin);
    if (salah) return setError(salah);

    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wa, otp, referral, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal verifikasi OTP");

      selesai(wa);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyPIN(e) {
    e.preventDefault();
    setError("");
    if (!pin) return setError("PIN / sandi wajib diisi.");

    setBusy(true);
    try {
      const res = await fetch("/api/auth/pin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wa, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "PIN salah.");

      selesai(wa);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailLogin(e) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) return setError("Email dan password wajib diisi.");

    setBusy(true);
    try {
      const res = await fetch("/api/auth/email/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal login dengan email");

      if (data.name) localStorage.setItem("seller_name", data.name);
      selesai(data.wa);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailRegister(e) {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) return setError("Nama lengkap wajib diisi.");
    if (!email.trim() || !email.includes("@")) return setError("Email tidak valid.");
    if (!password || password.length < 6) return setError("Password minimal 6 karakter.");

    setBusy(true);
    try {
      const res = await fetch("/api/auth/email/daftar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName, email, password, wa }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat akun");

      if (data.name) localStorage.setItem("seller_name", data.name);
      selesai(data.wa);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const petunjukSandi = `Boleh huruf, angka, atau campuran — minimal ${PIN_MIN} karakter.`;

  async function handleGoogleLogin() {
    setGoogleBusy(true);
    setError("");
    try {
      const supabase = getSupabase();
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (oauthErr) throw oauthErr;
      // redirect akan terjadi otomatis, tidak perlu close modal
    } catch (err) {
      setError(err.message || "Gagal masuk dengan Google.");
      setGoogleBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[6px]" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-[28px] bg-white/95 backdrop-blur-xl p-6 shadow-[0_32px_64px_rgba(0,0,0,0.2)] dark:bg-[#1c1c1e]/95 border border-black/[0.05] dark:border-white/[0.08] animate-slide-up">
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.05] text-[#1d1d1f] hover:bg-black/[0.09] active:scale-90 transition-all dark:bg-white/[0.08] dark:text-white"
        >
          ✕
        </button>

        <h3 className="mb-1 text-[17px] font-bold tracking-tight text-[#1d1d1f] dark:text-white flex items-center gap-2">
          Masuk / Daftar
        </h3>
        <p className="mb-4 text-[13px] text-[#6e6e73] dark:text-slate-400">
          Gunakan Email &amp; Password atau nomor WhatsApp.
        </p>

        {/* Tab Toggle */}
        <div className="mb-4 flex gap-2 border-b dark:border-slate-800">
          <button
            onClick={() => { setLoginMode("email"); setError(""); }}
            className={`pb-2 text-sm font-bold border-b-2 flex-1 transition-colors ${
              loginMode === "email"
                ? "border-gray-900 text-gray-900 dark:border-white dark:text-white"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            Email &amp; Password
          </button>
          <button
            onClick={() => { setLoginMode("wa"); setError(""); }}
            className={`pb-2 text-sm font-bold border-b-2 flex-1 transition-colors ${
              loginMode === "wa"
                ? "border-gray-900 text-gray-900 dark:border-white dark:text-white"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            WhatsApp
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 flex gap-2 items-start">
            <Icon.Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loginMode === "email" ? (
          <div className="space-y-4">
            {/* Sub-Toggle Masuk vs Daftar */}
            <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => { setEmailSubMode("login"); setError(""); }}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  emailSubMode === "login"
                    ? "bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-gray-500 hover:text-gray-900 dark:text-slate-400"
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => { setEmailSubMode("register"); setError(""); }}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  emailSubMode === "register"
                    ? "bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-gray-500 hover:text-gray-900 dark:text-slate-400"
                }`}
              >
                Daftar Baru (Tanpa OTP)
              </button>
            </div>

            {emailSubMode === "login" ? (
              <form onSubmit={handleEmailLogin} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-slate-300">
                    Alamat Email
                  </label>
                  <input
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={KELAS_INPUT}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-slate-300">
                    Password
                  </label>
                  <KolomSandi
                    nilai={password}
                    onChange={setPassword}
                    placeholder="Masukkan password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy || !email.trim() || !password.trim()}
                  className="btn-primary w-full py-2.5 flex justify-center items-center gap-2 text-xs font-bold"
                >
                  {busy ? "Memproses..." : "Masuk dengan Email"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleEmailRegister} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-slate-300">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Rian Pratama"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={KELAS_INPUT}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-slate-300">
                    Alamat Email
                  </label>
                  <input
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={KELAS_INPUT}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-slate-300">
                    Password (Min. 6 Karakter)
                  </label>
                  <KolomSandi
                    nilai={password}
                    onChange={setPassword}
                    placeholder="Buat password baru"
                  />
                </div>
                <div>
                  <label className="mb-1 flex justify-between text-xs font-bold text-gray-700 dark:text-slate-300">
                    <span>Nomor WhatsApp</span>
                    <span className="text-gray-400 text-[10px] font-normal">Opsional</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="Contoh: 081234567890"
                    value={wa}
                    onChange={(e) => setWa(e.target.value)}
                    className={KELAS_INPUT}
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy || !fullName.trim() || !email.trim() || !password.trim()}
                  className="btn-primary w-full py-2.5 flex justify-center items-center gap-2 text-xs font-bold shadow-md shadow-primary/20"
                >
                  {busy ? "Membuat Akun..." : "Daftar Akun (Tanpa OTP)"}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* WA Mode */
          step === 1 ? (
            <form onSubmit={handleCheckWA} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Nomor WhatsApp
                </label>
                <input
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  value={wa}
                  onChange={(e) => setWa(e.target.value)}
                  className={KELAS_INPUT}
                  required
                />
              </div>
              <div>
                <label className="mb-1 flex justify-between text-sm font-medium text-gray-700 dark:text-slate-300">
                  <span>Kode Referral</span>
                  <span className="text-gray-400 text-xs font-normal">Opsional</span>
                </label>
                <input
                  type="text"
                  placeholder="Masukkan kode (jika ada)"
                  value={referral}
                  onChange={(e) => setReferral(e.target.value.toUpperCase())}
                  className={KELAS_INPUT}
                />
              </div>
              <button
                type="submit"
                disabled={busy || !wa.trim()}
                className="btn-primary w-full py-2.5 flex justify-center items-center gap-2"
              >
                {busy ? "Memproses..." : "Lanjut"}
              </button>
            </form>
          ) : step === 3 ? (
            <form onSubmit={handleVerifyPIN} className="space-y-4">
              <p className="mb-2 text-sm text-gray-500 dark:text-slate-400">
                Selamat datang kembali! Masukkan PIN / sandi kamu.
              </p>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  PIN / Sandi
                </label>
                <KolomSandi
                  nilai={pin}
                  onChange={setPin}
                  placeholder="Masukkan PIN / sandi"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={busy || !pin}
                className="btn-primary w-full py-2.5 flex justify-center items-center gap-2"
              >
                {busy ? "Memverifikasi..." : "Masuk"}
              </button>
              <div className="text-center mt-3 flex justify-center items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
                >
                  Ganti Nomor
                </button>
                <span className="text-gray-300 mx-1">|</span>
                <button
                  type="button"
                  onClick={() => handleSendOTP(null)}
                  disabled={busy}
                  className="text-sm font-semibold text-gray-900 underline underline-offset-2 hover:text-gray-600 dark:text-white dark:hover:text-slate-300 disabled:opacity-50"
                >
                  Lupa PIN / sandi?
                </button>
              </div>
            </form>
          ) : step === 4 ? (
            <form onSubmit={handleDaftar} className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Nomor <span className="font-semibold text-gray-800 dark:text-slate-200">{wa}</span> belum
                punya akun. Buat PIN / sandi sekarang dan langsung dipakai — tidak perlu kode OTP.
              </p>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Buat PIN / Sandi
                </label>
                <KolomSandi
                  nilai={pin}
                  onChange={setPin}
                  placeholder="Huruf, angka, atau campuran"
                  autoComplete="new-password"
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  {petunjukSandi} Ingat baik-baik — kalau lupa, kode pemulihannya dikirim ke
                  WhatsApp nomor ini.
                </p>
              </div>
              <button
                type="submit"
                disabled={busy || pin.length < PIN_MIN}
                className="btn-primary w-full py-2.5 flex justify-center items-center gap-2"
              >
                {busy ? "Memproses..." : "Buat akun"}
              </button>
              <button
                type="button"
                onClick={() => { setStep(1); setError(""); }}
                className="w-full text-center text-sm text-gray-500 underline underline-offset-2 dark:text-slate-400"
              >
                Kembali
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <p className="mb-2 text-sm text-gray-500 dark:text-slate-400">
                Kode pemulihan dikirim via WhatsApp ke {wa}. Masukkan kodenya lalu atur PIN / sandi baru.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Kode OTP
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    placeholder="OTP (6 digit)"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className={`${KELAS_INPUT} text-center text-lg tracking-widest font-mono`}
                    maxLength={6}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                    PIN / Sandi Baru
                  </label>
                  <KolomSandi
                    nilai={pin}
                    onChange={setPin}
                    placeholder="Huruf, angka, atau campuran"
                    autoComplete="new-password"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{petunjukSandi}</p>
                </div>
              </div>
              <button
                type="submit"
                disabled={busy || otp.length < 6 || pin.length < PIN_MIN}
                className="btn-primary w-full py-2.5 flex justify-center items-center gap-2"
              >
                {busy ? "Memverifikasi..." : "Simpan & Masuk"}
              </button>
              <div className="text-center mt-3">
                <button
                  type="button"
                  onClick={(e) => handleSendOTP(e)}
                  disabled={busy || countdown > 0}
                  className="text-sm font-semibold text-gray-900 underline underline-offset-2 hover:text-gray-600 dark:text-white dark:hover:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                >
                  {countdown > 0 ? `Kirim ulang dalam ${countdown}s` : "Kirim Ulang OTP"}
                </button>
                <span className="text-gray-300 mx-2">|</span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
                >
                  Ganti Nomor
                </button>
              </div>
            </form>
          )
        )}

        {/* DIVIDER GOOGLE */}
        <div className="mt-5">
          <div className="relative flex items-center gap-3">
            <div className="flex-1 border-t border-gray-200 dark:border-slate-700" />
            <span className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">atau lanjutkan dengan</span>
            <div className="flex-1 border-t border-gray-200 dark:border-slate-700" />
          </div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleBusy}
            className="mt-3 w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 text-sm font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
          >
            {googleBusy ? (
              <svg className="h-5 w-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {googleBusy ? "Mengarahkan..." : "Google"}
          </button>
        </div>
      </div>
    </div>
  );
}
