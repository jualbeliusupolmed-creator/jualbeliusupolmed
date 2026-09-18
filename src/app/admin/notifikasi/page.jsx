import { isAdmin } from "@/lib/auth";
import AdminLogin from "../AdminLogin";
import NotifikasiClient from "./NotifikasiClient";

export const dynamic = "force-dynamic";

export default function AdminNotifikasiPage() {
  if (!isAdmin()) {
    return <AdminLogin />;
  }

  return <NotifikasiClient />;
}
