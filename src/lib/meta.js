/**
 * Utilities for Meta Graph API (Instagram & Facebook Auto-Posting)
 */

const META_API_VERSION = "v19.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * Mem-posting gambar dan caption ke Facebook Page
 * @param {string} pageId FB Page ID
 * @param {string} token Page Access Token
 * @param {string} imageUrl URL gambar publik
 * @param {string} caption Caption postingan
 * @returns {object} Response dari FB (misal { id: "post_id" })
 */
export async function postToFacebook(pageId, token, imageUrl, caption) {
  if (!pageId || !token) throw new Error("FB_PAGE_ID atau Token Meta tidak ditemukan di pengaturan.");

  const url = `${META_BASE_URL}/${pageId}/photos`;
  const body = new URLSearchParams({
    url: imageUrl,
    message: caption,
    access_token: token,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`Facebook API Error: ${data.error.message}`);
  }

  return data;
}

/**
 * Mem-posting gambar dan caption ke Instagram (Via IG User ID)
 * Melibatkan 2 tahap: 1) Create Media Container, 2) Publish Media
 * @param {string} igUserId IG User ID (terhubung ke FB Page)
 * @param {string} token Page Access Token
 * @param {string} imageUrl URL gambar publik
 * @param {string} caption Caption postingan
 * @returns {object} Response dari IG (misal { id: "media_id" })
 */
export async function postToInstagram(igUserId, token, imageUrl, caption) {
  if (!igUserId || !token) throw new Error("IG_USER_ID atau Token Meta tidak ditemukan di pengaturan.");

  // TAHAP 1: Create Media Container
  const createUrl = `${META_BASE_URL}/${igUserId}/media`;
  const createBody = new URLSearchParams({
    image_url: imageUrl,
    caption: caption,
    access_token: token,
  });

  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: createBody.toString(),
  });

  const createData = await createRes.json();
  if (createData.error) {
    throw new Error(`Instagram Create Error: ${createData.error.message}`);
  }

  const creationId = createData.id;
  if (!creationId) {
    throw new Error("Gagal mendapatkan creation_id dari Instagram API.");
  }

  // TAHAP 2: Publish Media Container
  const publishUrl = `${META_BASE_URL}/${igUserId}/media_publish`;
  const publishBody = new URLSearchParams({
    creation_id: creationId,
    access_token: token,
  });

  const publishRes = await fetch(publishUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: publishBody.toString(),
  });

  const publishData = await publishRes.json();
  if (publishData.error) {
    throw new Error(`Instagram Publish Error: ${publishData.error.message}`);
  }

  return publishData;
}
