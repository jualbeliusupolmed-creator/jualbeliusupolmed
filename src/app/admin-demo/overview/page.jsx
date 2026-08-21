import OverviewView from "@/components/admin/OverviewView";
import { getDemoOverviewStats } from "@/lib/demoData";

export const dynamic = "force-dynamic";

export default function OverviewDemoPage() {
  return <OverviewView stats={getDemoOverviewStats()} />;
}
