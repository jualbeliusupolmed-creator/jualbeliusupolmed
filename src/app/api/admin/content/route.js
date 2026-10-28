import { NextResponse } from "next/server";
import { getAdminActor, getAdminCampusScope, hasAdminPermission } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function publicBlog(blog, campus = "") {
  const { author_wa, ...safe } = blog;
  return { ...safe, campus };
}

async function isInScope(supa, actor, campuses, blog) {
  if (actor.role === "superadmin") return { allowed: true, campus: "" };
  if (!blog.author_wa || !campuses?.length) return { allowed: false, campus: "" };
  const { data: author } = await supa.from("seller_profiles").select("campus").eq("wa", blog.author_wa).maybeSingle();
  const campus = author?.campus || "";
  return { allowed: !!campus && campuses.includes(campus), campus };
}

export async function GET(req) {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "content", "read")) return NextResponse.json({ error: "Tidak berwenang." }, { status: 403 });
  const params = new URL(req.url).searchParams;
  const allowedStatuses = new Set(["all", "menunggu", "published", "draft", "ditolak"]);
  const status = allowedStatuses.has(params.get("status")) ? params.get("status") : "all";
  const supa = getAdminClient();
  const campuses = actor.role === "superadmin" ? null : await getAdminCampusScope(actor);
  if (actor.role !== "superadmin" && !campuses.length) return NextResponse.json({ items: [], campuses: [] });

  let query = supa.from("blogs")
    .select("id,slug,title,excerpt,content_markdown,image_url,author,status,created_at,submitted_at,reviewed_at,reject_note,author_wa")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Daftar konten belum dapat dimuat." }, { status: 503 });

  if (actor.role === "superadmin") return NextResponse.json({ items: (data || []).map((blog) => publicBlog(blog)), campuses: [] });
  const authorNumbers = [...new Set((data || []).map((blog) => blog.author_wa).filter(Boolean))];
  const { data: authors, error: authorError } = authorNumbers.length
    ? await supa.from("seller_profiles").select("wa,campus").in("wa", authorNumbers)
    : { data: [], error: null };
  if (authorError) return NextResponse.json({ error: "Cakupan penulis belum dapat diperiksa." }, { status: 503 });
  const campusByWa = new Map((authors || []).map((author) => [author.wa, author.campus || ""]));
  const items = (data || []).filter((blog) => campuses.includes(campusByWa.get(blog.author_wa))).map((blog) => publicBlog(blog, campusByWa.get(blog.author_wa)));
  return NextResponse.json({ items, campuses });
}

export async function POST(req) {
  const actor = await getAdminActor();
  if (actor?.role !== "superadmin" || !hasAdminPermission(actor, "content", "manage")) return NextResponse.json({ error: "Pembuatan artikel platform hanya untuk superadmin." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "").trim().slice(0, 180);
  const slug = String(body.slug || "").trim().toLowerCase().slice(0, 180);
  const content = String(body.contentMarkdown || "").trim().slice(0, 100000);
  if (!title || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !content) {
    return NextResponse.json({ error: "Judul, slug, dan isi artikel harus diisi dengan format yang benar." }, { status: 400 });
  }
  const imageUrl = String(body.imageUrl || "").trim();
  if (imageUrl) {
    try { if (new URL(imageUrl).protocol !== "https:") throw new Error("invalid"); }
    catch { return NextResponse.json({ error: "URL gambar harus menggunakan HTTPS." }, { status: 400 }); }
  }
  const supa = getAdminClient();
  const { data, error } = await supa.from("blogs").insert({
    title,
    slug,
    content_markdown: content,
    excerpt: String(body.excerpt || "").trim().slice(0, 500) || null,
    keywords: String(body.keywords || "").trim().slice(0, 300) || null,
    image_url: imageUrl || null,
    author: actor.label || "Admin",
    status: "draft",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).select("id,slug,title,status,created_at").single();
  if (error) return NextResponse.json({ error: "Artikel gagal disimpan. Pastikan slug belum digunakan." }, { status: 409 });
  await supa.from("admin_audit_events").insert({ actor_id: actor.userId, action: "content_article_created", target_id: data.id, metadata: {} });
  return NextResponse.json({ ok: true, item: data });
}

export async function PATCH(req) {
  const actor = await getAdminActor();
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  const action = body.action;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: "Artikel tidak valid." }, { status: 400 });
  if (!["approve", "reject", "update"].includes(action)) return NextResponse.json({ error: "Aksi konten tidak valid." }, { status: 400 });
  const permission = action === "update" ? "manage" : "review";
  if (!hasAdminPermission(actor, "content", permission)) return NextResponse.json({ error: "Izin konten tidak diberikan." }, { status: 403 });

  const supa = getAdminClient();
  const campuses = actor.role === "superadmin" ? null : await getAdminCampusScope(actor);
  const { data: blog, error: findError } = await supa.from("blogs")
    .select("id,slug,title,status,author_wa")
    .eq("id", id)
    .maybeSingle();
  if (findError) return NextResponse.json({ error: "Artikel belum dapat diperiksa." }, { status: 503 });
  if (!blog) return NextResponse.json({ error: "Artikel tidak ditemukan." }, { status: 404 });
  const scope = await isInScope(supa, actor, campuses, blog);
  if (!scope.allowed) return NextResponse.json({ error: "Artikel berada di luar cakupan akun." }, { status: 403 });

  let change;
  if (action === "approve") change = { status: "published", reviewed_at: new Date().toISOString(), reject_note: null, updated_at: new Date().toISOString() };
  if (action === "reject") {
    const note = String(body.reason || "").trim().slice(0, 300);
    if (!note) return NextResponse.json({ error: "Alasan penolakan wajib diisi." }, { status: 400 });
    change = { status: "ditolak", reviewed_at: new Date().toISOString(), reject_note: note, updated_at: new Date().toISOString() };
  }
  if (action === "update") {
    const title = String(body.title || "").trim().slice(0, 180);
    const slug = String(body.slug || "").trim().toLowerCase().slice(0, 180);
    const content = String(body.contentMarkdown || "").trim().slice(0, 100000);
    if (!title || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !content) return NextResponse.json({ error: "Judul, slug, dan isi artikel wajib diisi." }, { status: 400 });
    const imageUrl = String(body.imageUrl || "").trim();
    if (imageUrl) {
      try { if (new URL(imageUrl).protocol !== "https:") throw new Error("invalid"); }
      catch { return NextResponse.json({ error: "URL gambar harus menggunakan HTTPS." }, { status: 400 }); }
    }
    change = {
      title,
      slug,
      content_markdown: content,
      excerpt: String(body.excerpt || "").trim().slice(0, 500) || null,
      keywords: String(body.keywords || "").trim().slice(0, 300) || null,
      image_url: imageUrl || null,
      updated_at: new Date().toISOString(),
      ...(actor.role === "superadmin" ? { status: body.status === "published" ? "published" : "draft" } : { status: "draft" }),
    };
  }
  const { data: updated, error } = await supa.from("blogs").update(change).eq("id", id).select("id,slug,title,status,updated_at").maybeSingle();
  if (error || !updated) return NextResponse.json({ error: "Artikel gagal diperbarui." }, { status: 409 });
  await supa.from("admin_audit_events").insert({ actor_id: actor.userId, action: "content_" + action, target_id: id, metadata: { campus: scope.campus } });
  return NextResponse.json({ ok: true, item: updated });
}
