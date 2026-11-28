import type { User } from '@supabase/supabase-js';
import type { AdminClient } from '@/lib/adminAuth';

const PAGE_SIZE = 1000;
const MAX_PAGES = 100;

export async function listAllAdminUsers(
  client: AdminClient
): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });
    if (error) {
      throw new Error(`Daftar akun belum dapat dimuat: ${error.message}`);
    }
    const pageUsers = data?.users ?? [];
    users.push(...pageUsers);
    if (pageUsers.length < PAGE_SIZE) {
      break;
    }
  }
  return users;
}
