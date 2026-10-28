"use client";

import Link from "next/link";
import { ArrowRight, Boxes, CircleDollarSign, ClipboardCheck, Plus, ShieldCheck, ShoppingBag, Users } from "lucide-react";
import { rupiah } from "@/lib/fees";

function Metric({ label, value, detail, href, icon: Icon, accent = "emerald" }) {
  const accents = {
    emerald: "bg-emerald-50 text-emerald-800",
    amber: "bg-amber-50 text-amber-800",
    blue: "bg-sky-50 text-sky-800",
    violet: "bg-violet-50 text-violet-800",
  };
  return (
    <Link href={href} className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_18px_-16px_rgba(15,23,42,.3)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl ${accents[accent]}`}><Icon className="h-[18px] w-[18px]" strokeWidth={1.8} /></span><ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-700" /></div>
      <p className="mt-5 text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{value ?? 0}</p>
      <p className="mt-1 text-[11px] font-medium text-slate-400">{detail}</p>
    </Link>
  );
}

export default function OverviewView({ stats = {}, actor, legacyNotice = false }) {
  const isSuperadmin = actor?.role === "superadmin";
  const canPo = isSuperadmin || actor?.permissions?.po?.includes?.("read") || actor?.permissions?.po?.includes?.("manage");
  const canReports = isSuperadmin || actor?.permissions?.reports?.includes?.("read") || actor?.permissions?.reports?.includes?.("manage");
  const metrics = [
    { label: "Iklan aktif", value: stats.activeTotal, detail: "Sedang tampil di marketplace", href: "/admin/marketplace", icon: ShoppingBag, accent: "emerald" },
    { label: "Menunggu review", value: stats.pendingTotal, detail: "Perlu ditinjau", href: "/admin/marketplace", icon: ClipboardCheck, accent: "amber" },
    { label: "Iklan terjual", value: stats.soldTotal, detail: "Dalam cakupan kerja", href: "/admin/marketplace", icon: CircleDollarSign, accent: "blue" },
  ];
  if (isSuperadmin) metrics.push({ label: "Laporan terbuka", value: stats.openReportsTotal, detail: "Perlu ditindaklanjuti", href: "/admin/reports", icon: ShieldCheck, accent: "violet" });

  const quickLinks = isSuperadmin
    ? [
      { title: "Kelola akses owner", detail: "Atur akun, cakupan kampus, dan izin modul.", href: "/admin/owners", icon: Users },
      { title: "Review marketplace", detail: "Tinjau iklan yang menunggu persetujuan.", href: "/admin/marketplace", icon: ClipboardCheck },
      { title: "Laporan pengguna", detail: "Tinjau laporan yang perlu ditindaklanjuti.", href: "/admin/reports", icon: ShieldCheck },
      { title: "Kelola Open PO", detail: "Pantau batch, kuota, dan reservasi baru.", href: "/admin/po", icon: Boxes },
      { title: "WhatsApp", detail: "Buka status bot dan operasional pesan.", href: "/admin/wabot", icon: ShieldCheck },
    ]
    : [
      { title: "Marketplace wilayah saya", detail: `${stats.campuses?.join(", ") || "Cakupan kampus belum diatur"}.`, href: "/admin/marketplace", icon: ShoppingBag },
      ...(canReports ? [{ title: "Laporan pengguna", detail: "Tindak lanjuti laporan dari kampus dalam cakupan Anda.", href: "/admin/reports", icon: ShieldCheck }] : []),
      ...(canPo ? [{ title: "Open PO", detail: "Kelola batch dan reservasi pada cakupan Anda.", href: "/admin/po", icon: Boxes }] : []),
    ];

  return (
    <div className="space-y-6 sm:space-y-7">
      {legacyNotice ? <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">Halaman admin yang lama sudah tidak digunakan. Pilih fitur yang tersedia pada menu workspace.</div> : null}
      <section className="overflow-hidden rounded-[26px] bg-[linear-gradient(118deg,#064e3b_0%,#047857_58%,#10a46b_100%)] p-5 text-white shadow-lg shadow-emerald-950/10 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl"><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-emerald-100/75">{isSuperadmin ? "Kontrol proyek" : "Ruang kerja owner"}</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Selamat datang, {isSuperadmin ? "Superadmin" : actor?.label?.split(" ")[0] || "Owner"}</h2><p className="mt-2 text-sm leading-relaxed text-emerald-50/85">{isSuperadmin ? "Pantau operasional platform dan buka area kerja yang perlu ditangani." : `Cakupan kerja: ${stats.campuses?.join(", ") || "belum ditetapkan"}. Ringkasan hanya memuat data di wilayah yang diberikan.`}</p></div>
          {isSuperadmin ? <Link href="/admin/owners" className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full bg-white px-5 text-xs font-extrabold text-emerald-950 transition hover:bg-emerald-50 sm:self-auto"><Plus className="h-4 w-4" />Tambah akses owner</Link> : null}
        </div>
      </section>

      <section aria-label="Ringkasan kinerja" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => <Metric key={metric.label} {...metric} />)}
      </section>

      {isSuperadmin ? <section className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6"><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-slate-400">Area kerja</p><h3 className="mt-1 text-lg font-black tracking-tight">Aksi yang sering dipakai</h3></div><div className="mt-4 grid gap-2.5 sm:grid-cols-2">{quickLinks.map(({ title, detail, href, icon: Icon }) => <Link key={href} href={href} className="group flex min-h-[92px] items-start gap-3 rounded-xl border border-slate-100 p-3.5 transition hover:border-emerald-200 hover:bg-emerald-50/35"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-600 group-hover:bg-white group-hover:text-emerald-800"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold">{title}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{detail}</span></span><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 group-hover:text-emerald-700" /></Link>)}</div></div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 sm:p-6"><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-800/70">Cakupan kontrol</p><h3 className="mt-1 text-lg font-black tracking-tight text-emerald-950">Operasional utama</h3><p className="mt-3 text-sm leading-relaxed text-emerald-900/70">Workspace baru menyediakan akses owner, moderasi marketplace, dan pengelolaan Open PO dari satu panel.</p><Link href="/admin/owners" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-4 text-xs font-extrabold text-emerald-900 hover:bg-white">Kelola akses owner <ArrowRight className="h-3.5 w-3.5" /></Link></div>
      </section> : <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6"><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-slate-400">Area yang diizinkan</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{quickLinks.map(({ title, detail, href, icon: Icon }) => <Link key={href} href={href} className="group flex min-h-[88px] items-start gap-3 rounded-xl border border-slate-100 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/35"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold">{title}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{detail}</span></span><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 group-hover:text-emerald-700" /></Link>)}</div></section>}
    </div>
  );
}
