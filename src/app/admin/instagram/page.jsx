import { TabInstagram } from "@/components/admin/TabInstagram";

export const dynamic = "force-dynamic";

export const metadata = { title: "Antrean Instagram — Admin" };

export default function InstagramPage() {
  return (
    <div className="animate-fade-in p-6">
      <TabInstagram />
    </div>
  );
}
