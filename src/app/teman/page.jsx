import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function TemanPage() {
  redirect("/chat?mode=teman");
}
