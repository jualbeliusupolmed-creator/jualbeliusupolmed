import { isAdmin } from "@/lib/auth";
import AdminLogin from "../AdminLogin";
import GroupPostsClient from "./GroupPostsClient";

export const dynamic = "force-dynamic";

export default function AdminGroupPostPage() {
  if (!isAdmin()) {
    return <AdminLogin />;
  }

  return <GroupPostsClient />;
}
