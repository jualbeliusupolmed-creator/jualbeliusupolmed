import { redirect } from "next/navigation";

export default function SwapPage() {
  redirect("/chat?anon=1");
}
