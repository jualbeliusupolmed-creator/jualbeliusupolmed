"use client";

import { useCallback, useEffect, useState } from "react";

export default function CampusSelect({
    value,
    onChange,
    className = "",
    includeAll = true,
    required = false,
    id,
    ariaLabel = "Pilih kampus",
  provinceId,
  allProvinces = false,
}) {
    const [campuses, setCampuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

  const loadCampuses = useCallback(() => {
    setLoading(true);
    setError("");
    fetch("/api/kampus", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat katalog kampus");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data?.campuses)) {
          if (allProvinces) {
            setCampuses(data.campuses);
          } else {
            const prefProv = typeof window !== "undefined" ? localStorage.getItem("preferred_province") : null;
            const prefCamp = typeof window !== "undefined" ? localStorage.getItem("preferred_campus") : null;
            const targetProv = provinceId || prefProv || (prefCamp && data.campuses.find((c) => c.shortName?.toLowerCase() === prefCamp.toLowerCase())?.provinceId) || "sumatera-utara";
            const filtered = data.campuses.filter((c) => (c.provinceId || "sumatera-utara") === targetProv);
            setCampuses(filtered.length > 0 ? filtered : data.campuses);
          }
        } else {
          throw new Error("Katalog kampus tidak tersedia");
        }
      })
      .catch((err) => setError(err.message || "Gagal memuat kampus"))
      .finally(() => setLoading(false));
  }, [provinceId, allProvinces]);

    useEffect(() => {
        loadCampuses();
    }, [loadCampuses]);

    const known = campuses.some((campus) => campus.shortName === value);
    return (
        <div className="space-y-1">
            <select id={id} aria-label={ariaLabel} value={value || ""} onChange={(event) => onChange(event.target.value)} className={className} required={required} disabled={loading || Boolean(error)}>
                {loading && <option value="">Memuat kampus…</option>}
                {!loading && error && <option value="">Kampus belum tersedia</option>}
                {!loading && !error && !value && !includeAll && <option value="">Pilih kampus</option>}
                {includeAll && <option value="Semua">Semua Kampus</option>}
                {!known && value && value !== "Semua" && <option value={value}>{value}</option>}
                {campuses.map((campus) => (
                    <option key={campus.shortName} value={campus.shortName}>
                        {campus.name} ({campus.shortName})
                    </option>
                ))}
            </select>
            {error && (
                <div className="flex items-center justify-between gap-2 text-xs text-rose-600 dark:text-rose-400">
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={loadCampuses}
                        className="font-semibold underline underline-offset-2 transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50"
                    >
                        Coba lagi
                    </button>
                </div>
            )}
        </div>
    );
}
