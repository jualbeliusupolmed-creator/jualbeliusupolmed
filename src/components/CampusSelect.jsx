"use client";

import { useCallback, useEffect, useState } from "react";

export default function CampusSelect({ value, onChange, className = "", includeAll = true, required = false }) {
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
        if (Array.isArray(data?.campuses)) setCampuses(data.campuses);
        else throw new Error("Katalog kampus tidak tersedia");
      })
      .catch((err) => setError(err.message || "Gagal memuat kampus"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCampuses();
  }, [loadCampuses]);

  const known = campuses.some((campus) => campus.shortName === value);
  return (
    <div className="space-y-1">
      <select value={value || ""} onChange={(event) => onChange(event.target.value)} className={className} required={required} disabled={loading || Boolean(error)}>
        {loading && <option value="">Memuat kampus…</option>}
        {!loading && error && <option value="">Kampus belum tersedia</option>}
        {!loading && !error && !value && !includeAll && <option value="">Pilih kampus</option>}
        {includeAll && <option value="Semua">Semua Kampus</option>}
      {!known && value && value !== "Semua" && <option value={value}>{value}</option>}
      {campuses.map((campus) => (
        <option key={campus.shortName} value={campus.shortName}>
          {campus.shortName} — {campus.name}
        </option>
      ))}
      </select>
      {error && (
        <div className="flex items-center justify-between gap-2 text-xs text-rose-600 dark:text-rose-400">
          <span>{error}</span>
          <button type="button" onClick={loadCampuses} className="font-bold underline underline-offset-2">
            Coba lagi
          </button>
        </div>
      )}
    </div>
  );
}
