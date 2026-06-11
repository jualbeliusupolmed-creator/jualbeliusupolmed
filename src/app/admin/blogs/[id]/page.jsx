import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";
import BlogEditor from "./BlogEditor";

export const dynamic = "force-dynamic";

export default async function AdminBlogEditPage({ params }) {
  if (!isAdmin()) notFound();

  const { id } = params;
  let blog = null;

  if (id !== "new") {
    const supa = getAdminClient();
    const { data } = await supa.from("blogs").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    blog = data;
  }

  return <BlogEditor initialBlog={blog} />;
}
