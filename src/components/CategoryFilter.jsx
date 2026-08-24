"use client";

import { CATEGORIES as DEFAULT_CATEGORIES } from "@/lib/constants";
import { Icon } from "@/components/Icons";

const getCategoryIcon = (slug) => {
  const s = (slug || "").toLowerCase();
  switch (s) {
    case "all": return <Icon.Grid className="h-4 w-4" />;
    case "elektronik": return <Icon.Laptop className="h-4 w-4" />;
    case "fashion": return <Icon.Shirt className="h-4 w-4" />;
    case "buku": return <Icon.Book className="h-4 w-4" />;
    case "makanan": return <Icon.Coffee className="h-4 w-4" />;
    case "kos": return <Icon.Home className="h-4 w-4" />;
    case "buku-kuliah": return <Icon.BookOpen className="h-4 w-4" />;
    case "jasa": return <Icon.Briefcase className="h-4 w-4" />;
    default: return <Icon.Package className="h-4 w-4" />; // Fallback icon instead of emoji
  }
};

export default function CategoryFilter({ active, onChange, categories }) {
  const list = categories && categories.length ? categories : DEFAULT_CATEGORIES;
  const all = [{ name: "Semua", slug: "all" }, ...list];
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden no-tap-highlight">
      {all.map((c) => (
        <button
          key={c.slug}
          onClick={() => onChange(c.slug)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-200 active:scale-[0.95] ${
            active === c.slug
              ? "bg-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f] shadow-sm"
              : "bg-black/[0.04] text-[#3a3a3c] hover:bg-black/[0.07] dark:bg-white/[0.08] dark:text-slate-300 dark:hover:bg-white/[0.12] border border-black/[0.05] dark:border-white/[0.06]"
          }`}
        >
          <span className="opacity-80">{getCategoryIcon(c.slug)}</span>
          {c.name}
        </button>
      ))}
    </div>
  );
}
