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
    case "praktikum":
    case "alat-praktikum": return <Icon.Sparkles className="h-4 w-4" />;
    case "jasa": return <Icon.Briefcase className="h-4 w-4" />;
    default: return <Icon.Package className="h-4 w-4" />; // Fallback icon
  }
};

export default function CategoryFilter({ active, onChange, categories }) {
  const list = categories && categories.length ? categories : DEFAULT_CATEGORIES;
  const all = list.some((category) => category.slug === "all")
    ? list
    : [{ name: "Semua", slug: "all" }, ...list];
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden no-tap-highlight">
      {all.map((c) => (
        <button
          key={c.slug}
          onClick={() => onChange(c.slug)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-200 active:scale-[0.96] ${
            active === c.slug
              ? "bg-[#047857] text-white shadow-sm shadow-[#047857]/25 dark:bg-emerald-600 dark:text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/80 border border-slate-200/70 dark:border-white/10"
          }`}
        >
          <span className={active === c.slug ? "text-emerald-100" : "text-slate-400 dark:text-slate-400"}>
            {getCategoryIcon(c.slug)}
          </span>
          {c.name}
        </button>
      ))}
    </div>
  );
}
