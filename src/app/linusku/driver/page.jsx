import LinuskuFrame from "@/components/LinuskuFrame";

export const metadata = {
  title: "LINUSKU Driver",
  description: "Mode tracker untuk armada bus Lintas USU.",
  robots: { index: false, follow: false },
};

export default function LinuskuDriverPage() {
  return <LinuskuFrame driver />;
}
