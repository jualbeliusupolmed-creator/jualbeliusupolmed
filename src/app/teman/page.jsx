import { redirect } from "next/navigation";

export default function TemanPage() {
  redirect("/chat?anon=1");
}
