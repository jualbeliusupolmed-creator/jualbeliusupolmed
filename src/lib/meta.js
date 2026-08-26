/**
 * Klien server-only untuk Meta Graph API.
 * Token dikirim melalui Authorization header agar tidak masuk URL/log.
 */

const DEFAULT_META_API_VERSION = "v24.0";
const TERMINAL_CONTAINER_ERRORS = new Set(["ERROR", "EXPIRED"]);

function metaApiVersion() {
  const configured = String(process.env.META_GRAPH_API_VERSION || "").trim();
  return /^v\d+\.\d+$/.test(configured)
    ? configured
    : DEFAULT_META_API_VERSION;
}
function metaUrl(pathname) {
  return `https://graph.facebook.com/${metaApiVersion()}/${String(pathname).replace(/^\//, "")}`;
}

function safeMetaMessage(data, fallback) {
  const message = String(data?.error?.message || fallback || "Permintaan Meta gagal")
    .replace(/[\r\n]+/g, " ")
    .slice(0, 240);
  const code = data?.error?.code ? ` [${data.error.code}]` : "";
  return `${message}${code}`;
}

async function graphRequest(pathname, {
  token,
  method = "GET",
  body,
  stage = "Meta API",
} = {}) {
  if (!token) throw new Error(`${stage}: token belum dikonfigurasi.`);

  const options = {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  };
  if (body) {
    options.headers["Content-Type"] = "application/x-www-form-urlencoded";
    options.body = new URLSearchParams(body).toString();
  }
  if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) {
    options.signal = AbortSignal.timeout(20_000);
  }

  let response;
  try {
    response = await fetch(metaUrl(pathname), options);
  } catch (error) {
    const reason = error?.name === "TimeoutError" ? "waktu tunggu habis" : "koneksi gagal";
    throw new Error(`${stage}: ${reason}.`);
  }

  const raw = await response.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }

  if (!response.ok || data?.error) {
    throw new Error(`${stage}: ${safeMetaMessage(data, `HTTP ${response.status}`)}`);
  }
  return data;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForInstagramContainer(
  creationId,
  token,
  { maxPolls = 12, pollIntervalMs = 1_000 } = {},
) {
  for (let poll = 0; poll < maxPolls; poll += 1) {
    const data = await graphRequest(`${creationId}?fields=status_code`, {
      token,
      stage: "Pemeriksaan media Instagram",
    });
    const status = String(data.status_code || "IN_PROGRESS").toUpperCase();

    if (status === "FINISHED" || status === "PUBLISHED") return status;
    if (TERMINAL_CONTAINER_ERRORS.has(status)) {
      throw new Error(`Pemeriksaan media Instagram: container berstatus ${status}.`);
    }
    if (poll < maxPolls - 1) await delay(pollIntervalMs);
  }
  throw new Error("Pemeriksaan media Instagram: media belum siap dalam batas waktu.");
}

// Catatan (26 Agustus 2026): `postToFacebook()` dulu ada di sini — lengkap dan
// berfungsi — tapi tidak pernah dipanggil dari mana pun. Sementara antarmuka
// menjanjikan sebaliknya: tombolnya berbunyi "upload ke Meta (IG & FB)" dan
// panel punya kartu "Konfigurasi Meta (Instagram & Facebook)". Facebook tidak
// pernah menerima apa pun.
//
// Yang dibereskan di sini adalah janjinya, bukan fungsinya: teks antarmuka
// sekarang menyebut Instagram saja. Kalau publikasi Facebook memang diinginkan,
// yang dibutuhkan cuma Page ID + token halaman, lalu panggil graphRequest ke
// `<pageId>/photos` — persis pola postToInstagram di bawah.

/**
 * Membuat container gambar, menunggu FINISHED, lalu menerbitkannya.
 * creationId dapat dipakai ulang setelah proses terputus agar retry tidak
 * membuat post duplikat.
 */
export async function postToInstagram(
  igUserId,
  token,
  imageUrl,
  caption,
  {
    creationId: existingCreationId = null,
    onContainerCreated,
    maxPolls,
    pollIntervalMs,
  } = {},
) {
  if (!igUserId || !token) {
    throw new Error("Konfigurasi akun Instagram belum lengkap.");
  }
  if (!imageUrl || !/^https:\/\//i.test(imageUrl)) {
    throw new Error("URL gambar Instagram harus berupa HTTPS publik.");
  }

  let creationId = existingCreationId;
  if (!creationId) {
    const created = await graphRequest(`${igUserId}/media`, {
      token,
      method: "POST",
      stage: "Pembuatan media Instagram",
      body: { image_url: imageUrl, caption },
    });
    creationId = created.id;
    if (!creationId) {
      throw new Error("Pembuatan media Instagram: creation_id tidak diterima.");
    }
    if (onContainerCreated) await onContainerCreated(creationId);
  }

  const containerStatus = await waitForInstagramContainer(creationId, token, {
    maxPolls,
    pollIntervalMs,
  });
  if (containerStatus === "PUBLISHED") {
    return { id: null, creation_id: creationId, already_published: true };
  }

  try {
    const published = await graphRequest(`${igUserId}/media_publish`, {
      token,
      method: "POST",
      stage: "Publikasi Instagram",
      body: { creation_id: creationId },
    });
    return { ...published, creation_id: creationId };
  } catch (error) {
    // Jika respons publish terputus tetapi Meta sebenarnya sudah menerima,
    // status PUBLISHED mencegah retry membuat post baru.
    const status = await waitForInstagramContainer(creationId, token, {
      maxPolls: 2,
      pollIntervalMs: 250,
    }).catch(() => null);
    if (status === "PUBLISHED") {
      return { id: null, creation_id: creationId, already_published: true };
    }
    throw error;
  }
}
