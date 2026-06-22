import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";

export const metadata = {
  title: "WhatsApp Bot Dashboard | Admin",
};

export default function BaileysPage() {
  if (!isAdmin()) redirect("/admin");
  redirect("/admin/wabot");
}
