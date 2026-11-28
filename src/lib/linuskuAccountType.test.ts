import { describe, expect, it } from 'vitest';
import { getLinuskuAccountType } from './linuskuAccountType';

describe('LINUSKU account type', () => {
  it('uses the admin-managed app metadata for driver accounts', () => {
    expect(getLinuskuAccountType({ linusku_account_type: 'driver' }, null)).toBe(
      'driver'
    );
    expect(getLinuskuAccountType({}, null)).toBe('user');
  });

  it('keeps already assigned legacy drivers in the driver list', () => {
    expect(getLinuskuAccountType({}, 'LINUS-01')).toBe('driver');
  });
});
