import LinuskuFrame from "@/components/LinuskuFrame";

export const metadata = {
  title: "LINUSKU — Peta Bus Lintas USU",
  description: "Lacak bus Lintas USU dan lihat estimasi kedatangan di halte.",
  robots: { index: false, follow: false },
};

export default function LinuskuPage() {
  return <LinuskuFrame />;
}
