import { redirect } from "next/navigation";

export default function TemanPage() {
  redirect("/chat?mode=teman");
}
