import { redirect } from "next/navigation";

export default function CariTemanPage() {
  redirect("/chat?anon=1");
}
