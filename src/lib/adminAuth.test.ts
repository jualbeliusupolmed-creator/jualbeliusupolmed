import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAdminAllowlist, isAdminEmailAllowed } from './adminAllowlist';

describe('admin email allowlist', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows only the two configured admin accounts', () => {
    expect(getAdminAllowlist()).toEqual([
      'kampuskitaapp@gmail.com',
      'jualbeliusupolmed@gmail.com',
    ]);
    expect(isAdminEmailAllowed('Jualbeliusupolmed@gmail.com')).toBe(true);
    expect(isAdminEmailAllowed('someone@example.com')).toBe(false);
  });

  it('does not let environment variables replace the two admin accounts', () => {
    vi.stubEnv('ADMIN_EMAILS', 'Admin@Example.com');
    vi.stubEnv('LINUSKU_ADMIN_EMAILS', 'Admin@Example.com');

    expect(getAdminAllowlist()).toEqual([
      'kampuskitaapp@gmail.com',
      'jualbeliusupolmed@gmail.com',
    ]);
  });
});
