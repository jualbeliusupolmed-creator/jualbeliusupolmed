import SocialWorkspace from "@/components/admin/SocialWorkspace";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Social & Komunikasi — Admin Kampus Kita",
  description: "Manajemen multi-account Instagram, routing DM kampus, dan kanal WhatsApp",
};

export default function SocialPage() {
  return <SocialWorkspace />;
}
