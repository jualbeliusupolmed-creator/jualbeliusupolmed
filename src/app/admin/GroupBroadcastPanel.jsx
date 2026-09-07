"use client";

import { useState, useEffect } from "react";

export default function GroupBroadcastPanel() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState([]);
  const [sending, setSending] = useState(false);

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
      if (data.participants) {
        setMembers(data.participants);
        setSelectedMembers(new Set());
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

  async function startBroadcast() {
    if (!message.trim()) return alert("Pesan tidak boleh kosong");
    if (selectedMembers.size === 0) return alert("Pilih minimal 1 anggota");
    if (!confirm(`Mulai kirim ke ${selectedMembers.size} nomor? (1 pesan per 6 detik)`)) return;

    setSending(true);
    const targetArr = Array.from(selectedMembers);
    addLog(`🚀 Memulai broadcast ke ${targetArr.length} anggota...`);

    for (let i = 0; i < targetArr.length; i++) {
      const target = targetArr[i];
      addLog(`[${i+1}/${targetArr.length}] Mengirim ke ${target.split('@')[0]}...`);
      try {
        const res = await fetch("/api/admin/broadcast-grup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target, message })
        });
        const data = await res.json();
        if (res.ok || data.ok) {
          addLog(`[${i+1}/${targetArr.length}] ✅ Berhasil dikirim.`);
        } else {
          addLog(`[${i+1}/${targetArr.length}] ❌ Gagal: ${data.error || 'Unknown error'}`);
        }
      } catch (e) {
        addLog(`[${i+1}/${targetArr.length}] ❌ Error: ${e.message}`);
      }

      if (i < targetArr.length - 1) {
        await new Promise(r => setTimeout(r, 6000));
      }
    }

    addLog("🎉 Selesai!");
    setSending(false);
  }

  return (
    <div className="max-w-2xl">
      <div className="card p-6">
        <h2 className="mb-4 text-lg font-bold dark:text-white">Broadcast Member Grup</h2>
        <p className="mb-4 text-sm text-gray-500">
          Tarik nomor anggota dari grup dan kirimkan broadcast promosi ke tiap-tiap orang secara massal.
          <br/><b>Batas aman:</b> Pengiriman diatur otomatis 1 pesan setiap 6 detik (10 pesan per menit).
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
                <option key={g.jid} value={g.jid}>{g.name} ({g.participants} anggota)</option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium dark:text-gray-300">2. Pilih Anggota</label>
              <div className="flex gap-2">
                <button onClick={selectAll} disabled={sending || members.length===0} className="text-xs text-blue-600 hover:underline">Pilih Semua</button>
                <button onClick={deselectAll} disabled={sending || members.length===0} className="text-xs text-rose-600 hover:underline">Hapus Semua</button>
              </div>
            </div>
            
            <div className="h-48 overflow-y-auto border rounded-lg p-2 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              {members.length === 0 ? (
                <p className="text-xs text-gray-500 p-2">Pilih grup terlebih dahulu untuk memuat anggota.</p>
              ) : (
                members.map((m, i) => (
                  <label key={i} className="flex items-center gap-2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer rounded">
                    <input type="checkbox" disabled={sending} checked={selectedMembers.has(m.id)} onChange={() => toggleMember(m.id)} />
                    <span className="text-sm dark:text-gray-300">{m.id.split('@')[0]} {m.admin ? '(Admin)' : ''}</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Terpilih: <b>{selectedMembers.size}</b> dari {members.length} anggota</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium dark:text-gray-300">3. Pesan</label>
            <textarea
              className="input min-h-[120px]"
              placeholder="Tulis pesan..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
            />
          </div>

          <button onClick={startBroadcast} disabled={sending || selectedMembers.size===0 || !message} className="btn-primary w-full">
            {sending ? "Mengirim (Lihat Log di Bawah)..." : `Kirim Sekarang ke ${selectedMembers.size} Nomor`}
          </button>
        </div>
      </div>

      <div className="card p-6 mt-4">
        <h3 className="mb-2 font-bold dark:text-white">Log Pengiriman</h3>
        <div className="h-40 overflow-y-auto bg-slate-900 text-green-400 p-3 rounded-lg text-xs font-mono">
          {logs.length === 0 ? "Menunggu aksi..." : logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}
