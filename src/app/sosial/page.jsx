import { redirect } from "next/navigation";

// Rute lama tetap aman untuk bookmark, tetapi Sosial adalah Menfess.
export default function SosialPage() {
  redirect("/mading");
}
