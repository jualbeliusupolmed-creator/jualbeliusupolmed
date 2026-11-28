import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const supabaseEnvNames = [
  'NEXT_PUBLIC_LINUSKU_SUPABASE_URL',
  'NEXT_PUBLIC_LINUSKU_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_LINUSKU_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'LINUSKU_SUPABASE_SECRET_KEY',
  'LINUSKU_SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

describe('LINUSKU Supabase environment resolution', () => {
  beforeEach(() => {
    vi.resetModules();
    for (const name of supabaseEnvNames) vi.stubEnv(name, '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses KampusKita public Supabase variables when LINUSKU variables are absent', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://kampuskita.example');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'public-test-key');

    const { isSupabaseConfigured } = await import('./linuskuSupabase');

    expect(isSupabaseConfigured).toBe(true);
  });

  it('prefers LINUSKU-specific public variables over shared variables', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_LINUSKU_SUPABASE_URL', 'https://linusku.example');
    vi.stubEnv(
      'NEXT_PUBLIC_LINUSKU_SUPABASE_PUBLISHABLE_KEY',
      'linusku-public-test-key'
    );

    const { isSupabaseConfigured } = await import('./linuskuSupabase');

    expect(isSupabaseConfigured).toBe(true);
  });

  it('uses the shared server key when no LINUSKU-specific key is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://kampuskita.example');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server-test-key');

    const { isSupabaseAdminConfigured } = await import(
      './linuskuSupabaseServer'
    );

    expect(isSupabaseAdminConfigured).toBe(true);
  });
});
