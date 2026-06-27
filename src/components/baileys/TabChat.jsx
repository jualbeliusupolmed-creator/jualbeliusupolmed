"use client";
import { useState, useEffect, useRef } from "react";
import { useApi, apiPost } from "./api";
import { CopyBtn, Alert } from "./ui";

function ChatRoom({ chat, onClose }) {
  const num = chat.jid.split("@")[0];
  const { data, loading, error, refetch } = useApi(`messages?jid=${chat.jid}`);
  const [replyMsg, setReplyMsg] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyStatus, setReplyStatus] = useState(null);
  const messagesEndRef = useRef(null);

  // Jika error (misal endpoint tidak ada), tampilkan dummy agar UI tetap bisa didemokan
  const messages = error ? [
    { id: 1, text: "Halo, saya tertarik dengan listing Anda.", fromMe: false, timestamp: Date.now()/1000 - 3600 },
    { id: 2, text: "Tentu, barang masih tersedia. Ada yang ingin ditanyakan?", fromMe: true, timestamp: Date.now()/1000 - 3500 },
    { id: 3, text: "Apakah bisa nego?", fromMe: false, timestamp: Date.now()/1000 - 3400 },
    { id: 4, text: "(Ini adalah riwayat pesan contoh (dummy) karena API Baileys Anda gagal merespons atau belum memiliki endpoint /messages)", fromMe: true, timestamp: Date.now()/1000 },
  ] : (data?.messages || []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function sendReply() {
    if (!replyMsg.trim()) return;
    setReplying(true); setReplyStatus(null);
    const r = await apiPost("send", { target: num, message: replyMsg });
    setReplyStatus(r.status ? { ok: true, text: "✅ Terkirim!" } : { ok: false, text: `❌ ${r.reason || r.error}` });
    setReplying(false);
    if (r.status) { 
      setReplyMsg(""); 
      refetch(); // Reload messages
      setTimeout(() => setReplyStatus(null), 2000); 
    }
  }

  return (
    <div className="flex flex-col h-[600px] bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 px-4 py-3 border-b border-gray-200 dark:border-slate-700 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-gray-500 font-bold">
            {chat.name ? chat.name.charAt(0).toUpperCase() : num.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white leading-tight">{chat.name || `+${num}`}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">+{num}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={refetch} className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-full transition-colors" title="Refresh Chat">
            🔄
          </button>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 rounded-full transition-colors" title="Tutup">
            ✕
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && <div className="text-center text-sm text-gray-400 my-4">Memuat pesan...</div>}
        {error && (
          <div className="text-center text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 p-3 rounded-lg my-4">
            ⚠️ <b>Gagal memuat pesan riwayat asli dari server.</b><br/>
            (Pesan error dari API: <i>{error}</i>)<br/>
            Pastikan API Baileys Anda sudah mendukung endpoint <code>/messages?jid=xxx</code>.<br/>
            Menampilkan pesan <i>dummy</i> sebagai simulasi antarmuka.
          </div>
        )}
        
        {!loading && messages.length === 0 && !error && (
          <div className="text-center text-sm text-gray-400 my-10 bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg">
            Belum ada riwayat pesan yang bisa dimuat, atau endpoint <code>/messages?jid=...</code> belum didukung secara penuh oleh backend Baileys API Anda.
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe = msg.fromMe;
          return (
            <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                isMe 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-slate-700 rounded-bl-none shadow-sm'
              }`}>
                <p className="text-sm whitespace-pre-wrap break-words">{msg.text || (msg.image ? '📷 Foto' : msg.video ? '🎥 Video' : '💬 Pesan media/lainnya')}</p>
              </div>
              <span className="text-[10px] text-gray-400 mt-1 px-1">
                {msg.timestamp ? new Date(msg.timestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-slate-800 p-3 border-t border-gray-200 dark:border-slate-700 shrink-0">
        {replyStatus && <div className="mb-2"><Alert ok={replyStatus.ok} msg={replyStatus.text} /></div>}
        <div className="flex gap-2">
          <textarea 
            className="input flex-1 min-h-[44px] max-h-[120px] resize-y py-2.5 rounded-xl border-gray-300 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500" 
            placeholder="Ketik pesan balasan..." 
            value={replyMsg} 
            onChange={e => setReplyMsg(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendReply();
              }
            }}
          />
          <button 
            onClick={sendReply} 
            disabled={replying || !replyMsg.trim()} 
            className="btn-primary px-5 rounded-xl shrink-0 h-11 self-end disabled:opacity-50"
          >
            {replying ? "⏳" : "Kirim 🚀"}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 text-center">Tekan Enter untuk kirim, Shift+Enter untuk baris baru.</p>
      </div>
    </div>
  );
}

const DUMMY_CHATS = [
  { jid: "6281234567890@s.whatsapp.net", name: "Budi Santoso", preview: "Barangnya masih ada kak?" },
  { jid: "6285678901234@s.whatsapp.net", name: "Siti Rahayu", preview: "Bisa COD di kampus USU?" },
  { jid: "6287890123456@s.whatsapp.net", name: "Rizky Pratama", preview: "Harga bisa nego gak?" },
];

export function TabChat() {
  const { data, loading, error, refetch } = useApi("chats");
  const [search, setSearch] = useState("");
  const [activeChat, setActiveChat] = useState(null);

  const rawChats = error ? DUMMY_CHATS : (data?.chats || []);
  const chats = rawChats.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) || c.jid?.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold dark:text-white">💬 Kontrol Chat Interaktif</h2>
        <button onClick={refetch} className="btn-outline text-xs">🔄 Refresh Daftar</button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Chat List */}
        <div className={`flex-col lg:flex lg:w-1/3 shrink-0 space-y-4 ${activeChat ? 'hidden lg:flex' : 'flex'}`}>
          <input 
            className="input w-full shadow-sm rounded-xl" 
            placeholder="🔍 Cari nama atau nomor..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
          
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{chats.length} Percakapan</p>
          </div>

          {loading && <p className="text-sm text-gray-400 text-center py-4">Memuat daftar chat...</p>}
          {error && <Alert ok={false} msg={`⚠️ Endpoint /chats belum didukung server Baileys. Menampilkan data demo.`} />}

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
            {chats.map(c => (
              <div 
                key={c.jid} 
                onClick={() => setActiveChat(c)}
                className={`card flex items-start justify-between gap-3 p-3 cursor-pointer transition-colors border-2 ${
                  activeChat?.jid === c.jid 
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' 
                    : 'border-transparent hover:border-gray-300 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex gap-3 items-center min-w-0 flex-1">
                  <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold shadow-sm">
                    {c.name ? c.name.charAt(0).toUpperCase() : c.jid.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm dark:text-white truncate">{c.name || "–"}</p>
                    <p className="font-mono text-[10px] text-gray-500 truncate">+{c.jid.split("@")[0]}</p>
                    {c.preview && <p className="text-xs text-gray-500 truncate mt-0.5">{c.preview}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Active Chat Room */}
        <div className={`flex-1 lg:block ${!activeChat ? 'hidden lg:block' : 'block'}`}>
          {activeChat ? (
            <ChatRoom chat={activeChat} onClose={() => setActiveChat(null)} />
          ) : (
            <div className="h-[600px] flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 border-dashed rounded-2xl text-gray-400">
              <div className="w-16 h-16 mb-4 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-3xl shadow-sm">
                💬
              </div>
              <p className="font-medium text-gray-500 dark:text-gray-400">Pilih kontak untuk mulai berkirim pesan</p>
              <p className="text-sm mt-2 text-gray-400 dark:text-gray-500 max-w-sm text-center">Riwayat pesan akan ditampilkan di sini bergantung pada kapabilitas API Baileys Anda.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}