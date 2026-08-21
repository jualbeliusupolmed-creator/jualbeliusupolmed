import { useState, useEffect } from "react";
import { Icon } from "./Icons";
import { PIN_MIN, PIN_MAX, validasiPin } from "@/lib/pinRules";

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

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

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

      selesai(data.wa);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const petunjukSandi = `Boleh huruf, angka, atau campuran — minimal ${PIN_MIN} karakter.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900 border border-gray-100 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          ✕
        </button>

        <h3 className="mb-1 text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Icon.User className="h-5 w-5 text-gray-700 dark:text-slate-300" />
          Masuk / Daftar
        </h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-slate-400">
          Gunakan nomor WhatsApp atau Email.
        </p>

        {/* Tab Toggle */}
        <div className="mb-4 flex gap-2 border-b dark:border-slate-800">
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
          <button
            onClick={() => { setLoginMode("email"); setError(""); }}
            className={`pb-2 text-sm font-bold border-b-2 flex-1 transition-colors ${
              loginMode === "email"
                ? "border-gray-900 text-gray-900 dark:border-white dark:text-white"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            Email
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 flex gap-2 items-start">
            <Icon.Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loginMode === "email" ? (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
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
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
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
              className="btn-primary w-full py-2.5 flex justify-center items-center gap-2"
            >
              {busy ? "Memproses..." : "Masuk via Email"}
            </button>
          </form>
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
      </div>
    </div>
  );
}
