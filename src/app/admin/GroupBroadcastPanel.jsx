"use client";

import { useState, useEffect, useRef } from "react";

export default function GroupBroadcastPanel() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [logs, setLogs] = useState([]);
  const [sending, setSending] = useState(false);
  const stopRef = useRef(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  async function fetchGroups() {
    try {
      addLog("Memuat daftar grup...");
      const res = await fetch("/api/admin/broadcast-grup?action=groups");
      const data = await res.json();
      if (data.error) {
        addLog("❌ Gagal memuat grup dari API: " + data.error);
        if (data.error === "Unauthorized") {
          addLog("🔑 Tips: Pastikan BAILEYS_API_TOKEN di .env.local / Vercel sesuai dengan token bot WhatsApp.");
        }
      } else if (data.groups) {
        setGroups(data.groups);
        addLog(`✅ Memuat ${data.groups.length} grup.`);
        if (data.groups.length === 0) {
          addLog("⚠️ Daftar grup kosong. Jika baru scan QR, WhatsApp butuh beberapa menit untuk menyinkronkan grup.");
        }
      }
    } catch (e) {
      addLog("❌ Gagal memuat grup: " + e.message);
    }
  }

  async function fetchMembers(jid) {
    if (!jid) {
      setMembers([]);
      setSelectedMembers(new Set());
      return;
    }
    try {
      addLog("Memuat anggota grup...");
      const res = await fetch(`/api/admin/broadcast-grup?action=members&jid=${encodeURIComponent(jid)}`);
      const data = await res.json();
      if (data.error) {
        addLog("❌ Gagal memuat anggota: " + data.error);
      } else if (data.participants) {
        setMembers(data.participants);
        // Default pilih semua anggota
        setSelectedMembers(new Set(data.participants.map(m => m.id)));
        addLog(`✅ Memuat ${data.participants.length} anggota dari grup.`);
      }
    } catch (e) {
      addLog("❌ Gagal memuat anggota: " + e.message);
    }
  }

  function addLog(msg) {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  }

  function handleGroupChange(e) {
    const jid = e.target.value;
    setSelectedGroup(jid);
    fetchMembers(jid);
  }

  function toggleMember(id) {
    const newSet = new Set(selectedMembers);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedMembers(newSet);
  }

  function selectAll() {
    const newSet = new Set(members.map(m => m.id));
    setSelectedMembers(newSet);
  }

  function deselectAll() {
    setSelectedMembers(new Set());
  }

  function filterAdminsOnly() {
    const newSet = new Set(members.filter(m => m.admin).map(m => m.id));
    setSelectedMembers(newSet);
  }

  function filterMembersOnly() {
    const newSet = new Set(members.filter(m => !m.admin).map(m => m.id));
    setSelectedMembers(newSet);
  }

  async function startBroadcast() {
    if (!message.trim() && !imageUrl.trim()) return alert("Pesan teks atau URL gambar tidak boleh kosong");
    if (selectedMembers.size === 0) return alert("Pilih minimal 1 anggota");
    if (!confirm(`Mulai kirim ke ${selectedMembers.size} nomor? (Jeda aman: 6 detik/pesan)`)) return;

    setSending(true);
    stopRef.current = false;
    const targetArr = Array.from(selectedMembers);
    addLog(`🚀 Memulai broadcast ke ${targetArr.length} anggota...`);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < targetArr.length; i++) {
      if (stopRef.current) {
        addLog("⏹️ Broadcast dihentikan oleh admin.");
        break;
      }

      const target = targetArr[i];
      const phone = target.split('@')[0];
      addLog(`[${i+1}/${targetArr.length}] Mengirim ke ${phone}...`);
      
      try {
        const payload = { target, message: message.trim() };
        if (imageUrl.trim()) payload.imageUrl = imageUrl.trim();

        const res = await fetch("/api/admin/broadcast-grup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok || data.ok) {
          success++;
          addLog(`[${i+1}/${targetArr.length}] ✅ Berhasil dikirim ke ${phone}.`);
        } else {
          failed++;
          addLog(`[${i+1}/${targetArr.length}] ❌ Gagal ke ${phone}: ${data.error || 'Gagal mengirim'}`);
        }
      } catch (e) {
        failed++;
        addLog(`[${i+1}/${targetArr.length}] ❌ Error ke ${phone}: ${e.message}`);
      }

      if (i < targetArr.length - 1 && !stopRef.current) {
        await new Promise(r => setTimeout(r, 6000));
      }
    }

    addLog(`🎉 Selesai! Berhasil: ${success}, Gagal: ${failed}`);
    setSending(false);
  }

  function handleStop() {
    if (!sending) return;
    if (confirm("Hentikan pengiriman broadcast sekarang?")) {
      stopRef.current = true;
      addLog("Mengirim sinyal berhenti...");
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="card p-6">
        <h2 className="mb-2 text-lg font-bold dark:text-white">📢 Broadcast Japri Member Grup</h2>
        <p className="mb-4 text-sm text-gray-500">
          Tarik nomor anggota dari grup WhatsApp dan kirimkan broadcast promosi ke tiap-tiap orang secara otomatis.
          <br/><b>Batas aman anti-banned:</b> Pengiriman diatur otomatis 1 pesan setiap 6 detik (10 pesan per menit).
        </p>

        <div className="space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium dark:text-gray-300">1. Pilih Grup WhatsApp</label>
              <button onClick={fetchGroups} disabled={sending} className="text-xs text-blue-600 hover:underline">🔄 Segarkan Grup</button>
            </div>
            <select className="input" value={selectedGroup} onChange={handleGroupChange} disabled={sending}>
              <option value="">-- Pilih Grup --</option>
              {groups.map(g => (
                <option key={g.jid} value={g.jid}>{g.name} ({g.participants} anggota){g.isAdmin ? ' ★ Admin' : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium dark:text-gray-300">2. Pilih Anggota Penerima</label>
              <div className="flex flex-wrap gap-2 text-xs">
                <button onClick={selectAll} disabled={sending || members.length===0} className="text-blue-600 hover:underline">Semua</button>
                <button onClick={filterMembersOnly} disabled={sending || members.length===0} className="text-indigo-600 hover:underline">Member Saja</button>
                <button onClick={filterAdminsOnly} disabled={sending || members.length===0} className="text-amber-600 hover:underline">Admin Saja</button>
                <button onClick={deselectAll} disabled={sending || members.length===0} className="text-rose-600 hover:underline">Kosongkan</button>
              </div>
            </div>
            
            <div className="h-48 overflow-y-auto border rounded-lg p-2 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              {members.length === 0 ? (
                <p className="text-xs text-gray-500 p-2 text-center">Pilih grup terlebih dahulu untuk memuat anggota.</p>
              ) : (
                members.map((m, i) => (
                  <label key={i} className="flex items-center justify-between p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer rounded text-xs">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" disabled={sending} checked={selectedMembers.has(m.id)} onChange={() => toggleMember(m.id)} />
                      <span className="font-mono dark:text-gray-300">{m.id.split('@')[0]}</span>
                    </div>
                    {m.admin && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-semibold">
                        {m.admin}
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Terpilih: <b>{selectedMembers.size}</b> dari {members.length} anggota</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium dark:text-gray-300">3. Pesan Broadcast</label>
            <textarea
              className="input min-h-[120px]"
              placeholder="Tulis pesan... Dukung format *tebal*, _miring_, ~coret~"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium dark:text-gray-300">URL Gambar (Opsional)</label>
            <input
              type="url"
              className="input"
              placeholder="https://contoh.com/gambar.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              disabled={sending}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={startBroadcast}
              disabled={sending || selectedMembers.size === 0 || (!message.trim() && !imageUrl.trim())}
              className="btn-primary flex-1"
            >
              {sending ? `Mengirim... (Lihat Log di Bawah)` : `🚀 Kirim ke ${selectedMembers.size} Nomor`}
            </button>
            {sending && (
              <button
                onClick={handleStop}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition"
              >
                ⏹️ Hentikan
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card p-6 mt-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold dark:text-white">Terminal Log Pengiriman</h3>
          <button
            onClick={() => setLogs([])}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Bersihkan
          </button>
        </div>
        <div className="h-44 overflow-y-auto bg-slate-900 text-green-400 p-3 rounded-lg text-xs font-mono">
          {logs.length === 0 ? "Menunggu aksi..." : logs.map((l, i) => <div key={i} className="mb-0.5">{l}</div>)}
        </div>
      </div>
    </div>
  );
}
