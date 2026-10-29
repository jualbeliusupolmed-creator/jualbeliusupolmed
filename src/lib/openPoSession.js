import { getSellerSession } from "@/lib/auth";
import { formatWa } from "@/lib/constants";

export function getOpenPoSession() {
  const identifier = getSellerSession();
  if (!identifier) {
    return {
      wa: "",
      status: 401,
      error: "Sesi JB tidak ditemukan atau telah berakhir. Masuk kembali untuk melanjutkan.",
    };
  }

  const wa = formatWa(identifier);
  if (!wa) {
    return {
      wa: "",
      status: 403,
      error:
        "Akun JB aktif, tetapi Open PO saat ini memerlukan akun yang memiliki nomor WhatsApp.",
    };
  }

  return { wa, status: 200, error: "" };
}
