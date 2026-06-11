import AdminTabPage from "../[tab]/page";

export const dynamic = "force-dynamic";

export default function BlogsPage() {
  return <AdminTabPage params={{ tab: "blogs" }} />;
}
