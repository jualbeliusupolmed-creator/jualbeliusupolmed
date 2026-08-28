"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OTPModal from "@/components/OTPModal";

/**
 * Ke mana pengunjung diantar setelah berhasil masuk.
 *
 * Dulu selalu `/dashboard`, apa pun yang tadi ia tuju. Jadi menekan "Profil"
 * saat belum masuk berarti: diminta login, lalu mendarat di tab jualan — dan
 * tujuan semula hilang tanpa jejak. Sekarang tujuannya dititipkan lewat
 * `?next=`.
 *
 * Hanya jalur INTERNAL yang diterima. `next` datang dari alamat yang bisa
 * diketik siapa saja, jadi tanpa penyaringan ini sebuah tautan
 * `/dashboard/login?next=https://situs-lain/...` akan memakai halaman login
 * kita sendiri sebagai batu loncatan ke situs orang — pengunjung merasa masih
 * di tempat yang benar karena login-nya memang di sini.
 *
 * `//` ikut ditolak: peramban membaca `//situs-lain` sebagai alamat mutlak
 * berprotokol sama, jadi memeriksa "diawali /" saja tidak cukup.
 */
function tujuanAman(next) {
  const t = String(next || "");
  if (!t.startsWith("/") || t.startsWith("//")) return "/dashboard";
  return t;
}

function IsiLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [isOpen, setIsOpen] = useState(true);

  const handleSuccess = () => {
    setIsOpen(false);
    router.push(tujuanAman(params.get("next")));
  };

  const handleClose = () => {
    setIsOpen(false);
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8 animate-in fade-in zoom-in duration-500">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Masuk ke Akun Anda</h1>
        <p className="text-gray-500 dark:text-slate-400">Gunakan nomor WhatsApp untuk masuk ke seluruh layanan kampus.</p>
      </div>
      <OTPModal isOpen={isOpen} onClose={handleClose} onSuccess={handleSuccess} />
    </div>
  );
}

export default function LoginClient() {
  // useSearchParams menuntut batas Suspense saat halaman ini dipraruncang.
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-slate-900" />}>
      <IsiLogin />
    </Suspense>
  );
}
