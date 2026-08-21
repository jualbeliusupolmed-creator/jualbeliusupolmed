import { getOverviewStats } from "@/lib/adminOverviewData";
import OverviewView from "@/components/admin/OverviewView";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  return <OverviewView stats={await getOverviewStats()} />;
}
