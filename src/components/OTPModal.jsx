import { useState, useEffect } from "react";
import { Icon } from "./Icons";

export default function OTPModal({ isOpen, onClose, onSuccess }) {
  const [loginMode, setLoginMode] = useState("wa"); // "wa" | "email"
  
  // WA States
  const [wa, setWa] = useState("");
  const [referral, setReferral] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState(1); // 1: WA, 2: OTP+Setup PIN, 3: Verify PIN
  
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
      setWa("");
      setOtp("");
      setPin("");
      setEmail("");
      setPassword("");
      setError("");
      setCountdown(0);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  if (!isOpen) return null;

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
      
      if (data.hasPin) {
        setStep(3); // Masuk ke mode PIN
      } else {
        await handleSendOTP(null, true); // Belum ada PIN, daftar/reset
      }
    } catch (err) {
      setError(err.message || "Gagal mengecek nomor WA.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSendOTP(e, isSetup = false) {
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
      
      setStep(2);
      setOtp("");
      if (!isSetup) setPin(""); // Kosongkan PIN jika ini reset
      setCountdown(60); // 60 seconds cooldown for resend
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
    if (pin.length < 6) return setError("PIN harus 6 digit angka.");
    
    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wa, otp, referral, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal verifikasi OTP");
      
      localStorage.setItem("seller_wa", wa);
      onSuccess(wa);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyPIN(e) {
    e.preventDefault();
    setError("");
    if (pin.length < 6) return setError("PIN harus 6 digit angka.");
    
    setBusy(true);
    try {
      const res = await fetch("/api/auth/pin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wa, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "PIN salah.");
      
      localStorage.setItem("seller_wa", wa);
      onSuccess(wa);
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
      
      localStorage.setItem("seller_wa", data.wa);
      onSuccess(data.wa);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900 border border-gray-100 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          ✕
        </button>
        
        <h3 className="mb-1 text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Icon.User className="h-5 w-5 text-indigo-500" />
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
                ? "border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400" 
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            WhatsApp
          </button>
          <button
            onClick={() => { setLoginMode("email"); setError(""); }}
            className={`pb-2 text-sm font-bold border-b-2 flex-1 transition-colors ${
              loginMode === "email" 
                ? "border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400" 
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Password
              </label>
              <input
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
                Selamat datang kembali! Silakan masukkan PIN 6 digit Anda.
              </p>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  PIN Akses (6 Digit)
                </label>
                <input
                  type="password"
                  placeholder="Masukkan 6 digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center text-xl tracking-widest font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  maxLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={busy || pin.length < 6}
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
                  onClick={() => handleSendOTP(null, false)}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  Lupa PIN?
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <p className="mb-2 text-sm text-gray-500 dark:text-slate-400">
                Kode OTP telah dikirim via WA ke {wa}. Silakan atur PIN baru Anda.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Kode OTP
                  </label>
                  <input
                    type="text"
                    placeholder="OTP (6 digit)"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center text-lg tracking-widest font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    maxLength={6}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Buat PIN Baru
                  </label>
                  <input
                    type="password"
                    placeholder="PIN (6 angka)"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center text-lg tracking-widest font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    maxLength={6}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={busy || otp.length < 5 || pin.length < 6}
                className="btn-primary w-full py-2.5 flex justify-center items-center gap-2"
              >
                {busy ? "Memverifikasi..." : "Simpan PIN & Masuk"}
              </button>
              <div className="text-center mt-3">
                <button
                  type="button"
                  onClick={(e) => handleSendOTP(e, true)}
                  disabled={busy || countdown > 0}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
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

