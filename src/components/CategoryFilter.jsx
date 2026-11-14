"use client";

import { CATEGORIES as DEFAULT_CATEGORIES } from "@/lib/constants";
import { Icon } from "@/components/Icons";

const getCategoryIcon = (slug) => {
  const s = (slug || "").toLowerCase();
  switch (s) {
    case "all": return <Icon.Grid className="h-4 w-4" aria-hidden="true" />;
    case "elektronik": return <Icon.Laptop className="h-4 w-4" aria-hidden="true" />;
    case "fashion": return <Icon.Shirt className="h-4 w-4" aria-hidden="true" />;
    case "buku": return <Icon.Book className="h-4 w-4" aria-hidden="true" />;
    case "makanan": return <Icon.Coffee className="h-4 w-4" aria-hidden="true" />;
    case "kos": return <Icon.Home className="h-4 w-4" aria-hidden="true" />;
    case "buku-kuliah": return <Icon.BookOpen className="h-4 w-4" aria-hidden="true" />;
    case "praktikum":
    case "alat-praktikum": return <Icon.Briefcase className="h-4 w-4" aria-hidden="true" />;
    case "jasa": return <Icon.Briefcase className="h-4 w-4" aria-hidden="true" />;
    default: return <Icon.Package className="h-4 w-4" aria-hidden="true" />;
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
          type="button"
          onClick={() => onChange(c.slug)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 ${
            active === c.slug
              ? "bg-emerald-800 text-white shadow-xs dark:bg-emerald-700 dark:text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-750"
          }`}
        >
          <span className={active === c.slug ? "text-emerald-200" : "text-slate-400 dark:text-slate-400"}>
            {getCategoryIcon(c.slug)}
          </span>
          {c.name}
        </button>
      ))}
    </div>
  );
}
