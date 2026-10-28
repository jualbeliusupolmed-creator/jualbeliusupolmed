"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";
import {
  ArrowUpRight, Boxes, ChartNoAxesCombined, Flag, LayoutDashboard, LogOut, Menu, MessageCircle, MessagesSquare,
  PanelLeftClose, Settings2, ShieldCheck, ShoppingBag, Users, WalletCards, BookOpen, X,
} from "lucide-react";

const iconByKey = {
  overview: LayoutDashboard, marketplace: ShoppingBag, reports: Flag, po: Boxes, owners: ShieldCheck,
  users: Users, finance: WalletCards, analytics: ChartNoAxesCombined, content: BookOpen, settings: Settings2, audit: ShieldCheck,
  wabot: MessageCircle, antrean: MessagesSquare, notifikasi: MessageCircle, broadcast: MessageCircle,
  broadcast_grup: MessagesSquare, grouppost: MessagesSquare,
};

const ADMIN_GROUPS = [
  { label: "Workspace", items: [{ key: "overview", label: "Ringkasan", href: "/admin/overview" }] },
  { label: "Operasional", items: [
    { key: "marketplace", label: "Marketplace", href: "/admin/marketplace", permission: "marketplace" },
    { key: "users", label: "Pengguna", href: "/admin/users", permission: "users" },
    { key: "reports", label: "Laporan pengguna", href: "/admin/reports", permission: "reports" },
    { key: "po", label: "Open PO", href: "/admin/po", permission: "po" },
    { key: "finance", label: "Keuangan", href: "/admin/finance", permission: "finance" },
  ] },
  { label: "Pemantauan", items: [
    { key: "analytics", label: "Analitik", href: "/admin/analytics", permission: "analytics" },
    { key: "content", label: "Konten", href: "/admin/content", permission: "content" },
  ] },
  { label: "Administrasi", items: [
    { key: "owners", label: "Akses owner", href: "/admin/owners", superadmin: true },
    { key: "settings", label: "Pengaturan platform", href: "/admin/settings", permission: "settings" },
    { key: "audit", label: "Jejak perubahan", href: "/admin/audit", superadmin: true },
  ] },
  { label: "WhatsApp", items: [
    { key: "wabot", label: "WhatsApp", href: "/admin/wabot", permission: "whatsapp" },
    { key: "antrean", label: "Antrean pesan", href: "/admin/antrean", permission: "whatsapp" },
    { key: "notifikasi", label: "Notifikasi", href: "/admin/notifikasi", permission: "whatsapp" },
    { key: "broadcast", label: "Broadcast", href: "/admin/broadcast", permission: "whatsapp" },
    { key: "broadcast_grup", label: "Broadcast grup", href: "/admin/broadcast_grup", permission: "whatsapp" },
    { key: "grouppost", label: "Post grup", href: "/admin/grouppost", permission: "whatsapp" },
  ] },
];

function canShow(actor, item) {
  if (actor.role === "superadmin") return true;
  if (item.superadmin || !item.permission) return false;
  const grant = actor.permissions?.[item.permission];
  return Array.isArray(grant) ? grant.includes("read") || grant.includes("manage") : !!grant?.read || !!grant?.manage;
}

export default function OwnerWorkspaceShell({ actor, children }) {
  const pathname = usePathname() || "/admin/overview";
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const mobileNavigationRef = useRef(null);
  const closeMobileNavigation = useCallback(() => setMobileOpen(false), []);
  useFocusTrap({ isOpen: mobileOpen, onClose: closeMobileNavigation, containerRef: mobileNavigationRef });
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);
  const groups = useMemo(() => ADMIN_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canShow(actor, item)),
  })).filter((group) => group.items.length), [actor]);
  const current = groups.flatMap((group) => group.items).find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const currentTitle = current?.label || "Workspace";
  const scopeText = actor.role === "superadmin"
    ? "Seluruh platform"
    : (actor.scopes || []).map((scope) => String(scope.scope_id || "").replaceAll("-", " ")).filter(Boolean).join(", ") || "Belum ada cakupan";

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.replace("/admin");
    router.refresh();
  }

  function navContent(onNavigate) {
    return (
      <nav aria-label="Navigasi admin" className="space-y-5 pb-5">
        {groups.map((group) => (
          <section key={group.label}>
            <h2 className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[.16em] text-slate-400">{group.label}</h2>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = iconByKey[item.key] || LayoutDashboard;
                const active = current?.key === item.key;
                return (
                  <Link key={item.key} href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
                    className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition ${active ? "bg-emerald-50 text-emerald-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}>
                    <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {active ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-700" /> : null}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f8f6] text-slate-950">
      <aside className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-slate-200/80 bg-white transition-[width] duration-200 lg:flex ${collapsed ? "w-[84px]" : "w-[268px]"}`}>
        <div className={`flex h-[76px] items-center border-b border-slate-100 ${collapsed ? "justify-center px-3" : "gap-3 px-5"}`}>
          <Link href="/admin/overview" aria-label="Kampus Kita workspace" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-800 text-white shadow-lg shadow-emerald-900/15">
            <span className="text-sm font-black tracking-tight">KK</span>
          </Link>
          {!collapsed ? <div className="min-w-0 flex-1"><p className="truncate text-sm font-black tracking-tight">Kampus Kita</p><p className="mt-0.5 text-[10px] font-bold text-slate-400">ADMIN WORKSPACE</p></div> : null}
          {!collapsed ? <button type="button" onClick={() => setCollapsed(true)} aria-label="Ciutkan menu" title="Ciutkan menu" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-800"><PanelLeftClose className="h-4 w-4" /></button> : null}
        </div>
        {collapsed ? <button type="button" onClick={() => setCollapsed(false)} aria-label="Perluas menu" title="Perluas menu" className="mx-auto mt-3 rounded-lg p-2 text-slate-400 hover:bg-slate-50"><Menu className="h-4 w-4" /></button> : null}
        <div id="admin-desktop-navigation" className={`mt-4 min-h-0 flex-1 overflow-y-auto ${collapsed ? "px-2" : "px-3"}`}>
          {collapsed ? <div className="space-y-2">{groups.flatMap((group) => group.items).map((item) => { const Icon = iconByKey[item.key] || LayoutDashboard; return <Link key={item.key} title={item.label} aria-label={item.label} aria-current={current?.key === item.key ? "page" : undefined} href={item.href} className={`mx-auto grid h-11 w-11 place-items-center rounded-xl ${current?.key === item.key ? "bg-emerald-50 text-emerald-800" : "text-slate-500 hover:bg-slate-50"}`}><Icon className="h-[18px] w-[18px]" /></Link>; })}</div> : navContent()}
        </div>
        <div className={`border-t border-slate-100 py-3 ${collapsed ? "px-2" : "px-3"}`}>
          {!collapsed ? <div className="mb-2 rounded-xl bg-emerald-50/70 px-3 py-2.5"><p className="truncate text-xs font-extrabold text-emerald-950">{actor.role === "superadmin" ? "Superadmin" : actor.label}</p><p className="mt-0.5 truncate text-[10px] font-medium text-emerald-800/70">{scopeText}</p></div> : null}
          <button type="button" onClick={logout} aria-label="Keluar" title="Keluar" className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-bold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 ${collapsed ? "justify-center px-0" : ""}`}><LogOut className="h-4 w-4" />{collapsed ? null : "Keluar"}</button>
        </div>
      </aside>

      <div hidden={!mobileOpen} className="fixed inset-0 z-50 bg-slate-950/35 lg:hidden" onClick={closeMobileNavigation}>
        <aside ref={mobileNavigationRef} id="admin-mobile-navigation" role="dialog" aria-modal={mobileOpen ? "true" : undefined} aria-label="Navigasi admin" className="flex h-full w-[min(86vw,310px)] flex-col bg-white px-3" onClick={(event) => event.stopPropagation()}>
          <div className="flex h-[72px] items-center justify-between border-b border-slate-100 px-2"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-800 text-sm font-black text-white">KK</span><span className="text-sm font-black">Kampus Kita</span></div><button type="button" onClick={closeMobileNavigation} className="rounded-lg p-2 text-slate-400" aria-label="Tutup menu"><X className="h-5 w-5" /></button></div>
          <div className="mt-4 flex-1 overflow-y-auto">{navContent(closeMobileNavigation)}</div>
          <div className="border-t border-slate-100 py-4"><p className="truncate px-3 text-xs font-bold">{actor.role === "superadmin" ? "Superadmin" : actor.label}</p><button type="button" onClick={logout} className="mt-2 flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-700"><LogOut className="h-4 w-4" />Keluar</button></div>
        </aside>
      </div>

      <main className={`min-h-screen transition-[padding] duration-200 ${collapsed ? "lg:pl-[84px]" : "lg:pl-[268px]"}`}>
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-slate-200/70 bg-white/90 px-4 backdrop-blur-xl sm:px-7">
          <button type="button" onClick={() => setMobileOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Buka navigasi admin" aria-haspopup="dialog" aria-expanded={mobileOpen} aria-controls="admin-mobile-navigation"><Menu className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1"><p className="hidden text-[10px] font-extrabold uppercase tracking-[.14em] text-emerald-700 sm:block">Kampus Kita Workspace</p><h1 className="truncate text-base font-black tracking-tight sm:mt-0.5 sm:text-lg">{currentTitle}</h1></div>
          <span className="hidden max-w-[220px] truncate rounded-full bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-900 md:block">{actor.role === "superadmin" ? "Semua kampus" : scopeText}</span>
          <Link href="/" target="_blank" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-800 sm:px-4">Lihat web <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </header>
        <div className="mx-auto max-w-[1480px] px-4 py-5 sm:px-7 sm:py-7">{children}</div>
      </main>
    </div>
  );
}
