import { canonicalizeUrlOrigin } from "./admin-google-oauth";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function findOrInviteOwner(admin, emailInput, displayName, configuredOrigin) {
  const value = String(emailInput || "").trim();
  if (UUID.test(value)) {
    const { data, error } = await admin.auth.admin.getUserById(value);
    if (error || !data?.user) throw new Error("Akun Auth dengan ID itu tidak ditemukan.");
    if (data.user.banned_until && new Date(data.user.banned_until) > new Date()) throw new Error("Akun ini sedang dibatasi dan tidak dapat diberi akses.");
    return { user: data.user, invitationSent: false };
  }
  const email = value.toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) throw new Error("Masukkan alamat email yang valid.");

  let searchComplete = false;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("Daftar akun Auth gagal diperiksa.");
    const user = data?.users?.find((item) => String(item.email || "").toLowerCase() === email);
    if (user) {
      if (user.banned_until && new Date(user.banned_until) > new Date()) throw new Error("Akun ini sedang dibatasi dan tidak dapat diberi akses.");
      return { user, invitationSent: false };
    }
    if (!data?.users || data.users.length < 1000) {
      searchComplete = true;
      break;
    }
  }
  if (!searchComplete) throw new Error("Pencarian akun melewati batas aman. Periksa email ini di Supabase Auth sebelum mengundangnya.");

  const origin = canonicalizeUrlOrigin(configuredOrigin);
  if (!origin || !/^https?:\/\//.test(origin)) throw new Error("Alamat situs undangan belum dikonfigurasi dengan benar.");
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { display_name: displayName },
    redirectTo: `${origin}/auth/callback?admin_invite=1&next=%2Fadmin%2Foverview`,
  });
  if (error || !data?.user) throw new Error("Undangan Supabase Auth gagal dikirim. Periksa konfigurasi email, lalu coba lagi.");
  return { user: data.user, invitationSent: true };
}
