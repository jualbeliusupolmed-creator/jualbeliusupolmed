import LinuskuFrame from "@/components/LinuskuFrame";

export const metadata = {
  title: "LINUSKU — Panel Operasional Admin",
  description: "Kelola armada, driver, halte, posisi GPS, laporan kepadatan, dan jam layanan LINUSKU.",
  robots: { index: false, follow: false },
};

export default function LinuskuAdminPage() {
  return <LinuskuFrame admin />;
}
