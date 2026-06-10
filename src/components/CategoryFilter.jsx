"use client";

import { CATEGORIES as DEFAULT_CATEGORIES } from "@/lib/constants";
import { Icon } from "@/components/Icons";

const iconMap = {
  all: <Icon.Grid className="h-4 w-4" />,
  elektronik: <Icon.Laptop className="h-4 w-4" />,
  fashion: <Icon.Shirt className="h-4 w-4" />,
  buku: <Icon.Book className="h-4 w-4" />,
  makanan: <Icon.Coffee className="h-4 w-4" />,
  kos: <Icon.Home className="h-4 w-4" />,
  "buku-kuliah": <Icon.BookOpen className="h-4 w-4" />,
  jasa: <Icon.Briefcase className="h-4 w-4" />,
};

export default function CategoryFilter({ active, onChange, categories }) {
  const list = categories && categories.length ? categories : DEFAULT_CATEGORIES;
  const all = [{ name: "Semua", slug: "all" }, ...list];
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {all.map((c) => (
        <button
          key={c.slug}
          onClick={() => onChange(c.slug)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition active:scale-95 ${
            active === c.slug
              ? "border-primary bg-primary text-white dark:border-white dark:bg-white dark:text-gray-900"
              : "border-gray-200 bg-white text-gray-600 hover:border-primary/40 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <span>{iconMap[c.slug] || c.icon}</span>
          {c.name}
        </button>
      ))}
    </div>
  );
}
