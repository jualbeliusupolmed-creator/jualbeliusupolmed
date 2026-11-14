import { Suspense } from "react";
import OrganizationWorkspace from "@/components/admin/OrganizationWorkspace";

export const dynamic = "force-dynamic";

export default function OrganizationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat struktur wilayah...</div>}>
      <OrganizationWorkspace />
    </Suspense>
  );
}
