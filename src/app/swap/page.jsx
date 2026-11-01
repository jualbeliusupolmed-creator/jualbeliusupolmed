import { redirect } from "next/navigation";

export default function SwapPage() {
  redirect("/chat?mode=teman");
}
