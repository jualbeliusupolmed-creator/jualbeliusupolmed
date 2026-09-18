use client;

import Link from next/link;
import { usePathname } from next/navigation;
import { Icon } from ./Icons;
import { useSesi } from ./SesiProvider;
import { cn } from @/lib/utils;
import { useState, useEffect } from react;

export default function LeftSidebar() {
  const pathname = usePathname();
  const { nama, wa } = useSesi();
  const [unreadChat, setUnreadChat] = useState(0);

  useEffect(() => {
    function onUnread(e) {
      setUnreadChat(e.detail?.count ?? 0);
    }
    window.addEventListener(chat:unread, onUnread);
    const stored = parseInt(localStorage.getItem(chat_unread_count) || 0, 10);
    if (stored > 0) setUnreadChat(stored);
    return () => window.removeEventListener(chat:unread, onUnread);
  }, []);

  useEffect(() => {
    if (pathname?.startsWith(/chat)) {
      setUnreadChat(0);
      localStorage.setItem(chat_unread_count, 0);
    }
  }, [pathname]);

  const links = [
    { href: /, label: Beranda, icon: Icon.Home },
    { href: /jual-beli, label: Marketplace, icon: Icon.ShoppingBag },
    { href: /mading, label: Mading Kampus, icon: Icon.BookOpen },
    { href: /dicari, label: Dicari, icon: Icon.Search },
    { href: /chat, label: Chat, icon: Icon.MessageCircle, badge: unreadChat },
    { href: /teman, label: Cari Teman, icon: Icon.Users },
    { href: /organisasi, label: UKM & Organisasi, icon: Icon.Store },
    { href: /oprec, label: Oprec Kampus, icon: Icon.Megaphone },
  ];

  return (
    <div className=hidden md:flex min-w-0 flex-col w-[250px] sticky top-0 h-screen bg-transparent px-4 py-6 overflow-y-auto>
      <Link href=/ className=flex items-center gap-2 mb-8 px-2>
        <Icon.Store className=w-8 h-8 text-primary />
        <span className=font-bold text-xl tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]>JualBeli</span>
      </Link>

      <nav className=flex-1 space-y-2>
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !== / && pathname?.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                flex items-center gap-4 px-4 py-3 rounded-full transition-all group,
                isActive 
                  ? bg-black/[0.05] dark:bg-white/[0.08] font-bold text-[#1d1d1f] dark:text-white 
                  : text-gray-600 dark:text-gray-400 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] font-medium
              )}
            >
              <span className=relative shrink-0>
                <link.icon className={cn(w-6 h-6, isActive && text-primary)} />
                {link.badge > 0 && (
                  <span className=absolute -top-1 -right-1 min-w-[16px] h-4 bg-rose-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center px-0.5 shadow-sm>
                    {link.badge > 99 ? 99+ : link.badge}
                  </span>
                )}
              </span>
              <span className=text-[17px]>{link.label}</span>
            </Link>
          );
        })}

        <Link
          href={wa ? /dashboard?wa= : /profil}
          className={cn(
            flex items-center gap-4 px-4 py-3 rounded-full transition-all group,
            pathname?.startsWith(/dashboard) || pathname?.startsWith(/profil)
              ? bg-black/[0.05] dark:bg-white/[0.08] font-bold text-[#1d1d1f] dark:text-white 
              : text-gray-600 dark:text-gray-400 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] font-medium
          )}
        >
          <Icon.User className={cn(w-6 h-6, (pathname?.startsWith(/dashboard) || pathname?.startsWith(/profil)) && text-primary)} />
          <span className=text-[17px]>Profil</span>
        </Link>
      </nav>

      <div className="mt-auto space-y-3">
        {/* User status */}
        {wa ? (
          <Link
            href={`/dashboard?wa=${encodeURIComponent(wa)}`}
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.07] transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-sm">
              {(nama || wa).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-[#1d1d1f] dark:text-white truncate">{nama || "Toko Saya"}</p>
              <p className="text-[10px] text-slate-400 truncate">Lihat dashboard</p>
            </div>
            <Icon.ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-colors shrink-0" />
          </Link>
        ) : (
          <Link
            href="/jual"
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-primary/5 hover:bg-primary/10 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon.User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-primary">Login / Daftar</p>
              <p className="text-[10px] text-slate-400">Jual & beli di kampus</p>
            </div>
          </Link>
        )}
        <Link 
          href="/jual"
          className="w-full btn-primary text-[17px] py-4 rounded-full shadow-lg flex items-center justify-center gap-2"
        >
          <Icon.Plus className="w-5 h-5" />
          Pasang Iklan
        </Link>
      </div>
    </div>
  );
}
