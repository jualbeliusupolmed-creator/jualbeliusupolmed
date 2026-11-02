"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Globe, MapPin, School, Check, LoaderCircle } from "lucide-react";

export default function ScopeSwitcher({ actor }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    activeScope: "all",
    isSuperadmin: false,
    availableScopes: [],
  });
  const menuRef = useRef(null);

  useEffect(() => {
    let ignore = false;
    fetch("/api/admin/scope-context")
      .then((res) => res.json())
      .then((body) => {
        if (!ignore && body.availableScopes) {
          setData(body);
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  async function switchScope(targetScopeId) {
    if (targetScopeId === data.activeScope) {
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      await fetch("/api/admin/scope-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: targetScopeId }),
      });
      setData((prev) => ({ ...prev, activeScope: targetScopeId }));
      setOpen(false);
      router.refresh();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const currentOption =
    data.availableScopes.find((s) => s.id === data.activeScope) ||
    (data.isSuperadmin
      ? { id: "all", label: "Semua Kampus (Nasional)", type: "all" }
      : { id: "default", label: "Cakupan Ditugaskan", type: "campus" });

  const IconComponent =
    currentOption.type === "all"
      ? Globe
      : currentOption.type === "province"
      ? MapPin
      : School;

  // Don't render switcher dropdown if there are <= 1 options and not superadmin
  if (!data.isSuperadmin && data.availableScopes.length <= 1) {
    return (
      <span className="hidden max-w-[220px] truncate rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-900 border border-emerald-200/60 md:inline-flex items-center gap-1.5">
        <IconComponent className="h-3 w-3 text-emerald-700" />
        <span className="truncate">{currentOption.label}</span>
      </span>
    );
  }

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-[11px] font-extrabold text-emerald-900 transition hover:bg-emerald-100 hover:border-emerald-300 shadow-2xs"
        aria-expanded={open}
        aria-haspopup="true"
        title="Beralih cakupan / konteks wilayah"
      >
        {loading ? (
          <LoaderCircle className="h-3 w-3 animate-spin text-emerald-700" />
        ) : (
          <IconComponent className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
        )}
        <span className="max-w-[170px] truncate text-left">{currentOption.label}</span>
        <ChevronDown className={`h-3 w-3 text-emerald-700 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-1">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Konteks Wilayah Kerja
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              Filter data ringkasan, marketplace & operasional.
            </p>
          </div>

          <div className="max-h-60 overflow-y-auto py-1 space-y-0.5">
            {data.availableScopes.map((scope) => {
              const active = scope.id === data.activeScope;
              const ScopeIcon =
                scope.type === "all"
                  ? Globe
                  : scope.type === "province"
                  ? MapPin
                  : School;

              return (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => switchScope(scope.id)}
                  className={`w-full flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-bold transition ${
                    active
                      ? "bg-emerald-50 text-emerald-900 font-extrabold"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ScopeIcon
                      className={`h-3.5 w-3.5 shrink-0 ${
                        active ? "text-emerald-700" : "text-slate-400"
                      }`}
                    />
                    <span className="truncate">{scope.label}</span>
                  </div>
                  {active && <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
