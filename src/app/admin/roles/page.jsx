"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldCheck, Users, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

async function readJson(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Permintaan gagal.");
  return body;
}

function roleLabel(code) {
  if (code === "superadmin") return "Superadmin";
  if (code === "province_admin") return "Admin Provinsi";
  return "Admin Kampus";
}

function scopeLabel(a) {
  if (a.roleCode === "province_admin") return a.provinceId || "—";
  if (a.roleCode === "university_admin") return a.universityId || "—";
  return "—";
}

export default function RolesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [form, setForm] = useState({ account: "", roleCode: "superadmin", provinceId: "", universityId: "" });
  const [removingId, setRemovingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await readJson(await fetch("/api/admin/roles", { cache: "no-store" }));
      setItems(data.items || []);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const byUser = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      const existing = map.get(item.userId) || { email: item.email, roles: [] };
      existing.roles.push(item);
      map.set(item.userId, existing);
    }
    return [...map.entries()].map(([userId, value]) => ({ userId, ...value }));
  }, [items]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.account.trim()) {
      setError("Masukkan email atau UUID akun pengguna.");
      return;
    }
    setAssigning(true);
    setError("");
    setNotice("");
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(form.account.trim());
      const body = {
        userId: isUuid ? form.account.trim() : undefined,
        email: !isUuid ? form.account.trim() : undefined,
        roleCode: form.roleCode,
        provinceId: form.roleCode === "province_admin" ? form.provinceId.trim() : undefined,
        universityId: form.roleCode === "university_admin" ? form.universityId.trim() : undefined,
      };
      await readJson(await fetch("/api/admin/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
      setNotice(`Role ${roleLabel(form.roleCode)} berhasil diberikan kepada ${form.account}.`);
      setForm({ account: "", roleCode: "superadmin", provinceId: "", universityId: "" });
      await load();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemove(id) {
    if (!confirm("Cabut penugasan role ini?")) return;
    setRemovingId(id);
    setError("");
    setNotice("");
    try {
      await readJson(await fetch("/api/admin/roles", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }));
      setNotice("Role berhasil dicabut.");
      await load();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setRemovingId("");
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Manajemen Role Admin</h2>
          <p className="mt-1 text-sm text-slate-500">Atur multi-role admin untuk satu akun. Akun jualbeliusupolmed@gmail.com dan superadmin memegang kuasa penuh.</p>
        </div>
        <button type="button" onClick={() => load()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-800 active:opacity-85"><RefreshCw className="h-3.5 w-3.5" />Segarkan</button>
      </div>

      {error ? <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div> : null}
      {notice ? <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" />{notice}</div> : null}

      <div className="grid gap-4 sm:grid-cols-12">
        <div className="sm:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
          <h3 className="text-sm font-black mb-3">Berikan Role Baru</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email atau UUID Pengguna</label>
              <input
                value={form.account}
                onChange={(e) => setForm({ ...form, account: e.target.value })}
                placeholder="Contoh: jualbeliusupolmed@gmail.com"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-emerald-600"
                required
              />
              <p className="mt-1 text-[11px] text-slate-400">Dapat diisi email langsung atau UUID akun Supabase Auth.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pilihan Role</label>
              <select
                value={form.roleCode}
                onChange={(e) => setForm({ ...form, roleCode: e.target.value, provinceId: "", universityId: "" })}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-emerald-600"
              >
                <option value="superadmin">Superadmin (Kuasa Penuh Nasional)</option>
                <option value="province_admin">Admin Provinsi (Operasional & Kurasi FYP)</option>
                <option value="university_admin">Admin Kampus (Universitas)</option>
              </select>
            </div>
            {form.roleCode === "province_admin" ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ID Provinsi</label>
                <input
                  value={form.provinceId}
                  onChange={(e) => setForm({ ...form, provinceId: e.target.value })}
                  placeholder="Contoh: sumatera-utara"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-emerald-600"
                  required
                />
              </div>
            ) : form.roleCode === "university_admin" ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ID Universitas</label>
                <input
                  value={form.universityId}
                  onChange={(e) => setForm({ ...form, universityId: e.target.value })}
                  placeholder="Contoh: usu, polmed, unimed"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-emerald-600"
                  required
                />
              </div>
            ) : null}
            <button
              type="submit"
              disabled={assigning || !form.account.trim()}
              className="min-h-10 w-full rounded-full bg-emerald-800 px-4 text-xs font-extrabold text-white hover:bg-emerald-900 active:opacity-85 disabled:opacity-50"
            >
              {assigning ? "Memproses…" : "Simpan & Berikan Role"}
            </button>
          </form>
        </div>

        <div className="sm:col-span-7 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
          <h3 className="text-sm font-black mb-3">Daftar Admin & Multi-Role Aktif</h3>
          {loading && !items.length ? (
            <div className="grid min-h-48 place-items-center text-slate-400">
              <RefreshCw className="h-5 w-5 motion-safe:animate-spin" />
            </div>
          ) : byUser.length ? (
            <div className="divide-y divide-slate-100">
              {byUser.map(({ userId, email, roles }) => (
                <article key={userId} className="py-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold text-slate-900 truncate">{email}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400 font-mono truncate">{userId}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 sm:shrink-0">
                      {roles.map((role) => (
                        <span
                          key={role.id}
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                            role.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"
                          }`}
                        >
                          {roleLabel(role.roleCode)} ({scopeLabel(role)})
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1 sm:justify-end">
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        disabled={removingId === role.id}
                        onClick={() => handleRemove(role.id)}
                        className={`min-h-7 rounded-full px-2.5 text-[10px] font-bold active:opacity-85 ${
                          removingId === role.id ? "bg-slate-200 text-slate-400" : "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        }`}
                      >
                        {removingId === role.id ? "…" : `Cabut ${scopeLabel(role)}`}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid min-h-44 place-items-center px-5 text-center">
              <div>
                <Users className="mx-auto h-6 w-6 text-slate-300" />
                <p className="mt-3 text-sm font-extrabold text-slate-600">Belum ada role tambahan yang diberikan</p>
                <p className="mt-1 text-xs text-slate-400">Gunakan formulir di sebelah kiri untuk menugaskan peran admin baru.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950 flex items-start gap-2.5">
        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-700" />
        <div>
          <p className="font-extrabold text-emerald-900">Kuasa Penuh & Multi-Role Platform</p>
          <p className="mt-0.5 leading-relaxed text-emerald-800">
            Akun <b>jualbeliusupolmed@gmail.com</b> otomatis memegang wewenang Superadmin mutlak tanpa batasan. Anda dapat memberikan peran Admin Provinsi dan Admin Kampus tambahan kepada satu email sekaligus di sini.
          </p>
        </div>
      </div>
    </section>
  );
}
