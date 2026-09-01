"use client";
import { useState, useEffect, useRef } from "react";
import { useApi, apiPost, normalizeJid } from "./api";
import { Alert, CopyBtn, QRDisplay } from "./ui";

const SUB_TABS = [
  { id: "koneksi",    label: " Koneksi" },
  { id: "pesan",      label: "Pesan" },
  { id: "media",      label: " Media" },
  { id: "interaktif", label: " Interaktif" },
  { id: "grup",       label: "Grup" },
  { id: "komunitas",  label: "Komunitas" },
  { id: "saluran",    label: "Saluran" },
  { id: "akun",       label: " Akun & Privasi" },
  { id: "panggilan",  label: " Panggilan" },
  { id: "forensik",   label: " Forensik" },
  { id: "protokol",   label: " Protokol (raw)" },
  { id: "antiban",    label: " Anti-Ban" },
];

function Section({ title, children }) {
  return (
    <div className="card p-5 space-y-4">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function GroupSelect({ value, onChange }) {
  const { data } = useApi("groups");
  const groups = data?.groups || [];
  if (!groups.length) return null;
  return (
    <select className="input mt-1 text-sm" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">— Pilih grup (opsional) —</option>
      {groups.map(g => <option key={g.jid} value={g.jid}>{g.name}</option>)}
    </select>
  );
}

// ── Koneksi ──────────────────────────────────────────────────────────────────
function PanelKoneksi() {
  const { data, loading, refetch } = useApi("status");
  const [code, setCode] = useState(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [loadingCode, setLoadingCode] = useState(false);
  const [msg, setMsg] = useState(null);
  const [devices, setDevices] = useState(null);

  async function getPairingCode(e) {
    e.preventDefault();
    setLoadingCode(true); setMsg(null);
    const r = await apiPost("pairing-code", { phone: phoneInput.replace(/\D/g, "") });
    if (r.code) setCode(r.code);
    else setMsg({ ok: false, text: r.error || "Gagal mendapatkan pairing code" });
    setLoadingCode(false);
  }

  async function getDevices() {
    const r = await apiPost("session/devices");
    setDevices(r.devices || r);
  }

  return (
    <div className="space-y-4">
      <Section title="Status Koneksi">
        {loading ? <p className="text-sm text-gray-400">Memuat...</p> : data && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
              <p className="text-xs text-gray-400">Status</p>
              <p className="font-bold text-sm dark:text-white">{data.connected ? "Terhubung" : "Terputus"}</p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
              <p className="text-xs text-gray-400">Nomor</p>
              <p className="font-mono font-bold text-sm dark:text-white">{data.phone ? `+${data.phone}` : "–"}</p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
              <p className="text-xs text-gray-400">Uptime</p>
              <p className="font-bold text-sm dark:text-white">{data.uptime ? `${Math.floor(data.uptime/3600)}j ${Math.floor((data.uptime%3600)/60)}m` : "–"}</p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
              <p className="text-xs text-gray-400">Perangkat</p>
              <p className="font-bold text-sm dark:text-white">{data.deviceName || "–"}</p>
            </div>
          </div>
        )}
        <button onClick={refetch} className="btn-outline text-xs">Refresh</button>
      </Section>

      <Section title="Login via QR Code">
        {data?.hasQR ? <QRDisplay /> : <p className="text-sm text-gray-400">Bot sudah terhubung atau QR tidak tersedia.</p>}
      </Section>

      <Section title="Login via Pairing Code (tanpa kamera)">
        <form onSubmit={getPairingCode} className="flex gap-2">
          <input className="input flex-1" placeholder="628xxxxxxxxxx" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} required />
          <button type="submit" disabled={loadingCode} className="btn-primary shrink-0">{loadingCode ? "..." : "Minta Kode"}</button>
        </form>
        {code && (
          <div className="rounded-xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-900/20 p-4 text-center">
            <p className="text-xs text-blue-500 mb-1">Masukkan kode ini di WA → Perangkat Tertaut → Tautkan dengan Nomor Telepon</p>
            <p className="text-4xl font-black tracking-widest text-blue-700 dark:text-blue-300">{code}</p>
            <CopyBtn text={code} />
          </div>
        )}
        <Alert ok={msg?.ok} msg={msg?.text} />
      </Section>

      <Section title="Perangkat Tertaut">
        <button onClick={getDevices} className="btn-outline text-sm">Lihat Semua Perangkat</button>
        {devices && (
          <pre className="mt-2 rounded-lg bg-gray-50 dark:bg-slate-800 p-3 text-xs dark:text-slate-300 overflow-auto max-h-48">
            {JSON.stringify(devices, null, 2)}
          </pre>
        )}
      </Section>
    </div>
  );
}

// ── Pesan Teks ───────────────────────────────────────────────────────────────
function PanelPesan() {
  const [mode, setMode] = useState("text");
  const [target, setTarget] = useState("");
  const [msg, setMsg] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [mentions, setMentions] = useState("");
  const [editId, setEditId] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const [forwardTarget, setForwardTarget] = useState("");
  const [forwardId, setForwardId] = useState("");
  const [disappearingTarget, setDisappearingTarget] = useState("");
  const [disappearTimer, setDisappearTimer] = useState("86400");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run(endpoint, body) {
    setBusy(true); setResult(null);
    const r = await apiPost(endpoint, body);
    setResult(r.ok || r.status ? { ok: true, text: "Berhasil!" } : { ok: false, text: r.error || "Gagal" });
    setBusy(false);
  }

  const modes = [
    ["text", " Teks"], ["quote", "↩ Quote"], ["mention", " Mention"],
    ["forward", "Forward"], ["edit", "Edit"], ["delete", "Tarik"],
    ["disappear", "Disappearing"],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b dark:border-slate-700 pb-2">
        {modes.map(([k, l]) => (
          <button key={k} onClick={() => { setMode(k); setResult(null); }}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${mode === k ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"}`}>
            {l}
          </button>
        ))}
      </div>
      <Alert ok={result?.ok} msg={result?.text} />

      {mode === "text" && (
        <Section title="Kirim Teks Biasa">
          <Field label="Tujuan"><input className="input" placeholder="628xxx atau JID grup" value={target} onChange={e => setTarget(e.target.value)} /><GroupSelect value={target} onChange={setTarget} /></Field>
          <Field label="Pesan"><textarea className="input min-h-[80px]" value={msg} onChange={e => setMsg(e.target.value)} /></Field>
          <button disabled={busy} onClick={() => run("send", { target: normalizeJid(target), message: msg })} className="btn-primary">{busy ? "..." : "Kirim"}</button>
        </Section>
      )}

      {mode === "quote" && (
        <Section title="Balas / Quote Pesan">
          <Field label="Tujuan"><input className="input" placeholder="628xxx atau JID grup" value={target} onChange={e => setTarget(e.target.value)} /></Field>
          <Field label="ID Pesan yang Dikutip" hint="Message ID dari pesan yang mau di-reply"><input className="input font-mono" placeholder="ABCDEF123..." value={quoteId} onChange={e => setQuoteId(e.target.value)} /></Field>
          <Field label="Balasan"><textarea className="input min-h-[80px]" value={msg} onChange={e => setMsg(e.target.value)} /></Field>
          <button disabled={busy} onClick={() => run("send-quote", { target: normalizeJid(target), message: msg, quotedId: quoteId })} className="btn-primary">{busy ? "..." : "Kirim Reply"}</button>
        </Section>
      )}

      {mode === "mention" && (
        <Section title="Kirim dengan Mention">
          <Field label="Tujuan (grup)"><input className="input" placeholder="120363xxx@g.us" value={target} onChange={e => setTarget(e.target.value)} /><GroupSelect value={target} onChange={setTarget} /></Field>
          <Field label="Nomor yang di-mention (pisah koma)" hint="Contoh: 628111,628222"><input className="input" value={mentions} onChange={e => setMentions(e.target.value)} /></Field>
          <Field label="Pesan"><textarea className="input min-h-[80px]" value={msg} onChange={e => setMsg(e.target.value)} /></Field>
          <button disabled={busy} onClick={() => run("send-mention", { target, message: msg, mentions: mentions.split(",").map(m => normalizeJid(m.trim())).filter(Boolean) })} className="btn-primary">{busy ? "..." : "Kirim + Mention"}</button>
        </Section>
      )}

      {mode === "forward" && (
        <Section title="Forward Pesan">
          <Field label="ID Pesan Asli"><input className="input font-mono" placeholder="ABCDEF123..." value={forwardId} onChange={e => setForwardId(e.target.value)} /></Field>
          <Field label="Tujuan Forward"><input className="input" placeholder="628xxx atau JID grup" value={forwardTarget} onChange={e => setForwardTarget(e.target.value)} /><GroupSelect value={forwardTarget} onChange={setForwardTarget} /></Field>
          <button disabled={busy} onClick={() => run("forward-message", { messageId: forwardId, target: normalizeJid(forwardTarget) })} className="btn-primary">{busy ? "..." : "Forward"}</button>
        </Section>
      )}

      {mode === "edit" && (
        <Section title="Edit Pesan Terkirim">
          <Field label="Tujuan (chat asal pesan)"><input className="input" placeholder="628xxx atau JID grup" value={target} onChange={e => setTarget(e.target.value)} /></Field>
          <Field label="ID Pesan yang Diedit"><input className="input font-mono" placeholder="ABCDEF123..." value={editId} onChange={e => setEditId(e.target.value)} /></Field>
          <Field label="Teks Baru"><textarea className="input min-h-[80px]" value={msg} onChange={e => setMsg(e.target.value)} /></Field>
          <button disabled={busy} onClick={() => run("edit-message", { target: normalizeJid(target), messageId: editId, newText: msg })} className="btn-primary">{busy ? "..." : "Edit Pesan"}</button>
        </Section>
      )}

      {mode === "delete" && (
        <Section title="Tarik / Hapus Pesan">
          <Field label="Tujuan (chat asal pesan)"><input className="input" placeholder="628xxx atau JID grup" value={target} onChange={e => setTarget(e.target.value)} /></Field>
          <Field label="ID Pesan yang Ditarik"><input className="input font-mono" placeholder="ABCDEF123..." value={deleteId} onChange={e => setDeleteId(e.target.value)} /></Field>
          <button disabled={busy} onClick={() => run("delete-message", { target: normalizeJid(target), messageId: deleteId })} className="btn-primary bg-red-600 hover:bg-red-700">{busy ? "..." : "Tarik Pesan"}</button>
        </Section>
      )}

      {mode === "disappear" && (
        <Section title="Aktifkan Disappearing Messages">
          <Field label="Tujuan (chat / grup)"><input className="input" placeholder="628xxx atau JID grup" value={disappearingTarget} onChange={e => setDisappearingTarget(e.target.value)} /><GroupSelect value={disappearingTarget} onChange={setDisappearingTarget} /></Field>
          <Field label="Durasi Auto-Hapus">
            <select className="input" value={disappearTimer} onChange={e => setDisappearTimer(e.target.value)}>
              <option value="0">Nonaktifkan</option>
              <option value="86400">24 Jam</option>
              <option value="604800">7 Hari</option>
              <option value="7776000">90 Hari</option>
            </select>
          </Field>
          <button disabled={busy} onClick={() => run("set-disappearing", { target: normalizeJid(disappearingTarget), timer: Number(disappearTimer) })} className="btn-primary">{busy ? "..." : "Terapkan"}</button>
        </Section>
      )}
    </div>
  );
}

// ── Media & Dokumen ───────────────────────────────────────────────────────────
function PanelMedia() {
  const [mode, setMode] = useState("audio");
  const [target, setTarget] = useState("");
  const [file, setFile] = useState(null);
  const [lat, setLat] = useState(""); const [lng, setLng] = useState(""); const [locName, setLocName] = useState("");
  const [vcardName, setVcardName] = useState(""); const [vcardPhone, setVcardPhone] = useState("");
  const [caption, setCaption] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function uploadAndSend(endpoint, extra = {}) {
    if (!file && !["location", "vcard"].includes(mode)) return;
    setBusy(true); setResult(null);
    try {
      let url = null;
      if (file) {
        const fd = new FormData(); fd.append("file", file);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const ud = await up.json();
        if (!up.ok) throw new Error(ud.error || "Upload gagal");
        url = ud.url;
      }
      const r = await apiPost(endpoint, { target: normalizeJid(target), url, ...extra });
    setResult(r.ok || r.status ? { ok: true, text: "Berhasil dikirim!" } : { ok: false, text: r.error || "Gagal" });
    } catch (e) { setResult({ ok: false, text: e.message }); }
    setBusy(false);
  }

  const modes = [["audio", " Audio / VN"], ["doc", " Dokumen"], ["sticker", " Stiker"], ["location", " Lokasi"], ["vcard", " Kontak"], ["viewonce", " View Once"]];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b dark:border-slate-700 pb-2">
        {modes.map(([k, l]) => (
          <button key={k} onClick={() => { setMode(k); setResult(null); setFile(null); }}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${mode === k ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"}`}>
            {l}
          </button>
        ))}
      </div>
      <Alert ok={result?.ok} msg={result?.text} />

      <Field label="Tujuan">
        <input className="input" placeholder="628xxx atau JID grup" value={target} onChange={e => setTarget(e.target.value)} />
        <GroupSelect value={target} onChange={setTarget} />
      </Field>

      {mode === "audio" && (
        <Section title="Kirim Audio / Voice Note">
          <Field label="File Audio (mp3, ogg, m4a)" hint="Otomatis dikirim sebagai Voice Note asli (ikon biru)">
            <input type="file" accept="audio/*" className="input text-sm py-1.5" onChange={e => setFile(e.target.files[0])} />
          </Field>
          <button disabled={busy || !file || !target} onClick={() => uploadAndSend("send-audio", { ptt: true })} className="btn-primary">{busy ? "..." : "Kirim Voice Note"}</button>
        </Section>
      )}

      {mode === "doc" && (
        <Section title="Kirim Dokumen">
          <Field label="File Dokumen (PDF, Word, Excel, dll)">
            <input type="file" className="input text-sm py-1.5" onChange={e => setFile(e.target.files[0])} />
          </Field>
          <Field label="Caption (opsional)"><input className="input" value={caption} onChange={e => setCaption(e.target.value)} /></Field>
          <button disabled={busy || !file || !target} onClick={() => uploadAndSend("send-doc", { caption })} className="btn-primary">{busy ? "..." : "Kirim Dokumen"}</button>
        </Section>
      )}

      {mode === "sticker" && (
        <Section title="Kirim Stiker">
          <Field label="Gambar (PNG/JPG — dikonversi ke stiker WebP)">
            <input type="file" accept="image/*" className="input text-sm py-1.5" onChange={e => setFile(e.target.files[0])} />
          </Field>
          <button disabled={busy || !file || !target} onClick={() => uploadAndSend("send-sticker")} className="btn-primary">{busy ? "..." : "Kirim Stiker"}</button>
        </Section>
      )}

      {mode === "location" && (
        <Section title="Kirim Titik Lokasi">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude"><input className="input" type="number" step="any" placeholder="3.595" value={lat} onChange={e => setLat(e.target.value)} /></Field>
            <Field label="Longitude"><input className="input" type="number" step="any" placeholder="98.672" value={lng} onChange={e => setLng(e.target.value)} /></Field>
          </div>
          <Field label="Nama Lokasi (opsional)"><input className="input" placeholder="Kampus USU Medan" value={locName} onChange={e => setLocName(e.target.value)} /></Field>
          <button disabled={busy || !lat || !lng || !target} onClick={() => uploadAndSend("send-location", { latitude: Number(lat), longitude: Number(lng), name: locName })} className="btn-primary">{busy ? "..." : "Kirim Lokasi"}</button>
        </Section>
      )}

      {mode === "vcard" && (
        <Section title="Kirim Kartu Kontak">
          <Field label="Nama Kontak"><input className="input" value={vcardName} onChange={e => setVcardName(e.target.value)} /></Field>
          <Field label="Nomor WA Kontak"><input className="input" placeholder="628xxxxxxxxxx" value={vcardPhone} onChange={e => setVcardPhone(e.target.value)} /></Field>
          <button disabled={busy || !vcardName || !vcardPhone || !target} onClick={() => uploadAndSend("send-vcard", { name: vcardName, phone: vcardPhone.replace(/\D/g, "") })} className="btn-primary">{busy ? "..." : "Kirim Kontak"}</button>
        </Section>
      )}

      {mode === "viewonce" && (
        <Section title="Kirim View Once (Sekali Lihat)">
          <Field label="Gambar / Video">
            <input type="file" accept="image/*,video/*" className="input text-sm py-1.5" onChange={e => setFile(e.target.files[0])} />
          </Field>
          <button disabled={busy || !file || !target} onClick={() => uploadAndSend("send-view-once")} className="btn-primary">{busy ? "..." : "Kirim View Once"}</button>
        </Section>
      )}
    </div>
  );
}

// ── Fitur Interaktif ──────────────────────────────────────────────────────────
function PanelInteraktif() {
  const [mode, setMode] = useState("buttons");
  const [target, setTarget] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const [btnText, setBtnText] = useState("");
  const [buttons, setButtons] = useState([{ id: "1", text: "" }, { id: "2", text: "" }]);
  const [listTitle, setListTitle] = useState("");
  const [listSections, setListSections] = useState([{ title: "Pilihan", rows: [{ id: "1", title: "", description: "" }] }]);
  const [reactionMsgId, setReactionMsgId] = useState("");
  const [reactionEmoji, setReactionEmoji] = useState("like");

  async function run(endpoint, body) {
    setBusy(true); setResult(null);
    const r = await apiPost(endpoint, { target: normalizeJid(target), ...body });
    setResult(r.ok || r.status ? { ok: true, text: "Berhasil!" } : { ok: false, text: r.error || "Gagal" });
    setBusy(false);
  }

  const modes = [["buttons", " Tombol"], ["list", " Daftar Pilihan"], ["reaction", " Reaksi"]];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b dark:border-slate-700 pb-2">
        {modes.map(([k, l]) => (
          <button key={k} onClick={() => { setMode(k); setResult(null); }}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${mode === k ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"}`}>
            {l}
          </button>
        ))}
      </div>
      <Alert ok={result?.ok} msg={result?.text} />

      <Field label="Tujuan">
        <input className="input" placeholder="628xxx atau JID grup" value={target} onChange={e => setTarget(e.target.value)} />
        <GroupSelect value={target} onChange={setTarget} />
      </Field>

      {mode === "buttons" && (
        <Section title="Pesan dengan Tombol Aksi">
          <Field label="Teks Pesan"><textarea className="input min-h-[60px]" value={btnText} onChange={e => setBtnText(e.target.value)} /></Field>
          <p className="text-xs text-gray-400 font-medium">Tombol (maks 3):</p>
          {buttons.map((b, i) => (
            <div key={i} className="flex gap-2">
              <input className="input flex-1" placeholder={`Teks tombol ${i + 1}`} value={b.text} onChange={e => setButtons(bs => bs.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} />
              {buttons.length > 2 && <button onClick={() => setButtons(bs => bs.filter((_, j) => j !== i))} className="text-red-400 text-lg"></button>}
            </div>
          ))}
          {buttons.length < 3 && <button onClick={() => setButtons(bs => [...bs, { id: String(bs.length + 1), text: "" }])} className="text-xs text-blue-500 hover:underline">+ Tambah tombol</button>}
          <button disabled={busy || !target || !btnText} onClick={() => run("send-buttons", { text: btnText, buttons })} className="btn-primary">{busy ? "..." : "Kirim Pesan Tombol"}</button>
        </Section>
      )}

      {mode === "list" && (
        <Section title="Pesan Daftar Pilihan">
          <Field label="Judul Pesan"><input className="input" value={listTitle} onChange={e => setListTitle(e.target.value)} /></Field>
          {listSections[0].rows.map((row, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 mt-1">
              <input className="input text-sm" placeholder={`Pilihan ${i + 1}`} value={row.title} onChange={e => setListSections(s => [{ ...s[0], rows: s[0].rows.map((r, j) => j === i ? { ...r, title: e.target.value } : r) }])} />
              <input className="input text-sm" placeholder="Deskripsi (opsional)" value={row.description} onChange={e => setListSections(s => [{ ...s[0], rows: s[0].rows.map((r, j) => j === i ? { ...r, description: e.target.value } : r) }])} />
            </div>
          ))}
          {listSections[0].rows.length < 10 && <button onClick={() => setListSections(s => [{ ...s[0], rows: [...s[0].rows, { id: String(s[0].rows.length + 1), title: "", description: "" }] }])} className="text-xs text-blue-500 hover:underline">+ Tambah baris</button>}
          <button disabled={busy || !target || !listTitle} onClick={() => run("send-list", { title: listTitle, sections: listSections })} className="btn-primary">{busy ? "..." : "Kirim Daftar"}</button>
        </Section>
      )}

      {mode === "reaction" && (
        <Section title="Kirim Reaksi Emoji">
          <Field label="ID Pesan yang Direaksi"><input className="input font-mono" placeholder="ABCDEF123..." value={reactionMsgId} onChange={e => setReactionMsgId(e.target.value)} /></Field>
          <Field label="Emoji Reaksi">
            <div className="flex flex-wrap gap-2 mt-1">
              {["like","love","laugh","wow","sad","pray","fire","party","clap","ok","no","hundred"].map(e => (
                <button key={e} onClick={() => setReactionEmoji(e)} className={`text-xl rounded-lg p-1.5 border-2 transition-all ${reactionEmoji === e ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-slate-700"}`}>{e}</button>
              ))}
            </div>
          </Field>
          <button disabled={busy || !target || !reactionMsgId} onClick={() => run("send-reaction", { messageId: reactionMsgId, emoji: reactionEmoji })} className="btn-primary">{busy ? "..." : "Kirim Reaksi"}</button>
        </Section>
      )}
    </div>
  );
}

// ── Komunitas ─────────────────────────────────────────────────────────────────
function PanelKomunitas() {
  const [commList, setCommList] = useState(null);
  const [loading, setLoading] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [linkCommJid, setLinkCommJid] = useState("");
  const [linkGroupJid, setLinkGroupJid] = useState("");
  const [result, setResult] = useState(null);
  const { data: groupData } = useApi("groups");
  const groups = groupData?.groups || [];

  async function loadCommunities() {
    setLoading(true);
    const r = await apiPost("community/list");
    setCommList(r.communities || r);
    setLoading(false);
  }

  async function createCommunity(e) {
    e.preventDefault();
    setCreating(true); setResult(null);
    const r = await apiPost("community/create", { name: createName });
    setResult(r.ok ? { ok: true, text: `Komunitas "${createName}" berhasil dibuat!` } : { ok: false, text: r.error || "Gagal" });
    if (r.ok) { setCreateName(""); loadCommunities(); }
    setCreating(false);
  }

  async function linkGroup(e) {
    e.preventDefault(); setResult(null);
    const r = await apiPost("community/link-group", { communityJid: linkCommJid, groupJid: linkGroupJid });
    setResult(r.ok ? { ok: true, text: "Sub-grup berhasil ditautkan!" } : { ok: false, text: r.error || "Gagal" });
  }

  return (
    <div className="space-y-4">
      <Alert ok={result?.ok} msg={result?.text} />

      <Section title="Daftar Komunitas">
        <button onClick={loadCommunities} disabled={loading} className="btn-outline text-sm">{loading ? "Memuat..." : "Muat Komunitas"}</button>
        {Array.isArray(commList) && commList.map((c, i) => (
          <div key={i} className="rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
            <p className="font-semibold text-sm dark:text-white">{c.name || c.subject}</p>
            <p className="font-mono text-xs text-gray-400">{c.jid || c.id}</p>
          </div>
        ))}
      </Section>

      <Section title="Buat Komunitas Baru">
        <form onSubmit={createCommunity} className="flex gap-2">
          <input className="input flex-1" placeholder="Nama Komunitas" value={createName} onChange={e => setCreateName(e.target.value)} required />
          <button type="submit" disabled={creating} className="btn-primary shrink-0">{creating ? "..." : "Buat"}</button>
        </form>
      </Section>

      <Section title="Tautkan Sub-Grup ke Komunitas">
        <form onSubmit={linkGroup} className="space-y-3">
          <Field label="JID Komunitas"><input className="input font-mono" placeholder="628xxx@communities.net" value={linkCommJid} onChange={e => setLinkCommJid(e.target.value)} /></Field>
          <Field label="Pilih Sub-Grup">
            <select className="input" value={linkGroupJid} onChange={e => setLinkGroupJid(e.target.value)} required>
              <option value="">— Pilih grup —</option>
              {groups.map(g => <option key={g.jid} value={g.jid}>{g.name}</option>)}
            </select>
          </Field>
          <button type="submit" className="btn-primary"> Tautkan Sub-Grup</button>
        </form>
      </Section>
    </div>
  );
}

// ── Akun & Privasi ────────────────────────────────────────────────────────────
function PanelAkun() {
  const [checkNum, setCheckNum] = useState("");
  const [checkResult, setCheckResult] = useState(null);
  const [presenceJid, setPresenceJid] = useState("");
  const [presenceResult, setPresenceResult] = useState(null);
  const [privacy, setPrivacy] = useState({ lastSeen: "contacts", profilePhoto: "contacts", status: "contacts", readReceipts: true });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function checkNumber(e) {
    e.preventDefault(); setBusy(true); setCheckResult(null);
    const r = await apiPost("check-number", { phone: checkNum.replace(/\D/g, "") });
    setCheckResult(r);
    setBusy(false);
  }

  async function checkPresence(e) {
    e.preventDefault(); setBusy(true); setPresenceResult(null);
    const r = await apiPost("get-presence", { jid: normalizeJid(presenceJid) });
    setPresenceResult(r);
    setBusy(false);
  }

  async function savePrivacy() {
    setSaving(true); setResult(null);
    const r = await apiPost("set-privacy", privacy);
    setResult(r.ok ? { ok: true, text: "Setelan privasi disimpan!" } : { ok: false, text: r.error || "Gagal" });
    setSaving(false);
  }

  const privacyOptions = [["everyone", "Semua Orang"], ["contacts", "Kontak Saya"], ["none", "Tidak Ada"]];

  return (
    <div className="space-y-4">
      <Alert ok={result?.ok} msg={result?.text} />

      <Section title="Validasi Nomor WA">
        <form onSubmit={checkNumber} className="flex gap-2">
          <input className="input flex-1" placeholder="628xxxxxxxxxx" value={checkNum} onChange={e => setCheckNum(e.target.value)} required />
          <button type="submit" disabled={busy} className="btn-primary shrink-0">{busy ? "..." : "Cek"}</button>
        </form>
        {checkResult && (
          <div className={`rounded-xl p-3 text-sm ${checkResult.exists ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>
            {checkResult.exists ? `Nomor terdaftar di WhatsApp. JID: ${checkResult.jid || ""}` : "Nomor tidak terdaftar di WhatsApp."}
          </div>
        )}
      </Section>

      <Section title="Pantau Status Online (Presence)">
        <form onSubmit={checkPresence} className="flex gap-2">
          <input className="input flex-1" placeholder="628xxxxxxxxxx" value={presenceJid} onChange={e => setPresenceJid(e.target.value)} required />
          <button type="submit" disabled={busy} className="btn-primary shrink-0">{busy ? "..." : "Cek Online"}</button>
        </form>
        {presenceResult && (
          <pre className="rounded-lg bg-gray-50 dark:bg-slate-800 p-3 text-xs dark:text-slate-300 overflow-auto">{JSON.stringify(presenceResult, null, 2)}</pre>
        )}
      </Section>

      <Section title="Setelan Privasi Akun Bot">
        <div className="space-y-3">
          {[["lastSeen", "Last Seen"], ["profilePhoto", "Foto Profil"], ["status", "Status / Bio"]].map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm dark:text-white">{label}</span>
              <select className="input w-auto text-sm" value={privacy[key]} onChange={e => setPrivacy(p => ({ ...p, [key]: e.target.value }))}>
                {privacyOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <span className="text-sm dark:text-white">Read Receipt (Centang Biru)</span>
            <input type="checkbox" checked={privacy.readReceipts} onChange={e => setPrivacy(p => ({ ...p, readReceipts: e.target.checked }))} className="h-4 w-4 rounded" />
          </div>
        </div>
        <button onClick={savePrivacy} disabled={saving} className="btn-primary mt-2">{saving ? "..." : "Simpan Privasi"}</button>
      </Section>
    </div>
  );
}

// ── Setelan modul yang benar-benar dibaca bot ────────────────────────────────
// Sebelum ini, enam panel di bawah menyimpan setelannya ke kolom `bot_modules`
// di Supabase — kolom yang tidak dibaca siapa pun, termasuk bot. Sekarang
// setelannya dikirim ke bot lewat endpoint /modul, ke proses yang benar-benar
// memegang koneksi WhatsApp. Panel yang isinya tidak bisa dikerjakan bot ini
// (enkripsi sesi di database, provider AI, protobuf manual) sudah dicabut:
// sakelar yang berbohong lebih berbahaya daripada sakelar yang tidak ada.
function useModul(nama) {
  const [cfg, setCfg] = useState(null);
  const [gagalMuat, setGagalMuat] = useState(null);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let hidup = true;
    fetch(`/api/admin/baileys?endpoint=modul&_t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) => {
        if (!hidup) return;
        if (d?.modul?.[nama]) setCfg(d.modul[nama]);
        else setGagalMuat(d?.error || "Bot tidak menjawab — setelan tidak bisa dimuat.");
      })
      .catch((e) => hidup && setGagalMuat(e.message));
    return () => { hidup = false; };
  }, [nama]);

  async function simpan() {
    setSaving(true);
    setStatus(null);
    const r = await apiPost("modul", { [nama]: cfg });
    setStatus(r?.error
      ? { ok: false, text: r.error }
      : { ok: true, text: "Tersimpan di bot dan langsung berlaku - tidak perlu restart." });
    setSaving(false);
  }

  return { cfg, setCfg, simpan, saving, status, gagalMuat };
}

function ModulBelumSiap({ pesan }) {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
      <b>Setelan tidak bisa dimuat dari bot.</b> {pesan} Selama itu, jangan menyimpan dari
      halaman ini — yang tersimpan bisa menimpa setelan yang sedang dipakai bot.
    </div>
  );
}

// ── Panggilan ─────────────────────────────────────────────────────────────────
function PanelPanggilan() {
  const { cfg, setCfg, simpan, saving, status, gagalMuat } = useModul("panggilan");
  if (gagalMuat) return <ModulBelumSiap pesan={gagalMuat} />;
  if (!cfg) return <p className="text-sm text-gray-400">Memuat setelan dari bot…</p>;

  return (
    <div className="space-y-4">
      <Alert ok={status?.ok} msg={status?.text} />
      <Section title="Tolak & Balas Panggilan Masuk">
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input type="checkbox" className="h-4 w-4 rounded" checked={cfg.tolak}
              onChange={(e) => setCfg((c) => ({ ...c, tolak: e.target.checked }))} />
            <div>
              <p className="text-sm font-medium dark:text-white">Tolak Panggilan Otomatis</p>
              <p className="text-xs text-gray-400">Panggilan masuk langsung ditolak. Kalau dimatikan, panggilan dibiarkan berdering sampai habis.</p>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="h-4 w-4 rounded" checked={cfg.balas}
              onChange={(e) => setCfg((c) => ({ ...c, balas: e.target.checked }))} />
            <div>
              <p className="text-sm font-medium dark:text-white">Balas Teks Setelah Menolak</p>
              <p className="text-xs text-gray-400">Sekali per panggilan, supaya penelepon tahu harus mengetik.</p>
            </div>
          </label>
          {cfg.balas && (
            <Field label="Pesan Balasan">
              <textarea className="input min-h-[80px]" value={cfg.pesan}
                onChange={(e) => setCfg((c) => ({ ...c, pesan: e.target.value }))} />
            </Field>
          )}
        </div>
        <button onClick={simpan} disabled={saving} className="btn-primary mt-2">{saving ? "..." : "Simpan"}</button>
      </Section>
    </div>
  );
}

// ── Forensik ──────────────────────────────────────────────────────────────────
function PanelForensik() {
  const { cfg, setCfg, simpan, saving, status, gagalMuat } = useModul("forensik");
  const { data: groupData } = useApi("groups");
  const groups = groupData?.groups || [];
  if (gagalMuat) return <ModulBelumSiap pesan={gagalMuat} />;
  if (!cfg) return <p className="text-sm text-gray-400">Memuat setelan dari bot…</p>;

  return (
    <div className="space-y-4">
      <Alert ok={status?.ok} msg={status?.text} />
      <Section title="Pesan yang Ditarik & Diedit">
        <p className="text-xs text-gray-400">
          Yang bisa direkam hanya pesan yang sempat lewat selagi bot menyala. Pesan yang ditarik
          saat bot mati tidak bisa dipulihkan dari mana pun.
        </p>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input type="checkbox" className="h-4 w-4 rounded" checked={cfg.antiHapus}
              onChange={(e) => setCfg((c) => ({ ...c, antiHapus: e.target.checked }))} />
            <div>
              <p className="text-sm font-medium dark:text-white">Rekam Pesan yang Ditarik</p>
              <p className="text-xs text-gray-400">Isinya disimpan ke arsip pesan dan terlihat di dashboard bot.</p>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="h-4 w-4 rounded" checked={cfg.antiEdit}
              onChange={(e) => setCfg((c) => ({ ...c, antiEdit: e.target.checked }))} />
            <div>
              <p className="text-sm font-medium dark:text-white">Rekam Pesan yang Diedit</p>
              <p className="text-xs text-gray-400">Isi sebelum dan sesudah diedit dicatat berdampingan.</p>
            </div>
          </label>
          {(cfg.antiHapus || cfg.antiEdit) && (
            <Field label="Teruskan ke Nomor / Grup (opsional)">
              <input className="input" placeholder="628xxx atau JID grup" value={cfg.tujuanNotif}
                onChange={(e) => setCfg((c) => ({ ...c, tujuanNotif: e.target.value }))} />
              {groups.length > 0 && (
                <select className="input mt-1 text-sm" value={cfg.tujuanNotif}
                  onChange={(e) => setCfg((c) => ({ ...c, tujuanNotif: e.target.value }))}>
                  <option value="">— Pilih grup —</option>
                  {groups.map((g) => <option key={g.jid} value={g.jid}>{g.name}</option>)}
                </select>
              )}
            </Field>
          )}
        </div>
        <button onClick={simpan} disabled={saving} className="btn-primary mt-2">{saving ? "..." : "Simpan"}</button>
      </Section>
    </div>
  );
}

// ── Protokol: kirim payload mentah ────────────────────────────────────────────
function PanelProtokol() {
  const [rawPayload, setRawPayload] = useState('{"key": "value"}');
  const [rawResult, setRawResult] = useState(null);
  const [sending, setSending] = useState(false);

  async function sendRaw(e) {
    e.preventDefault();
    setSending(true);
    setRawResult(null);
    try {
      const body = JSON.parse(rawPayload);
      const r = await apiPost("send-raw", body);
      setRawResult(JSON.stringify(r, null, 2));
    } catch (e) { setRawResult("Error: " + e.message); }
    setSending(false);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400">
        Hanya untuk developer: payload dikirim apa adanya ke bot.
      </div>
      <Section title="Kirim Raw Payload ke Bot">
        <p className="text-xs text-gray-400">Untuk menguji endpoint bot saat mengembangkan fitur baru.</p>
        <form onSubmit={sendRaw} className="space-y-2">
          <textarea className="input min-h-[120px] font-mono text-xs" value={rawPayload}
            onChange={(e) => setRawPayload(e.target.value)} />
          <button type="submit" disabled={sending} className="btn-primary text-sm">{sending ? "..." : "Kirim Raw"}</button>
        </form>
        {rawResult && <pre className="max-h-48 overflow-auto rounded-lg bg-gray-50 p-3 text-xs dark:bg-slate-800 dark:text-slate-300">{rawResult}</pre>}
      </Section>
    </div>
  );
}

// ── Anti-Ban ──────────────────────────────────────────────────────────────────
function PanelAntiBan() {
  const { cfg, setCfg, simpan, saving, status, gagalMuat } = useModul("antiban");
  if (gagalMuat) return <ModulBelumSiap pesan={gagalMuat} />;
  if (!cfg) return <p className="text-sm text-gray-400">Memuat setelan dari bot…</p>;

  return (
    <div className="space-y-4">
      <Alert ok={status?.ok} msg={status?.text} />
      <Section title="Rem Laju Kirim">
        <div className="space-y-4">
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded" checked={cfg.sinyalMengetik}
              onChange={(e) => setCfg((c) => ({ ...c, sinyalMengetik: e.target.checked }))} />
            <div>
              <p className="text-sm font-medium dark:text-white">Sinyal “sedang mengetik”</p>
              <p className="text-xs text-gray-400">Dikirim sebelum balasan, supaya jedanya terlihat wajar.</p>
            </div>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded" checked={cfg.jedaAcak}
              onChange={(e) => setCfg((c) => ({ ...c, jedaAcak: e.target.checked }))} />
            <div>
              <p className="text-sm font-medium dark:text-white">Jeda Acak Antar Pesan</p>
              <p className="text-xs text-gray-400">Kalau dimatikan, bot memakai jeda bawaannya sendiri.</p>
            </div>
          </label>
          {cfg.jedaAcak && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Jeda minimum (ms)">
                <input type="number" min="0" className="input" value={cfg.jedaMin}
                  onChange={(e) => setCfg((c) => ({ ...c, jedaMin: Number(e.target.value) }))} />
              </Field>
              <Field label="Jeda maksimum (ms)">
                <input type="number" min="0" className="input" value={cfg.jedaMax}
                  onChange={(e) => setCfg((c) => ({ ...c, jedaMax: Number(e.target.value) }))} />
              </Field>
            </div>
          )}
          <Field label="Batas pesan per jam (0 = tanpa batas)">
            <input type="number" min="0" className="input" value={cfg.batasJam}
              onChange={(e) => setCfg((c) => ({ ...c, batasJam: Number(e.target.value) }))} />
            <p className="mt-1 text-xs text-gray-400">
              Kalau batasnya tercapai, pesan berikutnya <b>ditahan</b> sampai jendela satu jam bergeser — tidak dibuang.
            </p>
          </Field>
        </div>
        <button onClick={simpan} disabled={saving} className="btn-primary mt-2">{saving ? "..." : "Simpan"}</button>
      </Section>
    </div>
  );
}

// ── Saluran — post ke channel ─────────────────────────────────────────────────
function PanelSaluran() {
  const { data, loading, refetch } = useApi("newsletters");
  const [selectedJid, setSelectedJid] = useState("");
  const [postMsg, setPostMsg] = useState("");
  const [postFile, setPostFile] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const newsletters = data?.newsletters || [];

  async function post(e) {
    e.preventDefault(); setBusy(true); setResult(null);
    try {
      let url = null;
      if (postFile) {
        const fd = new FormData(); fd.append("file", postFile);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const ud = await up.json();
        if (!up.ok) throw new Error(ud.error || "Upload gagal");
        url = ud.url;
      }
      const r = await apiPost("channel/send", { jid: selectedJid, message: postMsg, url });
      setResult(r.ok || r.status ? { ok: true, text: "Post berhasil dikirim ke saluran!" } : { ok: false, text: r.error || "Gagal" });
      if (r.ok || r.status) { setPostMsg(""); setPostFile(null); }
    } catch (e) { setResult({ ok: false, text: e.message }); }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <Alert ok={result?.ok} msg={result?.text} />
      <Section title="Post ke Saluran (Channel)">
        {loading && <p className="text-sm text-gray-400">Memuat saluran...</p>}
        <Field label="Pilih Saluran">
          <select className="input" value={selectedJid} onChange={e => setSelectedJid(e.target.value)} required>
            <option value="">— Pilih saluran —</option>
            {newsletters.map(n => <option key={n.jid} value={n.jid}>{n.name}</option>)}
          </select>
        </Field>
        {newsletters.length === 0 && !loading && <p className="text-xs text-gray-400">Belum ada saluran. Tambahkan dulu di tab Saluran.</p>}
        <form onSubmit={post} className="space-y-3">
          <Field label="Isi Post"><textarea className="input min-h-[80px]" value={postMsg} onChange={e => setPostMsg(e.target.value)} /></Field>
          <Field label="Gambar / Video (opsional)">
            <input type="file" accept="image/*,video/*" className="input text-sm py-1.5" onChange={e => setPostFile(e.target.files[0])} />
          </Field>
          <button type="submit" disabled={busy || !selectedJid} className="btn-primary">{busy ? "..." : "Kirim ke Saluran"}</button>
        </form>
        <button onClick={refetch} className="btn-outline text-xs">Refresh Daftar Saluran</button>
      </Section>
    </div>
  );
}

// ── Main TabAksi ─────────────────────────────────────────────────────────────
const PANELS = {
  koneksi:    PanelKoneksi,
  pesan:      PanelPesan,
  media:      PanelMedia,
  interaktif: PanelInteraktif,
  grup:       null, // redirect notice
  komunitas:  PanelKomunitas,
  saluran:    PanelSaluran,
  akun:       PanelAkun,
  panggilan:  PanelPanggilan,
  forensik:   PanelForensik,
  protokol:   PanelProtokol,
  antiban:    PanelAntiBan,
};

export function TabAksi() {
  const [sub, setSub] = useState("koneksi");

  const Panel = PANELS[sub];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold dark:text-white">Panel Aksi</h2>
        <p className="text-sm text-gray-400 mt-0.5">Gunakan semua kapabilitas WA Bot dari satu tempat.</p>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-1 border-b dark:border-slate-700 pb-2 min-w-max">
          {SUB_TABS.map(t => (
            <button key={t.id} onClick={() => setSub(t.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${sub === t.id ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {sub === "grup" ? (
        <div className="card p-6 text-center space-y-3">
          <p className="text-4xl">Grup</p>
          <p className="font-semibold dark:text-white">Manajemen Grup</p>
          <p className="text-sm text-gray-400">Fitur grup sudah tersedia di tab Grup dengan tampilan lebih lengkap.</p>
          <p className="text-xs text-gray-400">Gunakan tombol tab di atas (bukan panel ini) - pilih "Grup"</p>
        </div>
      ) : Panel ? (
        <Panel />
      ) : null}
    </div>
  );
}
