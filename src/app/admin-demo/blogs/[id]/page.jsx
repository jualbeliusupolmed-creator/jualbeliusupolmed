import { notFound } from "next/navigation";
import BlogEditor from "../../../admin/blogs/[id]/BlogEditor";
import { blogsDemo } from "@/lib/demoData";

export const dynamic = "force-dynamic";

export const metadata = { title: "Editor Artikel (Demo) — Admin" };

export default function BlogDemoPage({ params }) {
  const { id } = params;
  if (id === "new") return <BlogEditor initialBlog={null} />;

  const blog = blogsDemo.find((b) => b.id === id);
  if (!blog) notFound();
  return <BlogEditor initialBlog={blog} />;
}
