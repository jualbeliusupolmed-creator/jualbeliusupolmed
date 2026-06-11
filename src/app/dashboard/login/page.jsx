"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OTPModal from "@/components/OTPModal";

export default function DashboardLogin() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  const handleSuccess = () => {
    setIsOpen(false);
    router.push("/dashboard");
  };

  const handleClose = () => {
    setIsOpen(false);
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8 animate-in fade-in zoom-in duration-500">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Masuk ke Dashboard Penjual</h1>
        <p className="text-gray-500 dark:text-slate-400">Silakan login menggunakan nomor WhatsApp Anda.</p>
      </div>
      <OTPModal isOpen={isOpen} onClose={handleClose} onSuccess={handleSuccess} />
    </div>
  );
}
