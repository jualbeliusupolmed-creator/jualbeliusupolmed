import ModerasiClient from "@/components/admin/ModerasiClient";
import { PageHeader } from "@/components/admin/ui";
import { getDemoModerasi } from "@/lib/demoData";

export const dynamic = "force-dynamic";

export default function ModerasiDemoPage() {
  const data = getDemoModerasi();
  const total =
    data.pendingListings.length + data.openReports.length + data.pendingProfiles.length + data.pendingFees.length;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Moderasi"
        description={total ? `${total} hal menunggu tindakan.` : "Tidak ada yang menunggu."}
      />
      <ModerasiClient {...data} />
    </div>
  );
}
